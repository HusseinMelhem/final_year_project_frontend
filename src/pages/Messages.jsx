import React, { useMemo, useRef, useState, useEffect } from "react";
import "./Messages.css";

function formatTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function Messages() {
  // ✅ stable value, created once
  const [now] = useState(() => Date.now());

  // ✅ demo data derived from a stable value (no impure calls during render)
  const initialThreads = useMemo(
    () => [
      {
        id: "t1",
        name: "Sarah Tenant",
        role: "Tenant",
        avatar:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
        lastMessage: "Hi Sarah, the apartment is still available...",
        lastTime: now - 1000 * 60 * 8,
        unread: 2,
        messages: [
          {
            id: "m1",
            sender: "them",
            text: "Hi Sarah, the apartment is still available.\nWould you like to schedule a viewing?",
            ts: now - 1000 * 60 * 20,
          },
          {
            id: "m2",
            sender: "me",
            text: "Yes, I'm interested! How about tomorrow afternoon?",
            ts: now - 1000 * 60 * 15,
          },
          {
            id: "m3",
            sender: "them",
            text: "Sounds good! Let's meet at 2 PM.",
            ts: now - 1000 * 60 * 10,
          },
        ],
      },
      {
        id: "t2",
        name: "Mike R.",
        role: "Tenant",
        avatar:
          "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=faces",
        lastMessage: "Is parking included?",
        lastTime: now - 1000 * 60 * 25,
        unread: 0,
        messages: [
          { id: "m1", sender: "them", text: "Hi! Is parking included?", ts: now - 1000 * 60 * 40 },
          { id: "m2", sender: "me", text: "Yes, there's one spot included.", ts: now - 1000 * 60 * 35 },
        ],
      },
      {
        id: "t3",
        name: "Lisa Jones",
        role: "Landlord",
        avatar:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces",
        lastMessage: "Thanks! I'll send the docs.",
        lastTime: now - 1000 * 60 * 70,
        unread: 1,
        messages: [
          { id: "m1", sender: "me", text: "Can you share the lease terms?", ts: now - 1000 * 60 * 90 },
          { id: "m2", sender: "them", text: "Thanks! I'll send the docs.", ts: now - 1000 * 60 * 70 },
        ],
      },
      {
        id: "t4",
        name: "David",
        role: "Tenant",
        avatar:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
        lastMessage: "Can we do a viewing on Saturday?",
        lastTime: now - 1000 * 60 * 140,
        unread: 0,
        messages: [
          { id: "m1", sender: "them", text: "Can we do a viewing on Saturday?", ts: now - 1000 * 60 * 140 },
        ],
      },
    ],
    [now]
  );

  // then keep the rest of your component exactly the same...
  const [threads, setThreads] = useState(initialThreads);
  const [activeId, setActiveId] = useState(initialThreads[0]?.id);
  const [folder, setFolder] = useState("Career Messages");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");

  const activeThread = threads.find((t) => t.id === activeId);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, activeThread?.messages?.length]);

  function selectThread(id) {
    setActiveId(id);
    // mark as read
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t))
    );
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text || !activeThread) return;

    const newMsg = {
      id: crypto.randomUUID?.() || String(Math.random()),
      sender: "me",
      text,
      ts: Date.now(),
    };

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== activeThread.id) return t;
        return {
          ...t,
          lastMessage: text,
          lastTime: Date.now(),
          messages: [...t.messages, newMsg],
        };
      })
    );

    setDraft("");
  }

  const filteredThreads = threads.filter((t) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.lastMessage.toLowerCase().includes(q) ||
      t.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="msg-page">
      <div className="msg-container">
        <div className="msg-shell">
          {/* LEFT SIDEBAR */}
          <aside className="msg-sidebar">
            <div className="msg-sidebar-top">
              <div className="msg-folder-row">
                <select
                  className="msg-select"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                >
                  <option>Career Messages</option>
                  <option>Rental Inquiries</option>
                  <option>Landlord Inbox</option>
                  <option>Archived</option>
                </select>

                <button className="msg-icon-btn" title="Search" type="button">
                  🔎
                </button>
              </div>

              <input
                className="msg-search"
                placeholder="Search messages..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="msg-thread-list">
              {filteredThreads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={
                    "msg-thread " + (t.id === activeId ? "is-active" : "")
                  }
                  onClick={() => selectThread(t.id)}
                >
                  <img className="msg-thread-avatar" src={t.avatar} alt="" />
                  <div className="msg-thread-body">
                    <div className="msg-thread-top">
                      <div className="msg-thread-name">{t.name}</div>
                      <div className="msg-thread-time">
                        {formatTime(t.lastTime)}
                      </div>
                    </div>
                    <div className="msg-thread-preview">{t.lastMessage}</div>
                  </div>

                  {t.unread > 0 && (
                    <div className="msg-unread">{t.unread}</div>
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* RIGHT CHAT */}
          <section className="msg-chat">
            {!activeThread ? (
              <div className="msg-empty">Select a conversation</div>
            ) : (
              <>
                <div className="msg-chat-header">
                  <div className="msg-chat-user">
                    <img
                      className="msg-chat-avatar"
                      src={activeThread.avatar}
                      alt=""
                    />
                    <div>
                      <div className="msg-chat-name">{activeThread.name}</div>
                      <div className="msg-chat-sub">{activeThread.role}</div>
                    </div>
                  </div>

                  <div className="msg-chat-actions">
                    <button className="msg-action-btn" type="button" title="Call">
                      📞
                    </button>
                    <button className="msg-action-btn" type="button" title="Info">
                      ℹ️
                    </button>
                    <button
                      className="msg-action-btn danger"
                      type="button"
                      title="Delete"
                    >
                      ✖
                    </button>
                  </div>
                </div>

                <div className="msg-chat-body">
                  {activeThread.messages.map((m) => (
                    <div
                      key={m.id}
                      className={"msg-row " + (m.sender === "me" ? "me" : "them")}
                    >
                      {m.sender === "them" && (
                        <img
                          className="msg-bubble-avatar"
                          src={activeThread.avatar}
                          alt=""
                        />
                      )}

                      <div className={"msg-bubble " + m.sender}>
                        <div className="msg-text">
                          {m.text.split("\n").map((line, idx) => (
                            <div key={idx}>{line}</div>
                          ))}
                        </div>
                        <div className="msg-meta">{formatTime(m.ts)}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <div className="msg-composer">
                  <div className="msg-input-wrap">
                    <input
                      className="msg-input"
                      placeholder="Type a message..."
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendMessage();
                      }}
                    />
                    <button className="msg-drop-btn" type="button" title="Options">
                      ▾
                    </button>
                  </div>

                  <button
                    className="msg-send-btn"
                    type="button"
                    onClick={sendMessage}
                    disabled={!draft.trim()}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
