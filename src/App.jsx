import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ListingDetails from "./pages/ListingDetails";
import CreateListing from "./pages/CreateListing";
import Messages from "./pages/Messages";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";

function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        {/* Redirect root to listings */}
        <Route path="/" element={<Navigate to="/listings" replace />} />

        {/* Real pages */}
        <Route path="/listings" element={<Home />} />
        <Route path="/listings/new" element={<CreateListing />} />
        <Route path="/listing/:id" element={<ListingDetails />} />
        <Route path="/messages" element={<Messages />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />

        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/listings" replace />} />
      </Routes>
    </Router> 
  );
}

export default App;
