import { createContext, useContext, useReducer, useCallback } from "react";
import { sendMessage } from "../api/chatApi";

const ChatContext = createContext();

const initialState = {
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  error: null,
  model: "gpt-4o",
  systemPrompt: "You are a helpful, knowledgeable, and friendly AI assistant.",
  temperature: 0.7,
  maxTokens: 2048,
};

function chatReducer(state, action) {
  switch (action.type) {
    case "NEW_CONVERSATION": {
      const id = Date.now().toString();
      return {
        ...state,
        conversations: [
          { id, title: "New Chat", messages: [], createdAt: new Date().toISOString() },
          ...state.conversations,
        ],
        activeConversationId: id,
      };
    }
    case "SELECT_CONVERSATION":
      return { ...state, activeConversationId: action.payload };
    case "DELETE_CONVERSATION":
      return {
        ...state,
        conversations: state.conversations.filter((c) => c.id !== action.payload),
        activeConversationId:
          state.activeConversationId === action.payload
            ? state.conversations[0]?.id ?? null
            : state.activeConversationId,
      };
    case "ADD_MESSAGE": {
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === state.activeConversationId
            ? {
                ...c,
                messages: [...c.messages, action.payload],
                title:
                  c.messages.length === 0 && action.payload.role === "user"
                    ? action.payload.content.slice(0, 40) + (action.payload.content.length > 40 ? "..." : "")
                    : c.title,
              }
            : c
        ),
      };
    }
    case "UPDATE_LAST_MESSAGE": {
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === state.activeConversationId
            ? {
                ...c,
                messages: c.messages.map((m, i) =>
                  i === c.messages.length - 1 ? { ...m, content: action.payload } : m
                ),
              }
            : c
        ),
      };
    }
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_MODEL":
      return { ...state, model: action.payload };
    case "SET_SYSTEM_PROMPT":
      return { ...state, systemPrompt: action.payload };
    case "SET_TEMPERATURE":
      return { ...state, temperature: action.payload };
    case "SET_MAX_TOKENS":
      return { ...state, maxTokens: action.payload };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const activeConversation = state.conversations.find(
    (c) => c.id === state.activeConversationId
  );

  const newConversation = useCallback(() => {
    dispatch({ type: "NEW_CONVERSATION" });
  }, []);

  const selectConversation = useCallback((id) => {
    dispatch({ type: "SELECT_CONVERSATION", payload: id });
  }, []);

  const deleteConversation = useCallback((id) => {
    dispatch({ type: "DELETE_CONVERSATION", payload: id });
  }, []);

  const submitMessage = useCallback(
    async (content) => {
      if (!state.activeConversationId) {
        dispatch({ type: "NEW_CONVERSATION" });
      }

      const userMessage = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: "ADD_MESSAGE", payload: userMessage });
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "CLEAR_ERROR" });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: "ADD_MESSAGE", payload: assistantMessage });

      try {
        const messages = [
          ...(activeConversation?.messages ?? []),
          userMessage,
        ].map(({ role, content }) => ({ role, content }));

        await sendMessage(
          {
            messages,
            model: state.model,
            systemPrompt: state.systemPrompt,
            temperature: state.temperature,
            maxTokens: state.maxTokens,
          },
          (chunk) => {
            dispatch({ type: "UPDATE_LAST_MESSAGE", payload: chunk });
          }
        );
      } catch (err) {
        dispatch({ type: "SET_ERROR", payload: err.message });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [state, activeConversation]
  );

  return (
    <ChatContext.Provider
      value={{
        ...state,
        activeConversation,
        newConversation,
        selectConversation,
        deleteConversation,
        submitMessage,
        dispatch,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
};
