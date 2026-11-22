import { useMemo, useRef, useState } from "react";
import { useChat } from "../context/ChatContext";
import { conversationToMarkdown, download, slug } from "../lib/exportChat";
import Icon from "./Icon";

const ACCEPT = ".txt,.md,.markdown,.csv,.json,.py,.js,.ts,.java,.c,.cpp,.html,.css,.tex";

export default function Sidebar({ isOpen, onClose }) {
  const {
    conversations, activeId, newConversation, selectConversation, deleteConversation, renameConversation,
    documents, addDocuments, removeDocument,
  } = useChat();
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const fileRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, query]);

  const groups = groupByDate(filtered);

  const pick = (id) => {
    selectConversation(id);
    if (window.innerWidth < 768) onClose();
  };

  const onFiles = (e) => {
    const files = [...e.target.files];
    e.target.value = ""; // so picking the same file again still fires onChange
    if (files.length) addDocuments(files);
  };

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : "sidebar--closed"}`}>
      <div className="sidebar-top">
        <button className="new-chat-btn" onClick={() => { newConversation(); if (window.innerWidth < 768) onClose(); }}>
          <Icon name="plus" /> New chat
        </button>
        <input className="search-input" placeholder="Search chats" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="conversation-list">
        {groups.map(([label, items]) => (
          <div key={label} className="conversation-group">
            <p className="group-label">{label}</p>
            {items.map((c) => (
              <div
                key={c.id}
                className={`conversation-item ${c.id === activeId ? "conversation-item--active" : ""}`}
                onClick={() => pick(c.id)}
                onDoubleClick={() => setRenamingId(c.id)}
                title="Double-click to rename"
              >
                {renamingId === c.id ? (
                  <input
                    className="rename-input"
                    defaultValue={c.title}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => { renameConversation(c.id, e.target.value); setRenamingId(null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.target.blur();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                  />
                ) : (
                  <span className="conversation-title">{c.title}</span>
                )}
                <div className="item-actions">
                  <button
                    className="mini-btn"
                    title="Export as Markdown"
                    onClick={(e) => { e.stopPropagation(); download(`${slug(c.title)}.md`, conversationToMarkdown(c)); }}
                  >
                    <Icon name="download" size={12} />
                  </button>
                  <button
                    className="mini-btn"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (c.messages.length === 0 || confirm(`Delete "${c.title}"?`)) deleteConversation(c.id);
                    }}
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
        {conversations.length === 0 && <p className="empty-sidebar">No chats yet.</p>}
        {conversations.length > 0 && filtered.length === 0 && <p className="empty-sidebar">Nothing matches “{query}”.</p>}
      </div>

      <div className="docs-panel">
        <div className="docs-head">
          <span>Documents</span>
          <button className="mini-btn mini-btn--label" onClick={() => fileRef.current.click()}>
            <Icon name="plus" size={12} /> Add
          </button>
          <input ref={fileRef} type="file" multiple accept={ACCEPT} hidden onChange={onFiles} />
        </div>
        {documents.length === 0 ? (
          <p className="docs-hint">Add text files to ask questions about them. They stay in this tab only.</p>
        ) : (
          <ul className="docs-list">
            {documents.map((d) => (
              <li key={d.id} className={`doc doc--${d.status}`} title={d.error || d.warning || ""}>
                <Icon name="file" size={12} />
                <span className="doc-name">{d.name}</span>
                <span className="doc-status">
                  {d.status === "indexing" ? "indexing…" : d.status === "error" ? "failed" : `${d.chunks.length} chunks${d.warning ? " · keyword" : ""}`}
                </span>
                <button className="mini-btn" onClick={() => removeDocument(d.id)} title="Remove">
                  <Icon name="x" size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function groupByDate(conversations) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86_400_000;
  const buckets = [
    ["Today", startOfToday.getTime()],
    ["Yesterday", startOfToday.getTime() - day],
    ["Previous 7 days", startOfToday.getTime() - 7 * day],
    ["Older", -Infinity],
  ];
  const out = new Map(buckets.map(([label]) => [label, []]));
  // sort by last activity rather than creation, so an old chat you just used floats up
  const sorted = [...conversations].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  for (const c of sorted) {
    const t = new Date(c.updatedAt || c.createdAt).getTime();
    const [label] = buckets.find(([, min]) => t >= min);
    out.get(label).push(c);
  }
  return [...out].filter(([, items]) => items.length);
}
