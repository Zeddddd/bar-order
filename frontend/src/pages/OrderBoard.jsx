import { useState, useEffect, useCallback } from "react";
import { api } from "../api";

const COLUMNS = [
  { key: "pending", label: "待制作", cls: "status-pending" },
  { key: "in_progress", label: "制作中", cls: "status-in-progress" },
  { key: "done", label: "已完成", cls: "status-done" },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OrderBoard() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState(null);
  const [exportDate, setExportDate] = useState(todayStr());

  const load = useCallback(async () => {
    const data = await api.getOrders({ table: search || undefined });
    setOrders(data);
    const s = await api.getStats();
    setStats(s);
  }, [search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const moveOrder = async (orderId, newStatus) => {
    await api.updateOrderStatus(orderId, newStatus);
    load();
  };

  const getOrdersByStatus = (status) =>
    orders.filter((o) => o.status === status);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div>
      <div className="toolbar flex-between">
        <div className="flex-row">
          <input className="input" placeholder="搜索桌号..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
          <input type="date" className="input" style={{ maxWidth: 150 }}
            value={exportDate} onChange={(e) => setExportDate(e.target.value)} />
          <a href={api.getExportUrl({ date: exportDate || undefined })}
            className="btn btn-primary btn-sm" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
            ↓ 导出Excel
          </a>
          <button className="btn btn-sm btn-danger"
            onClick={async () => {
              if (!confirm("确定清除所有订单吗？\n\n此操作会恢复酒款库存，但不可撤销。")) return;
              try {
                await api.resetData("orders");
                alert("已清除所有订单，库存已恢复");
                load();
              } catch (e) { alert("清除失败: " + e.message); }
            }}>
            清空订单
          </button>
        </div>
        {stats && (
          <div className="flex-row" style={{ fontSize: 13, color: "var(--text-dim)" }}>
            <span>今日订单: <b style={{ color: "var(--text)" }}>{stats.today_orders}</b></span>
            <span>|</span>
            <span>今日营收: <b style={{ color: "var(--accent)" }}>¥{stats.today_revenue.toFixed(2)}</b></span>
          </div>
        )}
      </div>

      <div className="board">
        {COLUMNS.map((col) => (
          <div key={col.key} className="board-col">
            <div className="board-col-header">
              <span>{col.label}</span>
              <span className={`status-badge ${col.cls}`}>
                {getOrdersByStatus(col.key).length}
              </span>
            </div>
            <div className="board-col-body">
              {getOrdersByStatus(col.key).map((order) => (
                <div key={order.id} className="order-card"
                  onClick={() => {
                    const next = col.key === "pending" ? "in_progress"
                      : col.key === "in_progress" ? "done" : null;
                    if (next) moveOrder(order.id, next);
                  }}
                  title={col.key !== "done" ? "点击切换下一状态" : ""}
                >
                  <div className="flex-between">
                    <div>
                      <span className="table-badge">{order.table_number}</span>
                      <span className="time">{formatTime(order.created_at)}</span>
                    </div>
                    {order.note && (
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{order.note}</span>
                    )}
                  </div>
                  {order.items?.map((it, i) => (
                    <div key={i} className="item-line">
                      {it.drink_name} ×{it.quantity}
                    </div>
                  ))}
                  <div className="order-total">¥{order.total_price.toFixed(2)}</div>

                  {/* Bottom action buttons */}
                  <div style={{ marginTop: 8, display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    {col.key === "pending" && (
                      <>
                        <button className="btn btn-sm btn-info"
                          onClick={(e) => { e.stopPropagation(); moveOrder(order.id, "in_progress"); }}>
                          开始制作
                        </button>
                        <button className="btn btn-sm btn-danger"
                          onClick={(e) => { e.stopPropagation(); moveOrder(order.id, "cancelled"); }}>
                          取消
                        </button>
                      </>
                    )}
                    {col.key === "in_progress" && (
                      <button className="btn btn-sm btn-success"
                        onClick={(e) => { e.stopPropagation(); moveOrder(order.id, "done"); }}>
                        完成
                      </button>
                    )}
                    {col.key === "done" && (
                      <span style={{ fontSize: 11, color: "var(--success)" }}>✓ 已完成</span>
                    )}
                  </div>
                </div>
              ))}
              {getOrdersByStatus(col.key).length === 0 && (
                <div className="empty">暂无订单</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
