/**
 * chatApi.js
 * Handles communication with OpenAI-compatible APIs.
 * Supports streaming responses via Server-Sent Events.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://api.openai.com/v1";
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";

/**
 * Sends a chat message and streams the response.
 * @param {Object} params
 * @param {Function} onChunk - Called with accumulated content on each chunk
 */
export async function sendMessage(
  { messages, model, systemPrompt, temperature, maxTokens },
  onChunk
) {
  const payload = {
    model,
    stream: true,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  };

  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || `API error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

    for (const line of lines) {
      const data = line.slice(6).trim();
      if (data === "[DONE]") return accumulated;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content || "";
        accumulated += delta;
        onChunk(accumulated);
      } catch {
        // skip malformed chunks
      }
    }
  }

  return accumulated;
}

/**
 * Fetch available models from the API.
 */
export async function fetchModels() {
  try {
    const res = await fetch(`${API_BASE}/models`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (!res.ok) throw new Error("Failed to fetch models");
    const data = await res.json();
    return data.data
      ?.filter((m) => m.id.includes("gpt"))
      .map((m) => m.id)
      .sort() || [];
  } catch {
    return ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"];
  }
}

/**
 * Generate a title for a conversation using the API.
 */
export async function generateTitle(messages) {
  try {
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        max_tokens: 10,
        messages: [
          ...messages.slice(0, 2),
          {
            role: "user",
            content:
              "Generate a short 4-word title for this conversation. Only output the title, no punctuation.",
          },
        ],
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "New Chat";
  } catch {
    return "New Chat";
  }
}
