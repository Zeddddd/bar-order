"""
酒吧点单系统 - 服务管理器 (GUI)
双击此文件启动管理面板。
所有后台任务通过队列与 UI 通信，避免 tkinter 线程安全问题。
"""
import os
import queue
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
PID_FILE = BACKEND_DIR / "server.pid"
PORT = 8000
HEALTH_URL = f"http://localhost:{PORT}/api/health"
APP_URL = f"http://localhost:{PORT}"

PYTHON = os.environ.get("PYTHON_EXE", sys.executable)

server_process = None
msg_queue = queue.Queue()  # thread-safe communication to GUI


# ── non-GUI helpers (safe to call from any thread) ──

def is_alive():
    try:
        urllib.request.urlopen(HEALTH_URL, timeout=0.8)
        return True
    except Exception:
        return False


def save_pid(pid):
    try:
        PID_FILE.write_text(str(pid))
    except OSError:
        pass


def load_saved_pid():
    try:
        return int(PID_FILE.read_text().strip())
    except Exception:
        return None


def delete_pid_file():
    try:
        PID_FILE.unlink()
    except OSError:
        pass


def port_in_use(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.3)
    try:
        s.bind(("127.0.0.1", port))
        return False
    except OSError:
        return True
    finally:
        s.close()


def kill_pid(pid):
    """Kill process tree by PID. Returns True if successful."""
    try:
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(pid)],
            capture_output=True, timeout=8
        )
        return True
    except Exception:
        return False


def kill_by_port(port):
    """
    Find and kill ALL processes holding the port.
    Uses netstat to find PIDs, then taskkill /F /T for each.
    """
    try:
        r = subprocess.run(
            ["netstat", "-ano"], capture_output=True, text=True, timeout=5
        )
        pids = set()
        for line in r.stdout.splitlines():
            if f":{port}" in line and "LISTENING" in line:
                parts = line.strip().split()
                pid = parts[-1]
                if pid.isdigit():
                    pids.add(pid)
        for pid in pids:
            msg_queue.put(("log", f"  终止端口占用进程 PID: {pid}"))
            kill_pid(pid)
        return len(pids) > 0
    except Exception:
        return False


def wait_port_free(port, max_wait=8):
    """Block until port is free, polling every 0.3s. Returns True if freed."""
    deadline = time.time() + max_wait
    while time.time() < deadline:
        if not port_in_use(port):
            return True
        time.sleep(0.3)
    return False


def build_frontend():
    if (FRONTEND_DIR / "dist" / "index.html").exists():
        return True
    msg_queue.put(("log", "正在安装前端依赖..."))
    r = subprocess.run(["npm", "install"], cwd=FRONTEND_DIR,
                       capture_output=True, text=True)
    if r.returncode != 0:
        msg_queue.put(("log", f"npm install 失败"))
        return False
    msg_queue.put(("log", "正在构建前端..."))
    r = subprocess.run(["npm", "run", "build"], cwd=FRONTEND_DIR,
                       capture_output=True, text=True)
    if r.returncode != 0:
        msg_queue.put(("log", f"构建失败"))
        return False
    msg_queue.put(("log", "前端构建完成"))
    return True


# ── start / stop (called from background thread) ──

def do_start():
    global server_process

    if is_alive():
        msg_queue.put(("log", "服务已在运行中"))
        msg_queue.put(("start_done", True))
        return

    # Clean up leftovers
    saved = load_saved_pid()
    if saved:
        msg_queue.put(("log", f"清理残留 PID {saved} ..."))
        kill_pid(saved)
        delete_pid_file()
        time.sleep(0.3)

    if not wait_port_free(PORT, 4):
        msg_queue.put(("log", "端口被占用，强制释放..."))
        kill_by_port(PORT)
        time.sleep(0.5)
        if not wait_port_free(PORT, 4):
            msg_queue.put(("log", "端口仍被占用，启动失败"))
            msg_queue.put(("start_done", False))
            return

    if not build_frontend():
        msg_queue.put(("start_done", False))
        return

    msg_queue.put(("log", "正在启动服务..."))
    try:
        flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        server_process = subprocess.Popen(
            [PYTHON, "-m", "uvicorn", "main:app",
             "--host", "0.0.0.0", f"--port", str(PORT)],
            cwd=str(BACKEND_DIR),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=flags,
        )
        save_pid(server_process.pid)
    except Exception as e:
        msg_queue.put(("log", f"启动失败: {e}"))
        msg_queue.put(("start_done", False))
        return

    for _ in range(20):
        time.sleep(0.5)
        if is_alive():
            msg_queue.put(("log", f"服务启动成功 → {APP_URL}"))
            msg_queue.put(("start_done", True))
            msg_queue.put(("status_changed", True))  # immediate, don't wait for bg poll
            msg_queue.put(("open_browser", None))
            return

    msg_queue.put(("log", "服务启动超时"))
    msg_queue.put(("start_done", False))


def do_stop():
    global server_process

    if not is_alive():
        msg_queue.put(("log", "服务未在运行"))
        msg_queue.put(("stop_done", True))
        return

    msg_queue.put(("log", "正在停止服务..."))

    # 1) Graceful terminate of our subprocess
    if server_process and server_process.poll() is None:
        server_process.terminate()
        try:
            server_process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            pass

    # 2) Kill by saved PID
    saved = load_saved_pid()
    if saved:
        kill_pid(saved)
        delete_pid_file()

    # 3) Force-kill all port occupants
    time.sleep(0.3)
    kill_by_port(PORT)

    # 4) Wait and retry if needed
    if not wait_port_free(PORT, 5):
        msg_queue.put(("log", "端口未释放，再次强制清理..."))
        kill_by_port(PORT)
        time.sleep(1)

    server_process = None

    # Verify final state
    time.sleep(0.5)
    alive = is_alive()
    in_use = port_in_use(PORT)

    if not alive and not in_use:
        delete_pid_file()
        msg_queue.put(("log", "服务已停止，端口和文件锁已释放"))
        msg_queue.put(("status_changed", False))
        msg_queue.put(("stop_done", True))
    else:
        status = []
        if alive: status.append("API 仍可访问")
        if in_use: status.append("端口仍被占用")
        msg_queue.put(("log", f"警告：停止可能不完整 ({', '.join(status)})，请运行 stop.bat"))
        msg_queue.put(("status_changed", is_alive()))
        msg_queue.put(("stop_done", False))


# ── GUI (all widget access from main thread only) ──

def build_gui():
    import tkinter as tk
    from tkinter import ttk

    root = tk.Tk()
    root.title("酒吧点单系统 - 服务管理")
    root.geometry("360x460")
    root.resizable(False, False)
    root.configure(bg="#1a1a1a")

    style = ttk.Style()
    style.theme_use("clam")
    style.configure("TFrame", background="#1a1a1a")
    style.configure("TLabel", background="#1a1a1a", foreground="#e0e0e0",
                    font=("Microsoft YaHei", 10))
    style.configure("Title.TLabel", font=("Microsoft YaHei", 16, "bold"),
                    foreground="#d4a853")
    style.configure("Status.TLabel", font=("Microsoft YaHei", 12))

    # ── Header ──
    header = ttk.Frame(root)
    header.pack(pady=(24, 4))
    ttk.Label(header, text="酒吧点单系统", style="Title.TLabel").pack()
    ttk.Label(root, text="服务管理器", font=("Microsoft YaHei", 9),
              foreground="#888", background="#1a1a1a").pack()

    # ── Status ──
    status_frame = ttk.Frame(root)
    status_frame.pack(pady=(20, 8))

    canvas = tk.Canvas(status_frame, width=16, height=16, bg="#1a1a1a",
                       highlightthickness=0)
    canvas.pack(side="left", padx=(0, 8))
    dot = canvas.create_oval(2, 2, 14, 14, fill="#555", outline="")

    status_var = tk.StringVar(value="检测中...")
    status_label = ttk.Label(status_frame, textvariable=status_var,
                             style="Status.TLabel")
    status_label.pack(side="left")

    # ── Buttons ──
    btn_frame = ttk.Frame(root)
    btn_frame.pack(pady=16)

    def make_btn(text, bg, fg, abg, cmd):
        return tk.Button(btn_frame, text=text, font=("Microsoft YaHei", 11),
                         bg=bg, fg=fg, activebackground=abg,
                         relief="flat", padx=20, pady=8, cursor="hand2",
                         command=cmd)

    btn_start = make_btn("▶  启动服务", "#d4a853", "#1a1a1a", "#c49a43", None)
    btn_start.pack(pady=4)

    btn_stop = make_btn("⏹  停止服务", "#c05555", "#fff", "#d06666", None)
    btn_stop.pack(pady=4)

    btn_open = make_btn("🔗  打开系统", "#2a2a2a", "#e0e0e0", "#3a3a3a",
                        lambda: webbrowser.open(APP_URL))
    btn_open.pack(pady=4)

    # ── Log ──
    log_frame = ttk.Frame(root)
    log_frame.pack(fill="both", expand=True, padx=20, pady=(8, 16))

    log_text = tk.Text(log_frame, height=8, bg="#0f0f0f", fg="#aaa",
                       font=("Consolas", 9), relief="flat", padx=8, pady=8,
                       wrap="word", state="disabled")
    log_text.pack(fill="both", expand=True)

    # ── Cached status (written by bg thread, read by main thread — never blocks) ──
    _cached_alive = None  # None = initial, True/False from is_alive()

    def _bg_status_loop():
        """Runs in a daemon thread. Periodically checks server health,
        pushes status changes to the queue. Never touches tkinter."""
        while True:
            alive = is_alive()
            if alive != _cached_alive:
                _cached_alive = alive  # atomic assignment in Python
                msg_queue.put(("status_changed", alive))
            time.sleep(2)

    # ── Main-thread-only UI helpers ──

    def gui_log(msg):
        """Safe to call from any thread via msg_queue."""
        msg_queue.put(("log", msg))

    def _flush_log(msg):
        """Called ONLY from main thread via poll loop."""
        log_text.configure(state="normal")
        log_text.insert("end", f"[{time.strftime('%H:%M:%S')}] {msg}\n")
        log_text.see("end")
        log_text.configure(state="disabled")

    def _apply_status(alive):
        """Called ONLY from main thread. Uses cached value, no I/O."""
        if alive:
            canvas.itemconfig(dot, fill="#4caf84")
            status_var.set("●  服务运行中")
            status_label.configure(foreground="#4caf84")
        else:
            canvas.itemconfig(dot, fill="#e05555")
            status_var.set("●  服务已停止")
            status_label.configure(foreground="#e05555")

    def _refresh_status():
        """Called ONLY from main thread. Reads cached value — 0 I/O, no blocking."""
        _apply_status(_cached_alive)

    def _set_buttons(enabled):
        if enabled:
            btn_start.configure(state="normal", text="▶  启动服务")
            btn_stop.configure(state="normal", text="⏹  停止服务")
        else:
            btn_start.configure(state="disabled")
            btn_stop.configure(state="disabled")

    def _on_start_click():
        """Run START in background thread. Buttons disabled from main thread first."""
        btn_start.configure(state="disabled", text="⏳ 启动中...")
        btn_stop.configure(state="disabled")
        import threading
        threading.Thread(target=do_start, daemon=True).start()

    def _on_stop_click():
        btn_stop.configure(state="disabled", text="⏳ 停止中...")
        btn_start.configure(state="disabled")
        import threading
        threading.Thread(target=do_stop, daemon=True).start()

    btn_start.configure(command=_on_start_click)
    btn_stop.configure(command=_on_stop_click)

    # ── Message queue poll loop (main thread, runs every 100ms) ──

    def poll_queue():
        """Drain the message queue. All widget updates happen here. 0 blocking I/O."""
        try:
            while True:
                msg = msg_queue.get_nowait()
                kind, payload = msg[0], msg[1]

                if kind == "log":
                    _flush_log(payload)

                elif kind == "status_changed":
                    _apply_status(payload)

                elif kind == "start_done":
                    _set_buttons(True)
                    _apply_status(_cached_alive)

                elif kind == "stop_done":
                    _set_buttons(True)
                    _apply_status(_cached_alive)

                elif kind == "open_browser":
                    webbrowser.open(APP_URL)

        except queue.Empty:
            pass

        root.after(250, poll_queue)

    # ── Startup ──
    gui_log("正在检测服务状态...")
    import threading
    threading.Thread(target=_bg_status_loop, daemon=True).start()
    # Give the bg thread a moment, then check
    def _initial_check():
        if _cached_alive is None:
            root.after(300, _initial_check)  # wait a bit more
        elif _cached_alive:
            _apply_status(True)
            gui_log(f"服务已在运行 → {APP_URL}")
        else:
            _apply_status(False)
            gui_log("服务未启动，点击「启动服务」开始")
    root.after(100, _initial_check)

    # ── Clean shutdown ──
    def on_close():
        root.destroy()
    root.protocol("WM_DELETE_WINDOW", on_close)

    poll_queue()
    root.mainloop()


if __name__ == "__main__":
    build_gui()
