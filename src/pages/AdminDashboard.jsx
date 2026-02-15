import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getStoredUser, getToken } from "../services/Auth.service";
import {
  getAdminDashboardStats,
  getAdminListings,
  getAdminUsers,
  setAdminListingStatus,
  setAdminUserStatus
} from "../services/Admin.service";
import "./AdminDashboard.css";

const LISTING_STATUS_OPTIONS = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "ARCHIVED"];

export default function AdminDashboard() {
  const token = getToken();
  const user = getStoredUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [stats, setStats] = useState({
    totalListings: 0,
    pendingReports: 0,
    newMessages: 0,
    verifiedUsers: 0
  });
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);

  const [listingBusyId, setListingBusyId] = useState(null);
  const [userBusyId, setUserBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      if (!token) return;
      if (user?.role !== "ADMIN") return;

      setLoading(true);
      setError("");

      try {
        const [dashboardStats, listingRows, userRows] = await Promise.all([
          getAdminDashboardStats(),
          getAdminListings({ limit: 50 }),
          getAdminUsers({ limit: 50 })
        ]);

        if (cancelled) return;
        setStats(dashboardStats);
        setListings(listingRows);
        setUsers(userRows);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.error || err?.message || "Failed to load admin dashboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAdminData();
    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  const kpis = useMemo(
    () => [
      { label: "Total Listings", value: stats.totalListings, icon: "L", tone: "blue" },
      { label: "Pending Reports", value: stats.pendingReports, icon: "R", tone: "orange" },
      { label: "New Messages", value: stats.newMessages, icon: "M", tone: "green" },
      { label: "Verified Users", value: stats.verifiedUsers, icon: "U", tone: "blue2" }
    ],
    [stats]
  );

  async function refreshStats() {
    try {
      const dashboardStats = await getAdminDashboardStats();
      setStats(dashboardStats);
    } catch {
      // keep existing values on transient failure
    }
  }

  async function onListingStatusChange(listingId, status) {
    setError("");
    setSuccess("");
    setListingBusyId(listingId);

    try {
      let note;
      if (status === "REJECTED") {
        note = window.prompt("Optional rejection note", "Rejected by admin") || undefined;
      }

      const updated = await setAdminListingStatus(listingId, status, note);
      setListings((prev) => prev.map((item) => (item.id === listingId ? { ...item, ...updated } : item)));
      setSuccess(`Listing updated to ${status}.`);
      await refreshStats();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to update listing status.");
    } finally {
      setListingBusyId(null);
    }
  }

  async function onDeleteListing(listingId) {
    if (!window.confirm("Delete this listing?")) return;

    setError("");
    setSuccess("");
    setListingBusyId(listingId);

    try {
      await setAdminListingStatus(listingId, "DELETED", "Deleted by admin");
      setListings((prev) => prev.filter((x) => x.id !== listingId));
      setSuccess("Listing deleted.");
      await refreshStats();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to delete listing.");
    } finally {
      setListingBusyId(null);
    }
  }

  async function onUserAction(targetUser) {
    const nextStatus = targetUser.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    const reason =
      nextStatus === "BLOCKED"
        ? window.prompt("Optional block reason", "Violation of platform rules") || undefined
        : undefined;

    setError("");
    setSuccess("");
    setUserBusyId(targetUser.id);

    try {
      const updated = await setAdminUserStatus(targetUser.id, nextStatus, reason);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? {
                ...u,
                status: updated.status || nextStatus,
                blocked_reason: updated.blocked_reason || null
              }
            : u
        )
      );
      setSuccess(`User ${nextStatus === "BLOCKED" ? "blocked" : "reactivated"}.`);
      await refreshStats();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to update user status.");
    } finally {
      setUserBusyId(null);
    }
  }

  if (!token) return <Navigate to="/auth" replace />;

  if (user?.role !== "ADMIN") {
    return (
      <div className="adb-page">
        <div className="adb-container">
          <div className="adb-card adb-denied">
            <h2>Admin access required</h2>
            <p>You are logged in as a non-admin account.</p>
            <div className="adb-denied-actions">
              <Link to="/dashboard" className="adb-btn">
                Back to Dashboard
              </Link>
              <Link to="/messages" className="adb-btn outline">
                Open Messages
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="adb-page">
        <div className="adb-container">
          <div className="adb-card adb-denied">Loading admin dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="adb-page">
      <div className="adb-container">
        <div className="adb-header">
          <h1>Admin Dashboard</h1>
          <p>Manage platform listings and users.</p>
        </div>

        {error ? <div className="adb-alert error">{error}</div> : null}
        {success ? <div className="adb-alert success">{success}</div> : null}

        <div className="adb-kpis">
          {kpis.map((k) => (
            <div key={k.label} className={`adb-kpi ${k.tone}`}>
              <div className="adb-kpi-icon">{k.icon}</div>
              <div className="adb-kpi-meta">
                <div className="adb-kpi-label">{k.label}</div>
                <div className="adb-kpi-value">{k.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="adb-grid">
          <div className="adb-card">
            <div className="adb-card-head">
              <h2>Manage Listings</h2>
            </div>

            <div className="adb-list">
              {listings.length === 0 ? (
                <div className="adb-empty">No listings found.</div>
              ) : (
                listings.map((l) => (
                  <div key={l.id} className="adb-list-item">
                    <img
                      className="adb-list-img"
                      src={
                        l.photo_url ||
                        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&fit=crop"
                      }
                      alt={l.title}
                    />

                    <div className="adb-list-body">
                      <div className="adb-list-title">{l.title}</div>
                      <div className="adb-list-meta muted">
                        {l.city} • {l.currency} {Number(l.price_monthly || 0).toLocaleString()} • {l.status}
                      </div>
                      <div className="adb-list-meta muted">Owner: {l.owner_name || l.owner_email}</div>

                      <div className="adb-list-actions">
                        <button className="adb-btn outline" onClick={() => navigate(`/listing/${l.id}`)}>
                          Open
                        </button>
                        <button
                          className="adb-btn danger"
                          onClick={() => onDeleteListing(l.id)}
                          disabled={listingBusyId === l.id}
                        >
                          {listingBusyId === l.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    <div className="adb-list-right">
                      <select
                        className="adb-select"
                        value={l.status}
                        onChange={(e) => onListingStatusChange(l.id, e.target.value)}
                        disabled={listingBusyId === l.id}
                      >
                        {LISTING_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <button className="adb-icon-btn" title={l.id} disabled>
                        ...
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="adb-card">
            <div className="adb-card-head">
              <h2>User Management</h2>
            </div>

            <div className="adb-table-wrap">
              {users.length === 0 ? (
                <div className="adb-empty">No users found.</div>
              ) : (
                <table className="adb-table">
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>ROLE</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isSelf = user?.id === u.id;
                      const isBusy = userBusyId === u.id;
                      const canToggle = !isSelf && u.role !== "ADMIN";
                      const active = u.status === "ACTIVE";

                      return (
                        <tr key={u.id}>
                          <td>{u.display_name || u.email}</td>
                          <td className="muted">{u.role}</td>
                          <td>
                            <span className={`adb-badge ${active ? "ok" : "blocked"}`}>{u.status}</span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="adb-btn small"
                              onClick={() => onUserAction(u)}
                              disabled={!canToggle || isBusy}
                              title={isSelf ? "Cannot change your own status" : undefined}
                            >
                              {isBusy ? "..." : active ? "Block" : "Unblock"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="adb-footnote muted">Live data from backend admin APIs.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

