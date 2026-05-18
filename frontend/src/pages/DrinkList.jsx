import { useState, useEffect, useCallback } from "react";
import { api } from "../api";

export default function DrinkList() {
  const [categories, setCategories] = useState([]);
  const [drinks, setDrinks] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [search, setSearch] = useState("");
  const [editDrink, setEditDrink] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const [cats, drs] = await Promise.all([
      api.getCategories(),
      api.getDrinks({ category_id: activeCat || undefined, search: search || undefined }),
    ]);
    setCategories(cats);
    setDrinks(drs);
  }, [activeCat, search]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    if (editDrink?.id) {
      await api.updateDrink(editDrink.id, data);
    } else {
      await api.createDrink(data);
    }
    setEditDrink(null);
    setShowAdd(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("确定下架该酒款？")) return;
    await api.deleteDrink(id);
    load();
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + 添加酒款
        </button>
        <input
          className="input"
          placeholder="搜索酒款..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid-2">
        <div className="sidebar card">
          <button
            className={`sidebar-item ${!activeCat ? "active" : ""}`}
            onClick={() => setActiveCat(null)}
          >
            全部分类
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`sidebar-item ${activeCat === c.id ? "active" : ""}`}
              onClick={() => setActiveCat(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid-cards">
          {drinks.map((d) => (
            <div
              key={d.id}
              className="card drink-card"
              onClick={() => setEditDrink(d)}
            >
              <div className="flex-between">
                <span className="name">{d.name}</span>
                <span className={`stock ${d.stock === 0 ? "low" : ""}`}>
                  库存: {d.stock}
                </span>
              </div>
              {d.description && <p className="desc">{d.description}</p>}
              <div className="flex-between">
                <span className="price">¥{d.price}</span>
                {!d.is_available && (
                  <span style={{ color: "var(--danger)", fontSize: 12 }}>已下架</span>
                )}
              </div>
              <button
                className="btn btn-sm btn-danger"
                style={{ position: "absolute", top: 8, right: 8 }}
                onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
              >
                删除
              </button>
            </div>
          ))}
          {drinks.length === 0 && (
            <div className="empty" style={{ gridColumn: "1 / -1" }}>暂无酒款</div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(editDrink || showAdd) && (
        <DrinkForm
          categories={categories}
          initial={editDrink || { category_id: categories[0]?.id || 0 }}
          onSave={handleSave}
          onClose={() => { setEditDrink(null); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

function DrinkForm({ categories, initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial.name || "",
    price: initial.price || "",
    description: initial.description || "",
    category_id: initial.category_id,
    stock: initial.stock ?? 0,
    is_available: initial.is_available ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, price: Number(form.price), stock: Number(form.stock) });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>{initial.id ? "编辑酒款" : "添加酒款"}</h3>
        <div className="form-group">
          <label className="label">名称</label>
          <input className="input" value={form.name} required
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="label">分类</label>
          <select className="select" value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group flex-row">
          <div style={{ flex: 1 }}>
            <label className="label">价格 (¥)</label>
            <input className="input" type="number" step="0.01" min="0" value={form.price} required
              onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">库存</label>
            <input className="input" type="number" min="0" value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="label">描述</label>
          <textarea className="input" rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="label" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.is_available}
              onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
            上架
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>取消</button>
          <button type="submit" className="btn btn-primary">保存</button>
        </div>
      </form>
    </div>
  );
}
