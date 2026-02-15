import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getToken } from "../services/Auth.service";
import {
  createChatSocket,
  deleteConversationMessage,
  editConversationMessage,
  fetchConversationMessages,
  fetchMyConversations,
  getStoredUserId,
  markConversationRead,
  sendConversationMessage,
} from "../services/Messages.service";
import { getListings } from "../services/Listings.service";
import "./Messages.css";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (!sameDay) {
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  }

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function timeValue(ts) {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function avatarFor(name) {
  const value = encodeURIComponent(name || "Chat");
  return `https://ui-avatars.com/api/?name=${value}&background=EAF0FF&color=1D4ED8`;
}

function sortThreads(items) {
  return [...items].sort((a, b) => timeValue(b.lastTime) - timeValue(a.lastTime));
}

function previewText(message) {
  if (!message) return "No messages yet";
  if (message.deletedAt) return "[Message deleted]";
  return message.text || "";
}

function normalizeMessage(raw, meUserId) {
  const senderUserId = raw?.sender_user_id ?? raw?.senderUserId ?? null;
  const conversationId = raw?.conversation_id ?? raw?.conversationId ?? null;
  const createdAt = raw?.created_at ?? raw?.createdAt ?? new Date().toISOString();
  const editedAt = raw?.edited_at ?? raw?.editedAt ?? null;
  const deletedAt = raw?.deleted_at ?? raw?.deletedAt ?? null;

  return {
    id: raw?.id,
    conversationId,
    senderUserId,
    sender: senderUserId && senderUserId === meUserId ? "me" : "them",
    text: raw?.body || "",
    ts: createdAt,
    editedAt,
    deletedAt,
  };
}

function upsertMessage(list, message) {
  const idx = list.findIndex((x) => x.id === message.id);
  if (idx === -1) {
    return [...list, message].sort((a, b) => timeValue(a.ts) - timeValue(b.ts));
  }

  const next = [...list];
  next[idx] = { ...next[idx], ...message };
  return next;
}

function toThread(item) {
  const listingTitle = item?.listing?.title || "Listing Inquiry";
  const city = item?.listing?.city ? ` - ${item.listing.city}` : "";
  const otherDisplayName =
    item?.otherUser?.displayName || item?.otherUser?.email || "User";
  const listingPhoto = item?.listing?.photoUrl || "";
  const contactAvatar = item?.otherUser?.avatarUrl || avatarFor(otherDisplayName);
  const role = `Chat with ${otherDisplayName}`;

  return {
    id: item.conversationId,
    name: `${listingTitle}${city}`,
    role,
    avatar: listingPhoto || contactAvatar || avatarFor(listingTitle),
    listingPhoto: listingPhoto || "",
    contactAvatar,
    contactName: otherDisplayName,
    contactUserId: item?.otherUser?.id || null,
    listingId: item?.listing?.id || null,
    listingCity: item?.listing?.city || "",
    lastMessage: item?.lastMessage?.body || "No messages yet",
    lastTime: item?.lastMessage?.at || item?.createdAt,
    unread: item?.unread ? 1 : 0,
  };
}

export default function Messages() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = getToken();
  const meUserId = getStoredUserId();

  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [folder, setFolder] = useState("Conversations");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [socketState, setSocketState] = useState("disconnected");
  const [error, setError] = useState("");
  const [openMenuMessageId, setOpenMenuMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [savingEditId, setSavingEditId] = useState(null);
  const [forwardSourceMessage, setForwardSourceMessage] = useState(null);
  const [forwardTargetId, setForwardTargetId] = useState("");
  const [forwarding, setForwarding] = useState(false);
  const [forwardQuery, setForwardQuery] = useState("");
  const [presenceByUserId, setPresenceByUserId] = useState({});
  const [toastItems, setToastItems] = useState([]);
  const [suggestedListings, setSuggestedListings] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });

  const socketRef = useRef(null);
  const activeIdRef = useRef(activeId);
  const bottomRef = useRef(null);
  const composerInputRef = useRef(null);
  const editingMessageIdRef = useRef(editingMessageId);
  const threadsRef = useRef(threads);
  const toastTimeoutsRef = useRef({});

  const requestedConversationId = useMemo(
    () => new URLSearchParams(location.search).get("conversationId"),
    [location.search]
  );

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    editingMessageIdRef.current = editingMessageId;
  }, [editingMessageId]);

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useEffect(() => {
    setOpenMenuMessageId(null);
    setEditingMessageId(null);
    setEditingDraft("");
    setSavingEditId(null);
    setForwardSourceMessage(null);
    setForwardTargetId("");
    setForwardQuery("");
    setForwarding(false);
  }, [activeId]);

  useEffect(() => {
    function onDocumentClick(event) {
      const target = event.target;
      if (target instanceof Element && target.closest(".msg-bubble-actions")) return;
      setOpenMenuMessageId(null);
    }

    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, []);

  useEffect(() => {
    return () => {
      for (const timeoutId of Object.values(toastTimeoutsRef.current)) {
        clearTimeout(timeoutId);
      }
      toastTimeoutsRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return undefined;

    function syncPermission() {
      setNotificationPermission(Notification.permission);
    }

    window.addEventListener("focus", syncPermission);
    document.addEventListener("visibilitychange", syncPermission);
    return () => {
      window.removeEventListener("focus", syncPermission);
      document.removeEventListener("visibilitychange", syncPermission);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, messages.length]);

  useEffect(() => {
    if (socketState !== "online") return;
    refreshPresenceStatus();
  }, [socketState, threads]);

  useEffect(() => {
    let cancelled = false;

    async function loadConversations() {
      if (!token) {
        setThreads([]);
        setActiveId(null);
        setMessages([]);
        setLoadingThreads(false);
        setError("Login is required to open messages.");
        return;
      }

      setLoadingThreads(true);
      setError("");

      try {
        const items = await fetchMyConversations(token);
        if (cancelled) return;

        const nextThreads = sortThreads(items.map(toThread));
        setThreads(nextThreads);

        if (nextThreads.length === 0) {
          setActiveId(null);
          setMessages([]);
          return;
        }

        setActiveId((prev) => {
          if (requestedConversationId && nextThreads.some((x) => x.id === requestedConversationId)) {
            return requestedConversationId;
          }
          if (prev && nextThreads.some((x) => x.id === prev)) return prev;
          return nextThreads[0].id;
        });
      } catch (err) {
        if (!cancelled) {
          setThreads([]);
          setActiveId(null);
          setMessages([]);
          setError(err?.message || "Failed to load conversations.");
        }
      } finally {
        if (!cancelled) setLoadingThreads(false);
      }
    }

    loadConversations();
    return () => {
      cancelled = true;
    };
  }, [requestedConversationId, token]);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      if (!token || !activeId) {
        setMessages([]);
        return;
      }

      setLoadingMessages(true);

      try {
        const items = await fetchConversationMessages({ conversationId: activeId, limit: 100 }, token);
        if (cancelled) return;

        const mapped = items.map((x) => normalizeMessage(x, meUserId)).reverse();
        setMessages(mapped);

        setThreads((prev) =>
          prev.map((t) => (t.id === activeId ? { ...t, unread: 0 } : t))
        );

        await markConversationRead({ conversationId: activeId }, token).catch(() => {});

        if (socketRef.current?.connected) {
          socketRef.current.emit("conversation:join", { conversationId: activeId });
          socketRef.current.emit("conversation:read", { conversationId: activeId });
        }
      } catch (err) {
        if (!cancelled) {
          setMessages([]);
          setError(err?.message || "Failed to load messages.");
        }
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeId, meUserId, token]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = createChatSocket(token);
    socketRef.current = socket;
    setSocketState("connecting");

    socket.on("connect", () => {
      setSocketState("online");

      if (activeIdRef.current) {
        socket.emit("conversation:join", { conversationId: activeIdRef.current });
      }

      refreshPresenceStatus(threadsRef.current);
    });

    socket.on("disconnect", () => {
      setSocketState("offline");
    });

    socket.on("connect_error", (err) => {
      setSocketState("error");
      setError(err?.message || "WebSocket connection failed.");
    });

    socket.on("message:new", ({ message }) => {
      const next = normalizeMessage(message, meUserId);
      if (!next.id || !next.conversationId) return;

      const fromAnotherUser = next.sender !== "me";

      setThreads((prev) => {
        const idx = prev.findIndex((t) => t.id === next.conversationId);
        const isActive = activeIdRef.current === next.conversationId;
        const unread = isActive || next.sender === "me" ? 0 : 1;

        if (idx === -1) {
          const created = {
            id: next.conversationId,
            name: "Conversation",
            role: "Conversation",
            avatar: avatarFor("Conversation"),
            listingPhoto: "",
            contactAvatar: avatarFor("Conversation"),
            contactName: "User",
            contactUserId: null,
            lastMessage: previewText(next),
            lastTime: next.ts,
            unread,
          };
          return sortThreads([created, ...prev]);
        }

        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          lastMessage: previewText(next),
          lastTime: next.ts,
          unread: unread ? updated[idx].unread + 1 : 0,
        };
        return sortThreads(updated);
      });

      if (fromAnotherUser) {
        const match = threadsRef.current.find((t) => t.id === next.conversationId);
        const title = match?.name || "New message";
        const body = next.deletedAt ? "[Message deleted]" : next.text || "You received a new message";
        pushToast({ title, body, conversationId: next.conversationId });

        if (notificationPermission === "granted" && typeof window !== "undefined") {
          try {
            const nativeNotification = new Notification(title, { body });
            nativeNotification.onclick = () => {
              window.focus();
              selectThread(next.conversationId);
              nativeNotification.close();
            };
          } catch {
            // fall back to in-app toast only
          }
        }
      }

      if (activeIdRef.current === next.conversationId) {
        setMessages((prev) => upsertMessage(prev, next));

        if (next.sender !== "me") {
          socket.emit("conversation:read", { conversationId: next.conversationId });
          markConversationRead({ conversationId: next.conversationId }, token).catch(() => {});
        }
      }
    });

    socket.on("message:updated", ({ message }) => {
      const next = normalizeMessage(message, meUserId);
      if (!next.id || !next.conversationId) return;

      if (activeIdRef.current === next.conversationId) {
        setMessages((prev) => upsertMessage(prev, next));
      }

      if (editingMessageIdRef.current === next.id) {
        setEditingMessageId(null);
        setEditingDraft("");
        setSavingEditId(null);
      }

      setThreads((prev) =>
        prev.map((t) => (t.id === next.conversationId ? { ...t, lastMessage: previewText(next) } : t))
      );
    });

    socket.on("message:deleted", ({ messageId, conversationId, deletedAt }) => {
      if (!messageId || !conversationId) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, deletedAt: deletedAt || new Date().toISOString(), text: "" } : m
        )
      );

      if (editingMessageIdRef.current === messageId) {
        setEditingMessageId(null);
        setEditingDraft("");
        setSavingEditId(null);
      }

      setThreads((prev) =>
        prev.map((t) => (t.id === conversationId ? { ...t, lastMessage: "[Message deleted]" } : t))
      );
    });

    socket.on("presence:update", ({ userId, isOnline }) => {
      if (!userId) return;
      setPresenceByUserId((prev) => ({ ...prev, [userId]: Boolean(isOnline) }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketState("disconnected");
    };
  }, [meUserId, notificationPermission, token]);

  async function emitSendWithAck(payload) {
    return new Promise((resolve) => {
      socketRef.current.emit("message:send", payload, (ack) => resolve(ack));
    });
  }

  async function emitDeleteWithAck(payload) {
    return new Promise((resolve) => {
      socketRef.current.emit("message:delete", payload, (ack) => resolve(ack));
    });
  }

  async function emitEditWithAck(payload) {
    return new Promise((resolve) => {
      socketRef.current.emit("message:edit", payload, (ack) => resolve(ack));
    });
  }

  async function emitPresenceBatchWithAck(payload) {
    return new Promise((resolve) => {
      socketRef.current.emit("presence:batch", payload, (ack) => resolve(ack));
    });
  }

  function removeToast(id) {
    setToastItems((prev) => prev.filter((item) => item.id !== id));
    const timeoutId = toastTimeoutsRef.current[id];
    if (timeoutId) {
      clearTimeout(timeoutId);
      delete toastTimeoutsRef.current[id];
    }
  }

  function pushToast(item) {
    const id = `${Date.now()}-${Math.random()}`;
    setToastItems((prev) => [{ id, ...item }, ...prev].slice(0, 4));
    toastTimeoutsRef.current[id] = setTimeout(() => {
      removeToast(id);
    }, 5200);
  }

  async function refreshPresenceStatus(sourceThreads = threadsRef.current) {
    if (!socketRef.current?.connected) return;
    const userIds = [...new Set(sourceThreads.map((t) => t.contactUserId).filter(Boolean))];
    if (userIds.length === 0) {
      setPresenceByUserId({});
      return;
    }

    const ack = await emitPresenceBatchWithAck({ userIds });
    if (!ack?.ok || !Array.isArray(ack.items)) return;

    const next = {};
    for (const item of ack.items) {
      if (item?.userId) next[item.userId] = Boolean(item.isOnline);
    }
    setPresenceByUserId(next);
  }

  async function requestBrowserNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setError("Browser notifications are not supported in this browser.");
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationPermission("granted");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission !== "granted") {
      setError("Browser notifications are disabled.");
    }
  }

  function selectThread(id) {
    setActiveId(id);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
  }

  function openToastConversation(item) {
    if (item?.conversationId) {
      selectThread(item.conversationId);
    }
    if (item?.id) {
      removeToast(item.id);
    }
  }

  function openListingDetails(listingId) {
    if (!listingId) return;
    navigate(`/listing/${listingId}`);
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || !activeId || sending || !token) return;

    setSending(true);
    setError("");

    try {
      let sent;

      if (socketRef.current?.connected) {
        const ack = await emitSendWithAck({ conversationId: activeId, body: text });
        if (!ack?.ok) throw new Error(ack?.error || "Failed to send message");
        sent = ack.message;
      } else {
        sent = await sendConversationMessage({ conversationId: activeId, body: text }, token);
      }

      const next = normalizeMessage(sent, meUserId);
      setMessages((prev) => upsertMessage(prev, next));
      setThreads((prev) =>
        sortThreads(
          prev.map((t) =>
            t.id === activeId
              ? { ...t, lastMessage: previewText(next), lastTime: next.ts, unread: 0 }
              : t
          )
        )
      );

      setDraft("");
    } catch (err) {
      setError(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(message) {
    if (!message?.id || message.deletedAt || message.sender !== "me" || !token) return;
    if (!window.confirm("Delete this message?")) return;

    setError("");

    try {
      if (socketRef.current?.connected) {
        const ack = await emitDeleteWithAck({ messageId: message.id });
        if (!ack?.ok) throw new Error(ack?.error || "Failed to delete message");
      } else {
        await deleteConversationMessage({ messageId: message.id }, token);
      }

      const nowIso = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, deletedAt: m.deletedAt || nowIso, text: "" } : m
        )
      );
      setThreads((prev) =>
        prev.map((t) => (t.id === message.conversationId ? { ...t, lastMessage: "[Message deleted]" } : t))
      );
    } catch (err) {
      setError(err?.message || "Failed to delete message.");
    }
  }

  function toggleMessageMenu(messageId) {
    setOpenMenuMessageId((prev) => (prev === messageId ? null : messageId));
  }

  function beginEditMessage(message) {
    if (!message?.id || message.deletedAt || message.sender !== "me") return;
    setOpenMenuMessageId(null);
    setEditingMessageId(message.id);
    setEditingDraft(message.text || "");
  }

  function cancelEditMessage() {
    setEditingMessageId(null);
    setEditingDraft("");
    setSavingEditId(null);
  }

  async function saveEditedMessage(message) {
    if (!message?.id || message.deletedAt || message.sender !== "me" || !token) return;

    const body = editingDraft.trim();
    if (!body) {
      setError("Edited message cannot be empty.");
      return;
    }

    if (body === (message.text || "").trim()) {
      cancelEditMessage();
      return;
    }

    setError("");
    setSavingEditId(message.id);

    try {
      let updated;
      if (socketRef.current?.connected) {
        const ack = await emitEditWithAck({ messageId: message.id, body });
        if (!ack?.ok) throw new Error(ack?.error || "Failed to edit message");
        updated = ack.message;
      } else {
        updated = await editConversationMessage({ messageId: message.id, body }, token);
      }

      const next = normalizeMessage(updated, meUserId);
      setMessages((prev) => upsertMessage(prev, next));
      setThreads((prev) =>
        prev.map((t) => (t.id === next.conversationId ? { ...t, lastMessage: previewText(next) } : t))
      );

      cancelEditMessage();
    } catch (err) {
      setError(err?.message || "Failed to edit message.");
      setSavingEditId(null);
    }
  }

  function openForwardModal(message) {
    if (!message?.text || message.deletedAt) return;
    setOpenMenuMessageId(null);
    setForwardSourceMessage(message);
    setForwardTargetId("");
    setForwardQuery("");
  }

  function closeForwardModal() {
    setForwardSourceMessage(null);
    setForwardTargetId("");
    setForwardQuery("");
    setForwarding(false);
  }

  function pasteForwardToComposer() {
    if (!forwardSourceMessage?.text) return;
    setDraft(`Forwarded message:\n${forwardSourceMessage.text}`);
    closeForwardModal();
    composerInputRef.current?.focus();
  }

  async function confirmForwardMessage() {
    if (!forwardSourceMessage?.text || !token || !forwardTargetId || forwarding) return;

    const forwardBody = `Forwarded message:\n${forwardSourceMessage.text}`;
    setForwarding(true);
    setError("");

    try {
      let sent;
      if (socketRef.current?.connected) {
        const ack = await emitSendWithAck({ conversationId: forwardTargetId, body: forwardBody });
        if (!ack?.ok) throw new Error(ack?.error || "Failed to forward message");
        sent = ack.message;
      } else {
        sent = await sendConversationMessage({ conversationId: forwardTargetId, body: forwardBody }, token);
      }

      const next = normalizeMessage(sent, meUserId);
      if (forwardTargetId === activeIdRef.current) {
        setMessages((prev) => upsertMessage(prev, next));
      }

      setThreads((prev) =>
        sortThreads(
          prev.map((t) =>
            t.id === forwardTargetId
              ? { ...t, lastMessage: previewText(next), lastTime: next.ts, unread: 0 }
              : t
          )
        )
      );

      closeForwardModal();
      pushToast({
        title: "Message forwarded",
        body: "Your message was forwarded successfully.",
        conversationId: forwardTargetId,
      });
    } catch (err) {
      setError(err?.message || "Failed to forward message.");
      setForwarding(false);
    }
  }

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [activeId, threads]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestedListings() {
      setLoadingSuggestions(true);
      try {
        const primaryFilters = activeThread?.listingCity
          ? { query: activeThread.listingCity, sort: "newest", limit: 12 }
          : { sort: "newest", limit: 12 };

        const primary = await getListings(primaryFilters);
        const excludedId = activeThread?.listingId || null;
        let merged = primary.filter((item) => item?.id && item.id !== excludedId);

        if (merged.length < 4) {
          const fallback = await getListings({ sort: "newest", limit: 12 });
          merged = [...merged, ...fallback.filter((item) => item?.id && item.id !== excludedId)];
        }

        const uniq = [];
        const seen = new Set();
        for (const item of merged) {
          if (!item?.id || seen.has(item.id)) continue;
          seen.add(item.id);
          uniq.push(item);
          if (uniq.length >= 4) break;
        }

        if (!cancelled) setSuggestedListings(uniq);
      } catch {
        if (!cancelled) setSuggestedListings([]);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }

    loadSuggestedListings();
    return () => {
      cancelled = true;
    };
  }, [activeThread?.listingCity, activeThread?.listingId]);

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.lastMessage || "").toLowerCase().includes(q) ||
        t.role.toLowerCase().includes(q)
    );
  }, [query, threads]);

  const forwardTargets = useMemo(() => {
    const q = forwardQuery.trim().toLowerCase();
    return threads.filter((t) => {
      if (t.id === activeId) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.contactName.toLowerCase().includes(q) ||
        (t.lastMessage || "").toLowerCase().includes(q)
      );
    });
  }, [activeId, forwardQuery, threads]);

  const hasActiveContact = Boolean(activeThread?.contactUserId);
  const activeContactOnline = Boolean(
    activeThread?.contactUserId && presenceByUserId[activeThread.contactUserId]
  );

  return (
    <div className="msg-page">
      <div className="msg-container">
        {!token ? (
          <div className="msg-shell">
            <section className="msg-chat">
              <div className="msg-empty">Login first to use chat.</div>
            </section>
          </div>
        ) : (
          <div className="msg-shell">
            <aside className="msg-sidebar">
              <div className="msg-sidebar-top">
                <div className="msg-folder-row">
                  <select
                    className="msg-select"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                  >
                    <option>Conversations</option>
                  </select>

                  <button className="msg-icon-btn" title="Socket state" type="button">
                    {socketState === "online" ? "ON" : "OFF"}
                  </button>
                  <button
                    className="msg-icon-btn"
                    title={
                      notificationPermission === "granted"
                        ? "Notifications enabled"
                        : "Enable browser notifications"
                    }
                    type="button"
                    onClick={requestBrowserNotifications}
                  >
                    {notificationPermission === "granted" ? "ALRT" : "ASK"}
                  </button>
                </div>

                <input
                  className="msg-search"
                  placeholder="Search messages..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />

                {error ? <div className="msg-banner">{error}</div> : null}
              </div>

              <div className="msg-thread-list">
                {loadingThreads ? (
                  <div className="msg-empty">Loading conversations...</div>
                ) : filteredThreads.length === 0 ? (
                  <div className="msg-empty">No conversations yet.</div>
                ) : (
                  filteredThreads.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={"msg-thread " + (t.id === activeId ? "is-active" : "")}
                      onClick={() => selectThread(t.id)}
                    >
                      <img
                        className="msg-thread-avatar"
                        src={t.listingPhoto || t.avatar}
                        alt={t.name}
                      />
                      <div className="msg-thread-body">
                        <div className="msg-thread-top">
                          <div className="msg-thread-name">{t.name}</div>
                          <div className="msg-thread-time">{formatTime(t.lastTime)}</div>
                        </div>
                        <div className="msg-thread-preview">{t.lastMessage}</div>
                      </div>

                      {t.unread > 0 && <div className="msg-unread">{t.unread}</div>}
                    </button>
                  ))
                )}
              </div>

              <div className="msg-suggest">
                <div className="msg-suggest-title">Listings You May Be Interested In</div>
                {loadingSuggestions ? (
                  <div className="msg-suggest-empty">Loading suggestions...</div>
                ) : suggestedListings.length === 0 ? (
                  <div className="msg-suggest-empty">No suggestions right now.</div>
                ) : (
                  <div className="msg-suggest-list">
                    {suggestedListings.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="msg-suggest-item"
                        onClick={() => openListingDetails(item.id)}
                      >
                        <img
                          src={
                            item.imageUrl ||
                            item.photo_url ||
                            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&fit=crop"
                          }
                          alt={item.title || "Listing"}
                        />
                        <div className="msg-suggest-body">
                          <div className="msg-suggest-name">{item.title || "Listing"}</div>
                          <div className="msg-suggest-meta">
                            {item.city || "Unknown"} • {item.currency || "USD"}{" "}
                            {Number(item.price_monthly || 0).toLocaleString()}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <section className="msg-chat">
              {!activeThread ? (
                <div className="msg-empty">Select a conversation</div>
              ) : (
                <>
                  <div className="msg-chat-header">
                    <div className="msg-chat-user">
                      <img
                        className="msg-chat-avatar"
                        src={activeThread.listingPhoto || activeThread.avatar}
                        alt={activeThread.name}
                      />
                      <div>
                        <div className="msg-chat-name">{activeThread.name}</div>
                        <div className="msg-chat-sub">{activeThread.role}</div>
                      </div>
                    </div>

                    <div className="msg-chat-actions">
                      <div
                        className={
                          "msg-status-chip " +
                          (hasActiveContact
                            ? activeContactOnline
                              ? "is-online"
                              : "is-offline"
                            : "is-unknown")
                        }
                      >
                        {hasActiveContact ? (activeContactOnline ? "ONLINE" : "OFFLINE") : "UNKNOWN"}
                      </div>
                    </div>
                  </div>

                  <div className="msg-chat-body">
                    {loadingMessages ? (
                      <div className="msg-empty">Loading messages...</div>
                    ) : messages.length === 0 ? (
                      <div className="msg-empty">No messages in this conversation yet.</div>
                    ) : (
                      messages.map((m) => (
                        <div key={m.id} className={"msg-row " + (m.sender === "me" ? "me" : "them")}>
                          {m.sender === "them" && (
                            <img
                              className="msg-bubble-avatar"
                              src={activeThread.contactAvatar || activeThread.avatar}
                              alt={activeThread.contactName || "User"}
                            />
                          )}

                          <div className={"msg-bubble " + m.sender}>
                            {m.sender === "me" && !m.deletedAt ? (
                              <div className="msg-bubble-actions">
                                <button
                                  type="button"
                                  className={"msg-menu-trigger " + (openMenuMessageId === m.id ? "is-open" : "")}
                                  onClick={() => toggleMessageMenu(m.id)}
                                  aria-label="Message options"
                                >
                                  v
                                </button>
                                {openMenuMessageId === m.id ? (
                                  <div className="msg-menu">
                                    <button
                                      type="button"
                                      className="msg-menu-item"
                                      onClick={() => beginEditMessage(m)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="msg-menu-item"
                                      onClick={() => openForwardModal(m)}
                                    >
                                      Forward
                                    </button>
                                    <button
                                      type="button"
                                      className="msg-menu-item danger"
                                      onClick={() => deleteMessage(m)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {editingMessageId === m.id ? (
                              <div className="msg-edit-wrap">
                                <textarea
                                  className="msg-edit-input"
                                  value={editingDraft}
                                  onChange={(e) => setEditingDraft(e.target.value)}
                                  rows={3}
                                />
                                <div className="msg-edit-actions">
                                  <button
                                    type="button"
                                    className="msg-edit-btn"
                                    onClick={() => saveEditedMessage(m)}
                                    disabled={savingEditId === m.id || !editingDraft.trim()}
                                  >
                                    {savingEditId === m.id ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    className="msg-edit-btn ghost"
                                    onClick={cancelEditMessage}
                                    disabled={savingEditId === m.id}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                            <div className="msg-text">
                              {(m.deletedAt ? "[Message deleted]" : m.text).split("\n").map((line, idx) => (
                                <div key={idx}>{line}</div>
                              ))}
                            </div>
                            <div className="msg-meta-row">
                              <div className="msg-meta">
                                {formatTime(m.ts)}
                                {m.editedAt ? " (edited)" : ""}
                              </div>
                            </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <div className="msg-composer">
                    <div className="msg-input-wrap">
                      <input
                        ref={composerInputRef}
                        className="msg-input"
                        placeholder="Type a message..."
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendMessage();
                        }}
                      />
                      <button className="msg-drop-btn" type="button" title="Conversation">
                        #
                      </button>
                    </div>

                    <button
                      className="msg-send-btn"
                      type="button"
                      onClick={sendMessage}
                      disabled={sending || !draft.trim() || !activeId}
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>

      {toastItems.length > 0 ? (
        <div className="msg-toast-stack">
          {toastItems.map((toast) => (
            <button
              key={toast.id}
              type="button"
              className="msg-toast"
              onClick={() => openToastConversation(toast)}
            >
              <div className="msg-toast-title">{toast.title}</div>
              <div className="msg-toast-body">{toast.body}</div>
            </button>
          ))}
        </div>
      ) : null}

      {forwardSourceMessage ? (
        <div className="msg-forward-backdrop" onClick={closeForwardModal}>
          <div className="msg-forward-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Forward Message</h3>
            <p>Select a conversation to forward this message.</p>
            <div className="msg-forward-preview">{forwardSourceMessage.text}</div>

            <input
              className="msg-forward-search"
              placeholder="Search conversations..."
              value={forwardQuery}
              onChange={(e) => setForwardQuery(e.target.value)}
            />

            <div className="msg-forward-list">
              {forwardTargets.length === 0 ? (
                <div className="msg-forward-empty">No other conversations found.</div>
              ) : (
                forwardTargets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={"msg-forward-item " + (forwardTargetId === t.id ? "is-selected" : "")}
                    onClick={() => setForwardTargetId(t.id)}
                  >
                    <img src={t.listingPhoto || t.avatar} alt={t.name} />
                    <div>
                      <div className="msg-forward-name">{t.name}</div>
                      <div className="msg-forward-sub">{t.contactName}</div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="msg-forward-actions">
              <button type="button" className="msg-forward-btn ghost" onClick={pasteForwardToComposer}>
                Paste Here
              </button>
              <button type="button" className="msg-forward-btn ghost" onClick={closeForwardModal} disabled={forwarding}>
                Cancel
              </button>
              <button
                type="button"
                className="msg-forward-btn"
                onClick={confirmForwardMessage}
                disabled={!forwardTargetId || forwarding}
              >
                {forwarding ? "Forwarding..." : "Forward"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
