import { useEffect } from "react";
import { useChat } from "../context/ChatContext";
import { DEFAULT_SETTINGS } from "../context/chatReducer";
import { clearState } from "../lib/storage";

// v1 had temperature / max tokens / system prompt in state but no way to change them.
export default function SettingsModal({ open, onClose }) {
  const { settings, updateSettings, dispatch } = useChat();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const wipe = () => {
    if (!confirm("Delete all conversations? This can't be undone.")) return;
    dispatch({ type: "conversation/clearAll" });
    clearState();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <label className="field">
          <span>Model (any id your provider accepts)</span>
          <input value={settings.model} onChange={(e) => updateSettings({ model: e.target.value })} />
        </label>

        <label className="field">
          <span>System prompt</span>
          <textarea rows={4} value={settings.systemPrompt} onChange={(e) => updateSettings({ systemPrompt: e.target.value })} />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Temperature <b>{settings.temperature.toFixed(1)}</b></span>
            <input type="range" min="0" max="2" step="0.1" value={settings.temperature}
              onChange={(e) => updateSettings({ temperature: Number(e.target.value) })} />
          </label>
          <label className="field">
            <span>Max tokens</span>
            <input type="number" min="64" max="8192" step="64" value={settings.maxTokens}
              onChange={(e) => updateSettings({ maxTokens: Number(e.target.value) || DEFAULT_SETTINGS.maxTokens })} />
          </label>
        </div>

        <h3>Document retrieval</h3>
        <div className="field-row">
          <label className="field field--check">
            <input type="checkbox" checked={settings.useDocuments} onChange={(e) => updateSettings({ useDocuments: e.target.checked })} />
            <span>Search uploaded documents</span>
          </label>
          <label className="field">
            <span>Method</span>
            <select value={settings.retrievalMode} onChange={(e) => updateSettings({ retrievalMode: e.target.value })}>
              <option value="hybrid">Hybrid (embeddings + BM25)</option>
              <option value="dense">Embeddings only</option>
              <option value="bm25">Keyword (BM25) only</option>
            </select>
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Chunks per question (k) <b>{settings.topK}</b></span>
            <input type="range" min="1" max="10" value={settings.topK} onChange={(e) => updateSettings({ topK: Number(e.target.value) })} />
          </label>
        </div>

        <div className="modal-foot">
          <button className="btn btn--ghost" onClick={() => updateSettings(DEFAULT_SETTINGS)}>Reset to defaults</button>
          <button className="btn btn--danger" onClick={wipe}>Delete all chats</button>
        </div>
      </div>
    </div>
  );
}
