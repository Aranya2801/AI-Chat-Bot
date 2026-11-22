// Pulled out of ChatContext so it can be unit tested without React.
//
// The main change from v1: every message action carries an explicit
// conversationId. Before, UPDATE_LAST_MESSAGE wrote to whatever chat was
// *currently selected*, so if you switched chats while a reply was streaming,
// the rest of the reply got appended to the wrong conversation.

export const DEFAULT_SETTINGS = {
  model: "gpt-4o-mini",
  systemPrompt: "You are a helpful assistant. Be concise and correct. Say when you are not sure.",
  temperature: 0.7,
  maxTokens: 2048,
  useDocuments: true,
  topK: 4,
  retrievalMode: "hybrid", // hybrid | dense | bm25
};

export const initialState = {
  conversations: [],
  activeId: null,
  streamingId: null, // conversation currently receiving tokens
  error: null,
  settings: DEFAULT_SETTINGS,
};

export const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function titleFrom(text) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 42 ? oneLine.slice(0, 40).trimEnd() + "…" : oneLine || "New chat";
}

function updateConversation(state, id, fn) {
  return {
    ...state,
    conversations: state.conversations.map((c) => (c.id === id ? fn(c) : c)),
  };
}

export function chatReducer(state, action) {
  switch (action.type) {
    case "conversation/create": {
      const convo = {
        id: action.id,
        title: "New chat",
        messages: [],
        createdAt: action.now,
        updatedAt: action.now,
      };
      return { ...state, conversations: [convo, ...state.conversations], activeId: convo.id };
    }

    case "conversation/select":
      return { ...state, activeId: action.id, error: null };

    case "conversation/delete": {
      const remaining = state.conversations.filter((c) => c.id !== action.id);
      // old code picked conversations[0] from *before* the filter, which could be
      // the chat that was just deleted
      const activeId = state.activeId === action.id ? (remaining[0]?.id ?? null) : state.activeId;
      return { ...state, conversations: remaining, activeId };
    }

    case "conversation/rename":
      return updateConversation(state, action.id, (c) => ({ ...c, title: action.title.trim() || c.title }));

    case "conversation/clearAll":
      return { ...state, conversations: [], activeId: null, streamingId: null };

    case "message/add":
      return updateConversation(state, action.conversationId, (c) => ({
        ...c,
        title: c.messages.length === 0 && action.message.role === "user" ? titleFrom(action.message.content) : c.title,
        messages: [...c.messages, action.message],
        updatedAt: action.message.timestamp,
      }));

    case "message/patch":
      return updateConversation(state, action.conversationId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === action.messageId ? { ...m, ...action.patch } : m)),
      }));

    // used by "regenerate" and "edit": drop everything after a given message
    case "message/truncateAfter":
      return updateConversation(state, action.conversationId, (c) => {
        const idx = c.messages.findIndex((m) => m.id === action.messageId);
        return idx === -1 ? c : { ...c, messages: c.messages.slice(0, idx + 1) };
      });

    case "stream/start":
      return { ...state, streamingId: action.conversationId, error: null };

    case "stream/end":
      return { ...state, streamingId: null };

    case "error/set":
      return { ...state, error: action.error };

    case "error/clear":
      return { ...state, error: null };

    case "settings/update":
      return { ...state, settings: { ...state.settings, ...action.patch } };

    default:
      return state;
  }
}
