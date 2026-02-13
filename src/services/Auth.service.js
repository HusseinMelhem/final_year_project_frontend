const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text };
  }
}

export async function registerUser({ email, password, displayName }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Register failed");
  }
  return data;
}

export async function loginUser({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Login failed");
  }
  return data;
}

// Helpers
export function saveAuth(data) {
  // support multiple backend response shapes
  const token =
    data?.token ||
    data?.accessToken ||
    data?.data?.token ||
    data?.data?.accessToken ||
    null;

  const user =
    data?.user ||
    data?.profile ||
    data?.data?.user ||
    data?.data?.profile ||
    { email: data?.email };

  if (token) localStorage.setItem("token", token);
  if (user) localStorage.setItem("user", JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getToken() {
  return localStorage.getItem("token");
}
