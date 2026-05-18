import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import DrinkList from "./pages/DrinkList";
import NewOrder from "./pages/NewOrder";
import OrderBoard from "./pages/OrderBoard";
import Analytics from "./pages/Analytics";

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/drinks" element={<DrinkList />} />
          <Route path="/order/new" element={<NewOrder />} />
          <Route path="/orders" element={<OrderBoard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/orders" replace />} />
        </Routes>
      </main>
    </div>
  );
}
