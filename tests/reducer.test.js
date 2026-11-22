import { describe, it, expect } from "vitest";
import { chatReducer, initialState } from "../src/context/chatReducer.js";

const now = "2026-01-01T00:00:00.000Z";
const msg = (id, role, content = "hi") => ({ id, role, content, timestamp: now });

function withTwoChats() {
  let s = chatReducer(initialState, { type: "conversation/create", id: "a", now });
  s = chatReducer(s, { type: "conversation/create", id: "b", now });
  return s; // active = b, order = [b, a]
}

describe("chatReducer", () => {
  it("titles a chat from its first user message", () => {
    let s = chatReducer(initialState, { type: "conversation/create", id: "a", now });
    s = chatReducer(s, { type: "message/add", conversationId: "a", message: msg("1", "user", "How do transformers handle long context windows in practice?") });
    expect(s.conversations[0].title.length).toBeLessThanOrEqual(42);
    expect(s.conversations[0].title.endsWith("…")).toBe(true);
  });

  // v1 bug: streamed tokens went to whichever chat was selected
  it("patches the right conversation even after switching", () => {
    let s = withTwoChats();
    s = chatReducer(s, { type: "message/add", conversationId: "b", message: msg("m1", "assistant", "") });
    s = chatReducer(s, { type: "conversation/select", id: "a" });
    s = chatReducer(s, { type: "message/patch", conversationId: "b", messageId: "m1", patch: { content: "streamed" } });
    expect(s.conversations.find((c) => c.id === "b").messages[0].content).toBe("streamed");
    expect(s.conversations.find((c) => c.id === "a").messages).toHaveLength(0);
  });

  // v1 bug: could re-select the chat that was just deleted
  it("picks a remaining chat when the active one is deleted", () => {
    let s = withTwoChats();
    s = chatReducer(s, { type: "conversation/delete", id: "b" });
    expect(s.activeId).toBe("a");
    s = chatReducer(s, { type: "conversation/delete", id: "a" });
    expect(s.activeId).toBeNull();
  });

  it("truncates after a message (used for regenerate / edit)", () => {
    let s = chatReducer(initialState, { type: "conversation/create", id: "a", now });
    for (const [id, role] of [["1", "user"], ["2", "assistant"], ["3", "user"], ["4", "assistant"]]) {
      s = chatReducer(s, { type: "message/add", conversationId: "a", message: msg(id, role) });
    }
    s = chatReducer(s, { type: "message/truncateAfter", conversationId: "a", messageId: "3" });
    expect(s.conversations[0].messages.map((m) => m.id)).toEqual(["1", "2", "3"]);
  });

  it("merges settings", () => {
    const s = chatReducer(initialState, { type: "settings/update", patch: { temperature: 0.2 } });
    expect(s.settings.temperature).toBe(0.2);
    expect(s.settings.model).toBe(initialState.settings.model);
  });
});
