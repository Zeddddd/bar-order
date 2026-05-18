import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function NewOrder() {
  const [categories, setCategories] = useState([]);
  const [drinks, setDrinks] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const loadDrinks = useCallback(async () => {
    const [cats, drs] = await Promise.all([
      api.getCategories(),
      api.getDrinks({ category_id: activeCat || undefined, search: search || undefined }),
    ]);
    setCategories(cats);
    setDrinks(drs);
  }, [activeCat, search]);

  useEffect(() => { loadDrinks(); }, [loadDrinks]);

  const addToCart = (drink) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.drink_id === drink.id);
      if (existing) {
        return prev.map((c) =>
          c.drink_id === drink.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { drink_id: drink.id, name: drink.name, price: drink.price, quantity: 1 }];
    });
  };

  const removeFromCart = (drinkId) => {
    setCart((prev) => prev.filter((c) => c.drink_id !== drinkId));
  };

  const updateQty = (drinkId, qty) => {
    if (qty < 1) return removeFromCart(drinkId);
    setCart((prev) =>
      prev.map((c) => (c.drink_id === drinkId ? { ...c, quantity: qty } : c))
    );
  };

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const handleSubmit = async () => {
    if (!tableNumber.trim()) return alert("请输入桌号");
    if (cart.length === 0) return alert("请先添加酒款");
    setSubmitting(true);
    try {
      await api.createOrder({
        table_number: tableNumber.trim(),
        note,
        items: cart.map((c) => ({ drink_id: c.drink_id, quantity: c.quantity })),
      });
      navigate("/orders");
    } catch (err) {
      alert("下单失败: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="split-layout">
      {/* Left: drink picker */}
      <div className="order-panel">
        <div className="toolbar">
          <input className="input" placeholder="搜索酒款..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
          {categories.map((c) => (
            <button
              key={c.id}
              className={`btn btn-sm ${activeCat === c.id ? "btn-primary" : "btn-outline"}`}
              onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="drink-picker">
          {drinks.map((d) => (
            <div
              key={d.id}
              className="drink-picker-item flex-between"
              onClick={() => d.is_available && d.stock > 0 && addToCart(d)}
              style={{
                opacity: d.is_available && d.stock > 0 ? 1 : 0.4,
                cursor: d.is_available && d.stock > 0 ? "pointer" : "not-allowed",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                  {d.description?.slice(0, 40)}{d.description?.length > 40 ? "..." : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, color: "var(--accent)" }}>¥{d.price}</div>
                <div style={{ fontSize: 11, color: d.stock === 0 ? "var(--danger)" : "var(--text-dim)" }}>
                  库存: {d.stock}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: cart */}
      <div className="card order-panel">
        <h3 style={{ marginBottom: 8 }}>购物车</h3>
        <div className="cart-items">
          {cart.map((c) => (
            <div key={c.drink_id} className="cart-item flex-between">
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>¥{c.price}</div>
              </div>
              <div className="flex-row">
                <div className="qty-ctrl">
                  <button onClick={() => updateQty(c.drink_id, c.quantity - 1)}>-</button>
                  <span>{c.quantity}</span>
                  <button onClick={() => updateQty(c.drink_id, c.quantity + 1)}>+</button>
                </div>
                <button className="btn btn-sm btn-danger"
                  onClick={() => removeFromCart(c.drink_id)}>✕</button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="empty">点击左侧酒款加入购物车</div>}
        </div>

        <div className="cart-total">
          <div className="flex-between">
            <span>合计</span>
            <span className="amount">¥{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="label">桌号 *</label>
          <input className="input" value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="如: A1, 12, VIP3" />
        </div>
        <div className="form-group">
          <label className="label">备注</label>
          <input className="input" value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="如: 少冰、去糖" />
        </div>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: 12, fontSize: 16 }}
          disabled={submitting} onClick={handleSubmit}>
          {submitting ? "提交中..." : `下单 ¥${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
