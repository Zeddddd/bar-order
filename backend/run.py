"""
One-click launcher for Bar Order System.
Starts uvicorn and opens the browser.
"""
import os
import sys
import time
import threading
import webbrowser

import uvicorn
import main  # ensure PyInstaller bundles all dependencies


def open_browser(url, delay=1.5):
    time.sleep(delay)
    webbrowser.open(url)


if __name__ == "__main__":
    host = "0.0.0.0"
    port = int(os.environ.get("PORT", 8000))
    url = f"http://localhost:{port}"

    # Open browser after server starts
    threading.Thread(target=open_browser, args=(url,), daemon=True).start()

    print(f"  Bar Order System 启动中...")
    print(f"  地址: {url}")
    print(f"  按 Ctrl+C 停止服务")
    print()

    uvicorn.run("main:app", host=host, port=port, log_level="info")
