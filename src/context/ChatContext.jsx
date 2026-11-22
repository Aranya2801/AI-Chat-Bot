import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { streamChat, embed, embedMany } from "../api/chatApi";
import { chatReducer, initialState, newId, DEFAULT_SETTINGS } from "./chatReducer";
import { loadState, saveState } from "../lib/storage";
import { chunkText, hybridRetrieve, buildContextPrompt } from "../lib/rag";

const ChatContext = createContext(null);

function hydrate() {
  const saved = loadState();
  if (!saved) return initialState;
  return {
    ...initialState,
    conversations: saved.conversations ?? [],
    activeId: saved.activeId ?? null,
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
  };
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, undefined, hydrate);
  const [documents, setDocuments] = useState([]); // { id, name, status, chunks: [{text, vector}], error? }

  // Async callbacks below read from this ref instead of closing over `state`.
  // The old submitMessage depended on [state], so it was recreated on every token
  // and still read stale values partway through a stream.
  const stateRef = useRef(state);
  stateRef.current = state;
  const docsRef = useRef(documents);
  docsRef.current = documents;
  const abortRef = useRef(null);

  // persist, but not on every streamed token: wait until things settle a bit
  useEffect(() => {
    if (state.streamingId) return;
    const t = setTimeout(() => {
      saveState({ conversations: state.conversations, activeId: state.activeId, settings: state.settings });
    }, 300);
    return () => clearTimeout(t);
  }, [state.conversations, state.activeId, state.settings, state.streamingId]);

  const activeConversation = useMemo(
    () => state.conversations.find((c) => c.id === state.activeId) ?? null,
    [state.conversations, state.activeId]
  );

  const newConversation = useCallback(() => {
    const id = newId();
    dispatch({ type: "conversation/create", id, now: new Date().toISOString() });
    return id;
  }, []);

  /**
   * Core of the app: given a conversation whose last message is from the user,
   * (optionally) retrieve document context, then stream the assistant reply.
   */
  const runAssistant = useCallback(async (conversationId, history) => {
    const { settings } = stateRef.current;
    const assistantId = newId();
    dispatch({
      type: "message/add",
      conversationId,
      message: { id: assistantId, role: "assistant", content: "", pending: true, model: settings.model, timestamp: new Date().toISOString() },
    });
    dispatch({ type: "stream/start", conversationId });

    const controller = new AbortController();
    abortRef.current = controller;

    // batch token updates to one per animation frame. Dispatching on every
    // token made long answers stutter because markdown was re-parsed each time.
    let latest = "";
    let frame = null;
    const flush = () => {
      frame = null;
      dispatch({ type: "message/patch", conversationId, messageId: assistantId, patch: { content: latest } });
    };

    try {
      const apiMessages = [{ role: "system", content: settings.systemPrompt }];

      const readyChunks = docsRef.current.filter((d) => d.status === "ready").flatMap((d) => d.chunks);
      if (settings.useDocuments && readyChunks.length) {
        const question = history[history.length - 1].content;
        const canEmbed = settings.retrievalMode !== "bm25" && readyChunks.every((c) => c.vector);
        const qVec = canEmbed ? (await embed([question]))[0] : null;
        const hits = hybridRetrieve(question, qVec, readyChunks, { k: settings.topK, mode: settings.retrievalMode });
        const context = buildContextPrompt(hits);
        if (context) {
          apiMessages.push({ role: "system", content: context });
          dispatch({
            type: "message/patch",
            conversationId,
            messageId: assistantId,
            patch: { sources: hits.map((h) => ({ docName: h.docName, text: h.text, score: Number(h.score.toFixed(3)) })) },
          });
        }
      }

      apiMessages.push(...history.filter((m) => !m.error && m.content).map(({ role, content }) => ({ role, content })));

      const { content, stats } = await streamChat(
        {
          model: settings.model,
          messages: apiMessages,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          signal: controller.signal,
        },
        (text) => {
          latest = text;
          if (frame === null) frame = requestAnimationFrame(flush);
        }
      );
      if (frame !== null) cancelAnimationFrame(frame);
      dispatch({ type: "message/patch", conversationId, messageId: assistantId, patch: { content, stats, pending: false } });
    } catch (err) {
      if (frame !== null) cancelAnimationFrame(frame);
      if (err.name === "AbortError") {
        dispatch({ type: "message/patch", conversationId, messageId: assistantId, patch: { content: latest, pending: false, stopped: true } });
      } else {
        dispatch({ type: "message/patch", conversationId, messageId: assistantId, patch: { content: latest, pending: false, error: err.message } });
        dispatch({ type: "error/set", error: err.message });
      }
    } finally {
      abortRef.current = null;
      dispatch({ type: "stream/end" });
    }
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const content = text.trim();
      if (!content || stateRef.current.streamingId) return;

      // create the conversation here, once. Before, both InputBar and
      // submitMessage created one, so the first message made two chats.
      const conversationId = stateRef.current.activeId ?? newConversation();
      const prior = stateRef.current.conversations.find((c) => c.id === conversationId)?.messages ?? [];
      const userMsg = { id: newId(), role: "user", content, timestamp: new Date().toISOString() };
      dispatch({ type: "message/add", conversationId, message: userMsg });
      await runAssistant(conversationId, [...prior, userMsg]);
    },
    [newConversation, runAssistant]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const regenerate = useCallback(async () => {
    const { activeId, conversations, streamingId } = stateRef.current;
    if (!activeId || streamingId) return;
    const convo = conversations.find((c) => c.id === activeId);
    const lastUserIdx = convo?.messages.findLastIndex((m) => m.role === "user") ?? -1;
    if (lastUserIdx === -1) return;
    const lastUser = convo.messages[lastUserIdx];
    dispatch({ type: "message/truncateAfter", conversationId: activeId, messageId: lastUser.id });
    await runAssistant(activeId, convo.messages.slice(0, lastUserIdx + 1));
  }, [runAssistant]);

  const editMessage = useCallback(
    async (messageId, newText) => {
      const { activeId, conversations, streamingId } = stateRef.current;
      if (!activeId || streamingId || !newText.trim()) return;
      const convo = conversations.find((c) => c.id === activeId);
      const idx = convo.messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;
      const edited = { ...convo.messages[idx], content: newText.trim() };
      dispatch({ type: "message/patch", conversationId: activeId, messageId, patch: { content: edited.content } });
      dispatch({ type: "message/truncateAfter", conversationId: activeId, messageId });
      await runAssistant(activeId, [...convo.messages.slice(0, idx), edited]);
    },
    [runAssistant]
  );

  const addDocuments = useCallback(async (files) => {
    for (const file of files) {
      const id = newId();
      setDocuments((d) => [...d, { id, name: file.name, status: "indexing", chunks: [] }]);
      try {
        const text = await file.text();
        const pieces = chunkText(text);
        if (!pieces.length) throw new Error("file is empty");
        // if the provider has no embeddings endpoint, keep the doc anyway and use keyword search
        let vectors = null;
        let warning = null;
        try {
          vectors = await embedMany(pieces);
        } catch (err) {
          warning = `embeddings unavailable (${err.message}), using keyword search`;
        }
        const chunks = pieces.map((t, i) => ({ id: `${id}:${i}`, docName: file.name, text: t, vector: vectors?.[i] ?? null }));
        setDocuments((d) => d.map((doc) => (doc.id === id ? { ...doc, status: "ready", chunks, warning } : doc)));
      } catch (err) {
        setDocuments((d) => d.map((doc) => (doc.id === id ? { ...doc, status: "error", error: err.message } : doc)));
      }
    }
  }, []);

  const removeDocument = useCallback((id) => setDocuments((d) => d.filter((doc) => doc.id !== id)), []);

  const value = {
    ...state,
    isStreaming: Boolean(state.streamingId),
    activeConversation,
    documents,
    dispatch,
    newConversation,
    selectConversation: (id) => dispatch({ type: "conversation/select", id }),
    deleteConversation: (id) => dispatch({ type: "conversation/delete", id }),
    renameConversation: (id, title) => dispatch({ type: "conversation/rename", id, title }),
    updateSettings: (patch) => dispatch({ type: "settings/update", patch }),
    sendMessage,
    stop,
    regenerate,
    editMessage,
    addDocuments,
    removeDocument,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside <ChatProvider>");
  return ctx;
}
