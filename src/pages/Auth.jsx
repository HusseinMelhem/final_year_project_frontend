import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";
import {
  getStoredUser,
  getToken,
  loginUser,
  logout,
  registerUser,
  saveAuth,
} from "../services/Auth.service";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Auth() {
  const navigate = useNavigate();
  const token = getToken();
  const storedUser = getStoredUser();
  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const title = useMemo(
    () => (mode === "login" ? "Welcome back" : "Create your account"),
    [mode]
  );

  const subtitle = useMemo(
    () =>
      mode === "login"
        ? "Sign in to manage your profile, listings, and messages."
        : "Join RentMate to browse listings and contact owners.",
    [mode]
  );

  function validate() {
    if (!emailRegex.test(email.trim())) return "Please enter a valid email.";
    if (password.trim().length < 6) return "Password must be at least 6 characters.";
    if (mode === "signup" && displayName.trim().length < 2) {
      return "Display name must be at least 2 characters.";
    }
    return "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    try {
      setLoading(true);

      const data =
        mode === "signup"
          ? await registerUser({
              email: email.trim(),
              password: password.trim(),
              displayName: displayName.trim(),
            })
          : await loginUser({
              email: email.trim(),
              password: password.trim(),
            });

      saveAuth(data);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (token) {
    return (
      <div className="auth-page">
        <div className="auth-shell logged-in">
          <div className="auth-card auth-logged-card">
            <h1 className="auth-title">You are already logged in</h1>
            <p className="auth-subtitle">
              Signed in as <strong>{storedUser?.email || "user"}</strong>. Manage your account from one place.
            </p>

            <div className="auth-logged-actions">
              <Link className="auth-action-link primary" to="/profile">
                Open Profile
              </Link>
              <Link className="auth-action-link" to="/dashboard">
                Manage Listings
              </Link>
              <Link className="auth-action-link" to="/messages">
                Open Messages
              </Link>
              <button
                type="button"
                className="auth-action-link danger"
                onClick={() => {
                  logout();
                  navigate("/auth", { replace: true });
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand">
          <div className="auth-logo-row">
            <div className="auth-logo-badge">RM</div>
            <div className="auth-logo-text">RentMate</div>
          </div>

          <h2 className="auth-brand-title">Rent smarter.</h2>
          <p className="auth-brand-sub">
            Browse verified listings, message landlords quickly, and track your housing activity.
          </p>

          <div className="auth-points">
            <div className="auth-point">Verified users and listings</div>
            <div className="auth-point">Built-in messaging</div>
            <div className="auth-point">Dashboard and profile tools</div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={"auth-tab " + (mode === "login" ? "active" : "")}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={"auth-tab " + (mode === "signup" ? "active" : "")}
              onClick={() => setMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <div className="auth-head">
            <h1 className="auth-title">{title}</h1>
            <p className="auth-subtitle">{subtitle}</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={onSubmit}>
            {mode === "signup" ? (
              <div className="auth-field">
                <label>Display Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. User One"
                  autoComplete="name"
                />
              </div>
            ) : null}

            <div className="auth-field">
              <label>Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@test.com"
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password123!"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            <button className="auth-submit" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
            </button>

            <div className="auth-footer">
              {mode === "login" ? (
                <span>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => setMode("signup")}
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => setMode("login")}
                  >
                    Login
                  </button>
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
