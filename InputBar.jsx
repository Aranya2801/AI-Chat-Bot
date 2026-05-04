import { useState, useRef, useCallback } from "react";
import { useChat } from "../context/ChatContext";

export default function InputBar() {
  const { submitMessage, isLoading, newConversation, activeConversationId } = useChat();
  const [input, setInput] = useState("");
  const [rows, setRows] = useState(1);
  const textareaRef = useRef(null);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    if (!activeConversationId) newConversation();
    setInput("");
    setRows(1);
    await submitMessage(text);
  }, [input, isLoading, submitMessage, newConversation, activeConversationId]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e) => {
    setInput(e.target.value);
    const lineCount = e.target.value.split("\n").length;
    setRows(Math.min(lineCount, 6));
  };

  const suggestions = [
    "Explain quantum computing simply",
    "Write a Python web scraper",
    "Summarize the latest AI trends",
    "Help me debug this code",
  ];

  return (
    <div className="input-area">
      {!activeConversationId && (
        <div className="suggestions">
          {suggestions.map((s) => (
            <button
              key={s}
              className="suggestion-chip"
              onClick={() => setInput(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="input-bar">
        <textarea
          ref={textareaRef}
          className="input-textarea"
          placeholder="Message AI Chat Bot... (Shift+Enter for new line)"
          value={input}
          rows={rows}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        <div className="input-actions">
          <button
            className="send-btn"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            title="Send message"
          >
            {isLoading ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
                <circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <p className="input-disclaimer">
        AI Chat Bot can make mistakes. Consider checking important information.
      </p>
    </div>
  );
}
