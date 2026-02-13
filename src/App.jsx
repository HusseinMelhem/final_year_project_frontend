import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ListingDetails from "./pages/ListingDetails";
import Messages from "./pages/Messages";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";

function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        {/* Redirect root to listings */}
        <Route path="/" element={<Navigate to="/listings" replace />} />

        {/* Real pages */}
        <Route path="/listings" element={<Home />} />
        <Route path="/listing/:id" element={<ListingDetails />} />
        <Route path="/messages" element={<Messages />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/auth" element={<Auth />} />

        {/* placeholders (optional) */}
        <Route path="/dashboard" element={<div style={{ padding: 20 }}>Dashboard</div>} />
        <Route path="/auth" element={<div style={{ padding: 20 }}>Login / Sign Up</div>} />

        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/listings" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
