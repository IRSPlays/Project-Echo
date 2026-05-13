import { Routes, Route } from "react-router-dom";
import { SubmitPortal } from "./pages/SubmitPortal";
import { AdminDashboard } from "./pages/AdminDashboard";
import { StatusBoard } from "./pages/StatusBoard";
import { TicketTracker } from "./pages/TicketTracker";
import { SLDashboard } from "./pages/SLDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SubmitPortal />} />
      <Route path="/track" element={<TicketTracker />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/sl" element={<SLDashboard />} />
      <Route path="/status" element={<StatusBoard />} />
    </Routes>
  );
}
