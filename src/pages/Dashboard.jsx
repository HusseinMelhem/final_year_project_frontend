import React, { useMemo, useState } from "react";
import "./Dashboard.css";

export default function Dashboard() {
  // Demo data (replace later with API)
  const kpis = useMemo(
    () => [
      { label: "Total Listings", value: 81, icon: "🏢", tone: "blue" },
      { label: "Pending Reports", value: 12, icon: "🧾", tone: "orange" },
      { label: "New Messages", value: 3, icon: "💬", tone: "green" },
      { label: "Verified Users", value: 124, icon: "✅", tone: "blue2" },
    ],
    []
  );

  const [listings, setListings] = useState([
    {
      id: "l1",
      title: "Cozy Suburban House",
      status: "Active",
      img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&fit=crop",
    },
    {
      id: "l2",
      title: "Beachside Condo",
      status: "Active",
      img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&fit=crop",
    },
    {
      id: "l3",
      title: "Downtown Studio",
      status: "Pending",
      img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&fit=crop",
    },
  ]);

  const [users, setUsers] = useState([
    { id: "u1", name: "Emily Smith", role: "User", status: "Active" },
    { id: "u2", name: "James Brown", role: "User", status: "Pending" },
    { id: "u3", name: "Sara Tenant", role: "User", status: "Pending" },
    { id: "u4", name: "Admin", role: "Admin", status: "Pending" },
  ]);

  function onListingStatusChange(id, next) {
    setListings((prev) => prev.map((x) => (x.id === id ? { ...x, status: next } : x)));
  }

  function onEditListing(id) {
    alert(`Edit listing: ${id} (wire to your edit page later)`);
  }

  function onDeleteListing(id) {
    if (!confirm("Delete this listing?")) return;
    setListings((prev) => prev.filter((x) => x.id !== id));
  }

  function onUserAction(id) {
    // demo: toggle Active/Pending
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === "Active" ? "Pending" : "Active" } : u
      )
    );
  }

  return (
    <div className="db-page">
      <div className="db-container">
        {/* KPI cards */}
        <div className="db-kpis">
          {kpis.map((k) => (
            <div key={k.label} className={`db-kpi ${k.tone}`}>
              <div className="db-kpi-icon">{k.icon}</div>
              <div className="db-kpi-meta">
                <div className="db-kpi-label">{k.label}</div>
                <div className="db-kpi-value">{k.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="db-grid">
          {/* Manage Listings */}
          <div className="db-card">
            <div className="db-card-head">
              <h2>Manage Listings</h2>
            </div>

            <div className="db-list">
              {listings.map((l) => (
                <div key={l.id} className="db-list-item">
                  <img className="db-list-img" src={l.img} alt="" />

                  <div className="db-list-body">
                    <div className="db-list-title">{l.title}</div>

                    <div className="db-list-actions">
                      <button className="db-btn outline" onClick={() => onEditListing(l.id)}>
                        Edit
                      </button>
                      <button className="db-btn danger" onClick={() => onDeleteListing(l.id)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="db-list-right">
                    <select
                      className="db-select"
                      value={l.status}
                      onChange={(e) => onListingStatusChange(l.id, e.target.value)}
                    >
                      <option>Active</option>
                      <option>Pending</option>
                      <option>Rejected</option>
                      <option>Archived</option>
                    </select>

                    <button className="db-icon-btn" title="More">
                      ⋯
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Management */}
          <div className="db-card">
            <div className="db-card-head">
              <h2>User Management</h2>
            </div>

            <div className="db-table-wrap">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>ROLE</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td className="muted">{u.role}</td>
                      <td>
                        <span className={`db-badge ${u.status === "Active" ? "ok" : "pending"}`}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="db-btn small" onClick={() => onUserAction(u.id)}>
                          {u.status === "Active" ? "Suspend" : "Edit"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="db-footnote muted">
              *Replace demo actions with real admin APIs later.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
