import { useChat } from "../context/ChatContext";

const prompts = [
  "Explain the difference between precision and recall with an example",
  "Write a Python function that removes duplicates but keeps order",
  "Summarise the documents I uploaded in five bullet points",
  "What are the trade-offs of RAG vs fine-tuning?",
];

export default function WelcomeScreen() {
  const { sendMessage, settings, documents } = useChat();
  const hasDocs = documents.some((d) => d.status === "ready");

  return (
    <div className="welcome-screen">
      <h1 className="welcome-title">What do you want to work on?</h1>
      <p className="welcome-subtitle">
        Using <code>{settings.model}</code>.{" "}
        {hasDocs
          ? "Your uploaded documents will be searched for every question."
          : "Upload .txt / .md files in the sidebar to ask questions about them."}
      </p>
      <div className="prompt-grid">
        {prompts.map((p) => (
          <button key={p} className="prompt-card" onClick={() => sendMessage(p)}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
