import { useEffect, useRef, useState } from "react";
import { useChat } from "../context/ChatContext";
import Icon from "./Icon";

export default function InputBar() {
  const { sendMessage, stop, isStreaming, documents, settings, activeId } = useChat();
  const [input, setInput] = useState("");
  const ref = useRef(null);

  const readyDocs = documents.filter((d) => d.status === "ready").length;

  // grow with content up to ~8 lines. Counting "\n" (old approach) ignored
  // long lines that wrap, so the box never grew for a long paragraph.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  useEffect(() => {
    ref.current?.focus();
  }, [activeId]);

  const submit = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="input-area">
      {readyDocs > 0 && (
        <div className={`doc-pill ${settings.useDocuments ? "" : "doc-pill--off"}`}>
          <Icon name="file" size={12} />
          {settings.useDocuments
            ? `Answering from ${readyDocs} document${readyDocs > 1 ? "s" : ""}`
            : "Documents loaded but retrieval is off (see settings)"}
        </div>
      )}
      <div className="input-bar">
        <textarea
          ref={ref}
          className="input-textarea"
          placeholder="Send a message  (Shift+Enter for a new line)"
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {isStreaming ? (
          <button className="send-btn send-btn--stop" onClick={stop} title="Stop generating">
            <Icon name="stop" size={14} />
          </button>
        ) : (
          <button className="send-btn" onClick={submit} disabled={!input.trim()} title="Send">
            <Icon name="send" size={16} />
          </button>
        )}
      </div>
      <p className="input-disclaimer">Models make mistakes. Check anything important.</p>
    </div>
  );
}
