import { io } from "socket.io-client";
import { resolveMediaUrl } from "../utils/media";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text };
  }
}

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function ensureToken(token) {
  if (!token) throw new Error("Missing auth token. Please login.");
}

function throwIfFailed(res, data, fallbackMessage) {
  if (res.ok) return;
  throw new Error(data?.error || data?.message || fallbackMessage);
}

export function getStoredUserId() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id || null;
  } catch {
    return null;
  }
}

export async function fetchMyConversations(token) {
  ensureToken(token);
  const res = await fetch(`${API_BASE}/conversations/me`, {
    method: "GET",
    headers: authHeaders(token),
  });
  const data = await safeJson(res);
  throwIfFailed(res, data, "Failed to load conversations");
  return (data?.items || []).map((item) => ({
    ...item,
    listing: item?.listing
      ? {
          ...item.listing,
          photoUrl: resolveMediaUrl(item.listing.photoUrl),
        }
      : null,
    otherUser: item?.otherUser
      ? {
          ...item.otherUser,
          avatarUrl: resolveMediaUrl(item.otherUser.avatarUrl),
        }
      : null,
  }));
}

export async function fetchConversationMessages({ conversationId, limit = 100, before }, token) {
  ensureToken(token);

  const url = new URL(`${API_BASE}/conversations/${conversationId}/messages`);
  url.searchParams.set("limit", String(limit));
  if (before) url.searchParams.set("before", before);

  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders(token),
  });
  const data = await safeJson(res);
  throwIfFailed(res, data, "Failed to load messages");
  return data?.items || [];
}

export async function createConversation({ listingId }, token) {
  ensureToken(token);
  const res = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ listingId }),
  });
  const data = await safeJson(res);
  throwIfFailed(res, data, "Failed to create conversation");
  return data;
}

export async function sendConversationMessage({ conversationId, body }, token) {
  ensureToken(token);
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ body }),
  });
  const data = await safeJson(res);
  throwIfFailed(res, data, "Failed to send message");
  return data;
}

export async function markConversationRead({ conversationId }, token) {
  ensureToken(token);
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/read`, {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await safeJson(res);
  throwIfFailed(res, data, "Failed to mark conversation as read");
  return data;
}

export async function deleteConversationMessage({ messageId }, token) {
  ensureToken(token);
  const res = await fetch(`${API_BASE}/messages/${messageId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const data = await safeJson(res);
  throwIfFailed(res, data, "Failed to delete message");
  return data;
}

export async function editConversationMessage({ messageId, body }, token) {
  ensureToken(token);
  const res = await fetch(`${API_BASE}/messages/${messageId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ body }),
  });
  const data = await safeJson(res);
  throwIfFailed(res, data, "Failed to edit message");
  return data;
}

export function createChatSocket(token) {
  ensureToken(token);

  return io(API_BASE, {
    transports: ["websocket"],
    withCredentials: true,
    auth: {
      token: `Bearer ${token}`,
    },
  });
}
