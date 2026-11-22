import { memo, useMemo, useState } from "react";
import { renderMarkdown, decorateCitations } from "../lib/markdown";
import Icon from "./Icon";

function Message({ message, isLast, canAct, onRegenerate, onEdit }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [showSources, setShowSources] = useState(false);

  const isUser = message.role === "user";
  const sourceCount = message.sources?.length ?? 0;

  const html = useMemo(
    () => (isUser ? null : decorateCitations(renderMarkdown(message.content), sourceCount)),
    [isUser, message.content, sourceCount]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked on http:// */
    }
  };

  const saveEdit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== message.content) onEdit(message.id, draft);
  };

  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`message message--${isUser ? "user" : "assistant"}`}>
      <div className={`avatar avatar--${isUser ? "user" : "bot"}`}>{isUser ? "You" : "AI"}</div>

      <div className="message-body">
        <div className="message-meta">
          <span className="message-role">{isUser ? "You" : message.model || "Assistant"}</span>
          <span className="message-time">{time}</span>
        </div>

        {editing ? (
          <div className="edit-box">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={Math.min(8, draft.split("\n").length + 1)} autoFocus />
            <div className="edit-actions">
              <button className="btn btn--ghost" onClick={() => { setEditing(false); setDraft(message.content); }}>Cancel</button>
              <button className="btn" onClick={saveEdit}>Save &amp; resend</button>
            </div>
          </div>
        ) : (
          <div className="message-content">
            {isUser ? (
              <p className="user-text">{message.content}</p>
            ) : message.pending && !message.content ? (
              <div className="typing-indicator" aria-label="Assistant is typing"><span /><span /><span /></div>
            ) : (
              <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </div>
        )}

        {message.error && <div className="message-error">⚠ {message.error}</div>}
        {message.stopped && <div className="message-note">stopped</div>}

        {sourceCount > 0 && (
          <div className="sources">
            <button className="sources-toggle" onClick={() => setShowSources((s) => !s)}>
              {showSources ? "Hide" : "Show"} {sourceCount} source{sourceCount > 1 ? "s" : ""}
            </button>
            {showSources && (
              <ol className="sources-list">
                {message.sources.map((s, i) => (
                  <li key={i}>
                    <div className="source-head">
                      <strong>{s.docName}</strong>
                      <span className="source-score">sim {s.score}</span>
                    </div>
                    <p>{s.text.length > 320 ? s.text.slice(0, 320) + "…" : s.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {!message.pending && !editing && (
          <div className="message-actions">
            {message.content && (
              <button className="action-btn" onClick={copy} title="Copy">
                <Icon name={copied ? "check" : "copy"} size={13} /> {copied ? "Copied" : "Copy"}
              </button>
            )}
            {isUser && canAct && (
              <button className="action-btn" onClick={() => setEditing(true)} title="Edit and resend">
                <Icon name="edit" size={13} /> Edit
              </button>
            )}
            {!isUser && isLast && canAct && (
              <button className="action-btn" onClick={onRegenerate} title="Regenerate">
                <Icon name="refresh" size={13} /> Retry
              </button>
            )}
            {message.stats && <Stats stats={message.stats} />}
          </div>
        )}
      </div>
    </div>
  );
}

function Stats({ stats }) {
  // ~4 chars per token is the usual rough estimate for English text
  const approxTokens = Math.round(stats.chars / 4);
  const genSeconds = (stats.totalMs - (stats.ttftMs ?? 0)) / 1000;
  const tps = genSeconds > 0 ? Math.round(approxTokens / genSeconds) : null;
  return (
    <span className="stats" title="Time to first token · total time · approx. tokens/sec">
      {stats.ttftMs != null && `${stats.ttftMs} ms first token · `}
      {(stats.totalMs / 1000).toFixed(1)} s{tps ? ` · ~${tps} tok/s` : ""}
    </span>
  );
}

export default memo(Message);
