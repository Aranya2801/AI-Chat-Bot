// Incremental parser for the OpenAI-style SSE stream.
//
// Bug in the old version: it split every network chunk on "\n" and parsed each
// line straight away. A TCP read can stop halfway through a line, e.g.
//   read 1: 'data: {"choices":[{"delta":{"content":"Hel'
//   read 2: 'lo"}}]}\n\n'
// Both halves failed JSON.parse and were dropped silently, so words went missing
// from replies at random (it showed up more on slow connections). Now we keep a
// buffer and only parse complete lines.

export function createSSEParser(onEvent) {
  let buffer = "";

  return {
    push(text) {
      buffer += text;
      let nl;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).replace(/\r$/, "");
        buffer = buffer.slice(nl + 1);
        handleLine(line);
      }
    },
    // call once the stream closes in case the last line had no trailing newline
    flush() {
      if (buffer.trim()) handleLine(buffer);
      buffer = "";
    },
  };

  function handleLine(line) {
    if (!line.startsWith("data:")) return; // comments / keep-alives / event: lines
    const data = line.slice(5).trim();
    if (!data) return;
    if (data === "[DONE]") {
      onEvent({ done: true });
      return;
    }
    try {
      onEvent({ json: JSON.parse(data) });
    } catch {
      // a full line that still isn't JSON means the provider sent something odd; ignore it
    }
  }
}
