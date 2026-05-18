import { useState, useEffect, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { api } from "../api";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler
);

const CHART_COLORS = [
  "#d4a853", "#5b9bd5", "#4caf84", "#e05555", "#9b7ed8",
  "#f0a050", "#50c0c0", "#e07090", "#80a860", "#6090c0",
];
function chartBg(alpha = 0.15) {
  return CHART_COLORS.map(c => c.slice(0, -1) + ", " + alpha + ")");
}

const PERIODS = [
  { label: "7天", days: 7 },
  { label: "30天", days: 30 },
  { label: "90天", days: 90 },
];

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.getDashboard(days);
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div className="empty">加载中...</div>;
  if (!data) return <div className="empty">暂无数据</div>;

  const fmt = (n) => `¥${n.toFixed(2)}`;

  return (
    <div>
      {/* Period selector */}
      <div className="toolbar flex-between">
        <div className="flex-row">
          {PERIODS.map(p => (
            <button key={p.days}
              className={`btn btn-sm ${days === p.days ? "btn-primary" : "btn-outline"}`}
              onClick={() => setDays(p.days)}>
              {p.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
          {data.daily_trend[0]?.date} ~ {data.daily_trend[data.daily_trend.length - 1]?.date}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid-cards" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
        <SummaryCard label="总营收" value={fmt(data.total_revenue)} color="var(--accent)" />
        <SummaryCard label="总订单" value={data.total_orders} color="var(--info)" />
        <SummaryCard label="均单金额" value={fmt(data.avg_order_value)} color="var(--success)" />
        <SummaryCard label="热销第一" value={data.top_drinks[0]?.name?.slice(0, 10) || "-"} color="#fff" small />
      </div>

      {/* Charts grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Revenue trend */}
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 15 }}>营收趋势</h3>
          <div style={{ height: 280, position: "relative" }}>
          <Line data={{
            labels: data.daily_trend.map(d => d.date.slice(5)),
            datasets: [{
              label: "营收 (¥)",
              data: data.daily_trend.map(d => d.revenue),
              borderColor: CHART_COLORS[0],
              backgroundColor: chartBg(0.15)[0],
              fill: true,
              tension: 0.3,
              pointRadius: 2,
              pointHoverRadius: 5,
            }],
          }} options={lineOptions} />
          </div>
        </div>

        {/* Category breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 15 }}>分类占比</h3>
          <div style={{ height: 280, position: "relative" }}>
          {data.category_breakdown.length > 0 ? (
            <Doughnut data={{
              labels: data.category_breakdown.map(c => c.category_name),
              datasets: [{
                data: data.category_breakdown.map(c => c.revenue),
                backgroundColor: CHART_COLORS.slice(0, data.category_breakdown.length),
                borderWidth: 0,
              }],
            }} options={doughnutOptions} />
          ) : <div className="empty">暂无</div>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Top drinks */}
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 15 }}>热销排行 (按销量)</h3>
          <div style={{ height: 320, position: "relative" }}>
          {data.top_drinks.length > 0 ? (
            <Bar data={{
              labels: data.top_drinks.map(d => d.name.length > 10 ? d.name.slice(0, 10) + "..." : d.name),
              datasets: [{
                label: "销量 (杯)",
                data: data.top_drinks.map(d => d.quantity),
                backgroundColor: data.top_drinks.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                borderRadius: 4,
              }],
            }} options={barOptions} />
          ) : <div className="empty">暂无</div>}
          </div>
        </div>

        {/* Hourly heatmap */}
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 15 }}>时段分布</h3>
          <div style={{ height: 280, position: "relative" }}>
          <Bar data={{
            labels: data.hourly_distribution.map(h => `${h.hour}:00`),
            datasets: [{
              label: "订单数",
              data: data.hourly_distribution.map(h => h.orders),
              backgroundColor: data.hourly_distribution.map(h => {
                const ratio = data.hourly_distribution.length > 0
                  ? h.orders / Math.max(...data.hourly_distribution.map(x => x.orders), 1)
                  : 0;
                return ratio > 0.7 ? "#d4a853" : ratio > 0.3 ? "#5b9bd5" : "rgba(255,255,255,0.1)";
              }),
              borderRadius: 2,
            }],
          }} options={hourlyOptions} />
          </div>
        </div>
      </div>

      {/* Top drinks detail table */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12, fontSize: 15 }}>热销明细</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "var(--text-dim)", textAlign: "left" }}>
              <th style={{ padding: "8px 12px" }}>#</th>
              <th style={{ padding: "8px 12px" }}>酒款</th>
              <th style={{ padding: "8px 12px" }}>分类</th>
              <th style={{ padding: "8px 12px", textAlign: "right" }}>销量</th>
              <th style={{ padding: "8px 12px", textAlign: "right" }}>营收</th>
              <th style={{ padding: "8px 12px", textAlign: "right" }}>占比</th>
            </tr>
          </thead>
          <tbody>
            {data.top_drinks.map((d, i) => {
              const pct = data.total_revenue > 0 ? (d.revenue / data.total_revenue * 100) : 0;
              return (
                <tr key={d.drink_id}
                  style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 12px", color: "var(--text-dim)" }}>{i + 1}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>{d.name}</td>
                  <td style={{ padding: "8px 12px", color: "var(--text-dim)" }}>{d.category_name}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{d.quantity} 杯</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>
                    ¥{d.revenue.toFixed(2)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      <div style={{ flex: "0 0 60px", height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", minWidth: 40 }}>{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, small }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: small ? 14 : 22, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
    </div>
  );
}

// ── Chart options ──
const baseFont = { family: "Microsoft YaHei, PingFang SC, sans-serif" };

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: "#888", font: baseFont }, grid: { color: "rgba(255,255,255,0.04)" } },
    y: { ticks: { color: "#888", font: baseFont, callback: v => "¥" + v }, grid: { color: "rgba(255,255,255,0.06)" } },
  },
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: "y",
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: "#888", font: baseFont }, grid: { color: "rgba(255,255,255,0.04)" } },
    y: { ticks: { color: "#ccc", font: { ...baseFont, size: 11 } }, grid: { display: false } },
  },
};

const hourlyOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: "#888", font: { ...baseFont, size: 10 }, maxRotation: 0 }, grid: { display: false } },
    y: { ticks: { color: "#888", font: baseFont }, grid: { color: "rgba(255,255,255,0.04)" } },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "60%",
  plugins: {
    legend: {
      position: "bottom",
      labels: { color: "#ccc", font: { ...baseFont, size: 11 }, padding: 16, usePointStyle: true },
    },
  },
};
