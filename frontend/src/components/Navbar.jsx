import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <span className="navbar-brand">Bar Order</span>
      <NavLink to="/drinks" className={({ isActive }) => isActive ? "active" : ""}>
        酒单管理
      </NavLink>
      <NavLink to="/order/new" className={({ isActive }) => isActive ? "active" : ""}>
        下单
      </NavLink>
      <NavLink to="/orders" className={({ isActive }) => isActive ? "active" : ""}>
        订单看板
      </NavLink>
      <NavLink to="/analytics" className={({ isActive }) => isActive ? "active" : ""}>
        数据分析
      </NavLink>
    </nav>
  );
}
