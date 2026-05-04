import { useChat } from "../context/ChatContext";

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: "Multi-Model Support",
    desc: "Switch between GPT-4o, GPT-4 Turbo, and more",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: "Code Assistant",
    desc: "Syntax highlighting for 100+ programming languages",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Chat History",
    desc: "All conversations saved locally and organized",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
    title: "Streaming Responses",
    desc: "Real-time token-by-token streaming output",
  },
];

export default function WelcomeScreen() {
  const { submitMessage, newConversation } = useChat();

  const prompts = [
    "What can you help me with today?",
    "Write me a Python function to sort a list",
    "Explain machine learning in simple terms",
    "Help me draft a professional email",
  ];

  return (
    <div className="welcome-screen">
      <div className="welcome-hero">
        <div className="welcome-logo">✦</div>
        <h1 className="welcome-title">AI Chat Bot</h1>
        <p className="welcome-subtitle">
          Your intelligent AI assistant powered by GPT-4o — ask anything, code anything, create anything.
        </p>
      </div>

      <div className="features-grid">
        {features.map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="prompt-suggestions">
        <p className="suggestions-label">Try asking:</p>
        <div className="prompt-grid">
          {prompts.map((p) => (
            <button
              key={p}
              className="prompt-card"
              onClick={() => {
                newConversation();
                submitMessage(p);
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
