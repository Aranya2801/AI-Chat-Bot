import { useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";
import Message from "./Message";
import InputBar from "./InputBar";
import WelcomeScreen from "./WelcomeScreen";

export default function ChatWindow() {
  const { activeConversation, isStreaming, error, dispatch, regenerate, editMessage } = useChat();
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);

  const messages = activeConversation?.messages ?? [];
  const lastContent = messages[messages.length - 1]?.content;

  // Only auto-scroll if the user is already near the bottom. The old version
  // called scrollIntoView on every token, so you couldn't scroll up to read
  // while a long answer was coming in.
  const onScroll = () => {
    const el = scrollRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, lastContent]);

  useEffect(() => {
    stickToBottom.current = true;
  }, [activeConversation?.id]);

  return (
    <main className="chat-window">
      <div className="messages-container" ref={scrollRef} onScroll={onScroll}>
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="messages-inner">
            {messages.map((m, i) => (
              <Message
                key={m.id}
                message={m}
                isLast={i === messages.length - 1}
                canAct={!isStreaming}
                onRegenerate={regenerate}
                onEdit={editMessage}
              />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={() => dispatch({ type: "error/clear" })} aria-label="Dismiss">×</button>
        </div>
      )}

      <InputBar />
    </main>
  );
}
