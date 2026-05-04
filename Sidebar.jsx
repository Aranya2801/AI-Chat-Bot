import { useChat } from "../context/ChatContext";

export default function Sidebar({ isOpen }) {
  const {
    conversations,
    activeConversationId,
    newConversation,
    selectConversation,
    deleteConversation,
  } = useChat();

  const grouped = groupByDate(conversations);

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : "sidebar--closed"}`}>
      <div className="sidebar-top">
        <button className="new-chat-btn" onClick={newConversation}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>
      </div>

      <div className="conversation-list">
        {Object.entries(grouped).map(([label, convos]) => (
          <div key={label} className="conversation-group">
            <p className="group-label">{label}</p>
            {convos.map((c) => (
              <div
                key={c.id}
                className={`conversation-item ${c.id === activeConversationId ? "conversation-item--active" : ""}`}
                onClick={() => selectConversation(c.id)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="conversation-title">{c.title}</span>
                <button
                  className="delete-btn"
                  onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  title="Delete"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ))}

        {conversations.length === 0 && (
          <div className="empty-sidebar">
            <p>No conversations yet.</p>
            <p>Start a new chat!</p>
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>AI Chat Bot v2.0</span>
        </div>
      </div>
    </aside>
  );
}

function groupByDate(conversations) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const weekAgo = new Date(today - 7 * 86400000);

  const groups = { Today: [], Yesterday: [], "This Week": [], Older: [] };

  for (const c of conversations) {
    const d = new Date(c.createdAt);
    if (d >= today) groups.Today.push(c);
    else if (d >= yesterday) groups.Yesterday.push(c);
    else if (d >= weekAgo) groups["This Week"].push(c);
    else groups.Older.push(c);
  }

  return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length > 0));
}
