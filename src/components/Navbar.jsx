import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getStoredUser, getToken, logout } from "../services/Auth.service";
import { fetchMyConversations } from "../services/Messages.service";
import { useTheme } from "../context/theme-context";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [auth, setAuth] = useState(() => ({
    token: getToken(),
    user: getStoredUser(),
  }));
  const [unreadCount, setUnreadCount] = useState(0);
  const token = auth.token;
  const user = auth.user;

  useEffect(() => {
    function syncAuth() {
      setAuth({
        token: getToken(),
        user: getStoredUser(),
      });
    }

    window.addEventListener("auth:changed", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("auth:changed", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    async function refreshUnread() {
      if (!token) {
        setUnreadCount(0);
        return;
      }

      try {
        const items = await fetchMyConversations(token);
        if (disposed) return;

        const nextCount = items.reduce((sum, item) => sum + (item?.unread ? 1 : 0), 0);
        setUnreadCount(nextCount);
      } catch {
        if (!disposed) setUnreadCount(0);
      }
    }

    refreshUnread();
    const intervalId = window.setInterval(refreshUnread, 15000);

    function onWindowFocus() {
      refreshUnread();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") refreshUnread();
    }

    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [location.pathname, token]);

  function onLogout() {
    logout();
    navigate("/auth");
  }

  const nameOrEmail = user?.displayName || user?.email || "Account";
  const profileAvatar =
    user?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(nameOrEmail)}&background=EAF0FF&color=1D4ED8`;

  return (
    <nav className="nav-root">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          RentMate
        </Link>

        <div className="nav-links">
          <Link className={navLinkClass(location.pathname === "/listings" || location.pathname === "/")} to="/listings">
            Browse
          </Link>
          {token ? (
            <Link className={navLinkClass(location.pathname.startsWith("/listings/new"))} to="/listings/new">
              Create Listing
            </Link>
          ) : null}
          <Link className={navLinkClass(location.pathname.startsWith("/messages"))} to="/messages">
            <span className="nav-msg-link">
              Messages
              {token && unreadCount > 0 ? (
                <span className="nav-unread-badge" aria-label={`${unreadCount} unread conversations`}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </span>
          </Link>
          <Link className={navLinkClass(location.pathname.startsWith("/dashboard"))} to="/dashboard">
            My Listings
          </Link>
          {user?.role === "ADMIN" ? (
            <Link
              className={navLinkClass(
                location.pathname.startsWith("/admin-dashboard") || location.pathname.startsWith("/admin")
              )}
              to="/admin-dashboard"
            >
              Admin
            </Link>
          ) : null}
          <Link className={navLinkClass(location.pathname.startsWith("/profile"))} to="/profile">
            Profile
          </Link>
        </div>

        <div className="nav-actions">
          <button type="button" className="nav-theme-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? "Light" : "Dark"}
          </button>

          {token ? (
            <>
              <div className="nav-user-chip" title={nameOrEmail}>
                <img className="nav-user-avatar" src={profileAvatar} alt={nameOrEmail} />
                <span>{nameOrEmail}</span>
              </div>
              <button type="button" className="nav-logout-btn" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/auth" className="nav-auth-btn">
              Login / Sign Up
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function navLinkClass(active) {
  return `nav-link ${active ? "is-active" : ""}`;
}
