import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useChat } from "../context/ChatContext";
import { fetchModels } from "../api/chatApi";
import Icon from "./Icon";

// used if the server can't list models (e.g. some proxies don't implement /models)
const FALLBACK_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "llama3.1", "qwen2.5"];

export default function Header({ onToggleSidebar, onOpenSettings }) {
  const { theme, toggleTheme } = useTheme();
  const { settings, updateSettings, isStreaming } = useChat();
  const [models, setModels] = useState(FALLBACK_MODELS);

  useEffect(() => {
    fetchModels().then((list) => list && setModels(list));
  }, []);

  // keep the selected model in the list even if the server doesn't report it
  const options = models.includes(settings.model) ? models : [settings.model, ...models];

  return (
    <header className="header">
      <div className="header-left">
        <button className="icon-btn" onClick={onToggleSidebar} title="Toggle sidebar" aria-label="Toggle sidebar">
          <Icon name="menu" size={18} />
        </button>
        <span className="logo">AI Chat Bot</span>
      </div>

      <select
        className="model-select"
        value={settings.model}
        disabled={isStreaming}
        onChange={(e) => updateSettings({ model: e.target.value })}
        aria-label="Model"
      >
        {options.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <div className="header-right">
        <button className="icon-btn" onClick={onOpenSettings} title="Settings" aria-label="Settings">
          <Icon name="settings" size={18} />
        </button>
        <button className="icon-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
          <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
        </button>
        <a className="icon-btn" href="https://github.com/Aranya2801/AI-Chat-Bot" target="_blank" rel="noreferrer" title="Source on GitHub">
          <Icon name="github" size={18} />
        </a>
      </div>
    </header>
  );
}
