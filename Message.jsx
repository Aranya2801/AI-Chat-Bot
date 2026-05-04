import { useState } from "react";
import { marked } from "marked";
import hljs from "highlight.js";

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: (code, lang) => {
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: "hljs language-",
  breaks: true,
  gfm: true,
});

export default function Message({ message }) {
  const [copied, setCopied] = useState(false);

  const isUser = message.role === "user";
  const html = isUser ? null : marked.parse(message.content || "");

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`message message--${isUser ? "user" : "assistant"}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="avatar avatar--user">A</div>
        ) : (
          <div className="avatar avatar--bot">✦</div>
        )}
      </div>

      <div className="message-body">
        <div className="message-meta">
          <span className="message-role">{isUser ? "You" : "AI Assistant"}</span>
          <span className="message-time">{time}</span>
        </div>

        <div className="message-content">
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>

        {!isUser && message.content && (
          <div className="message-actions">
            <button className="action-btn" onClick={handleCopy}>
              {copied ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
