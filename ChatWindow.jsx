import { useRef, useEffect } from "react";
import { useChat } from "../context/ChatContext";
import Message from "./Message";
import InputBar from "./InputBar";
import WelcomeScreen from "./WelcomeScreen";

export default function ChatWindow() {
  const { activeConversation, isLoading } = useChat();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  const messages = activeConversation?.messages ?? [];

  return (
    <main className="chat-window">
      <div className="messages-container">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          messages.map((msg) => <Message key={msg.id} message={msg} />)
        )}

        {isLoading && messages[messages.length - 1]?.content === "" && (
          <div className="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <InputBar />
    </main>
  );
}
