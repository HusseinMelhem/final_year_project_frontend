import { resolveMediaUrl } from "../utils/media";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

function normalizeUser(user) {
  if (!user) return null;
  const avatarRaw = user.avatarUrl || user.avatar_url || "";
  return {
    ...user,
    avatarUrl: avatarRaw ? resolveMediaUrl(avatarRaw) : ""
  };
}

function emitAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:changed"));
  }
}

function persistUser(nextUser) {
  const normalized = normalizeUser(nextUser);
  if (!normalized) return;
  localStorage.setItem("user", JSON.stringify(normalized));
}

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
  if (user) persistUser(user);
  emitAuthChanged();
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  emitAuthChanged();
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function ensureToken() {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export async function fetchMyAccount() {
  const token = ensureToken();
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    headers: authHeaders(token),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || data?.error || "Failed to load account");

  if (data?.profile?.avatarUrl) {
    data.profile.avatarUrl = resolveMediaUrl(data.profile.avatarUrl);
  }

  if (data?.user) {
    persistUser({
      ...getStoredUser(),
      ...data.user,
      displayName: data?.profile?.displayName || data?.user?.displayName,
      avatarUrl: data?.profile?.avatarUrl || data?.user?.avatarUrl
    });
    emitAuthChanged();
  }

  return data;
}

export async function updateMyProfile(payload) {
  const token = ensureToken();
  const res = await fetch(`${API_BASE}/auth/me/profile`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || data?.error || "Failed to update profile");

  if (data?.profile?.avatarUrl) {
    data.profile.avatarUrl = resolveMediaUrl(data.profile.avatarUrl);
  }

  if (data?.profile) {
    persistUser({
      ...getStoredUser(),
      displayName: data.profile.displayName,
      avatarUrl: data.profile.avatarUrl
    });
    emitAuthChanged();
  }

  return data;
}

export async function uploadMyProfilePhoto(file) {
  if (!file) throw new Error("Photo file is required");
  const token = ensureToken();

  const fd = new FormData();
  fd.append("photo", file);

  const res = await fetch(`${API_BASE}/auth/me/photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || data?.error || "Failed to upload photo");

  const avatarUrl = resolveMediaUrl(data?.avatarUrl);
  persistUser({
    ...getStoredUser(),
    avatarUrl
  });
  emitAuthChanged();

  return { ...data, avatarUrl };
}
