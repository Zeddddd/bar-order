const BASE = "/api";

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "请求失败");
  }
  return res.json();
}

function cleanParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""));
}

export const api = {
  // Categories
  getCategories: () => request("/categories"),

  // Drinks
  getDrinks: (params = {}) => {
    const qs = new URLSearchParams(cleanParams(params)).toString();
    return request(`/drinks${qs ? "?" + qs : ""}`);
  },
  createDrink: (data) => request("/drinks", { method: "POST", body: JSON.stringify(data) }),
  updateDrink: (id, data) => request(`/drinks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDrink: (id) => request(`/drinks/${id}`, { method: "DELETE" }),

  // Orders
  createOrder: (data) => request("/orders", { method: "POST", body: JSON.stringify(data) }),
  getOrders: (params = {}) => {
    const qs = new URLSearchParams(cleanParams(params)).toString();
    return request(`/orders${qs ? "?" + qs : ""}`);
  },
  updateOrderStatus: (id, status) =>
    request(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // Stats
  getStats: () => request("/stats"),

  // Analytics
  getDashboard: (days = 30) => request(`/analytics/dashboard?days=${days}`),

  // Export
  getExportUrl: (params = {}) => {
    const qs = new URLSearchParams(cleanParams(params)).toString();
    return `${BASE}/orders/export${qs ? "?" + qs : ""}`;
  },

  // Reset
  resetData: (mode) => request("/reset", { method: "POST", body: JSON.stringify({ mode }) }),
};
