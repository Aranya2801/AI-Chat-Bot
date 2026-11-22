export function conversationToMarkdown(convo) {
  const lines = [`# ${convo.title}`, "", `_Exported ${new Date().toLocaleString()}_`, ""];
  for (const m of convo.messages) {
    if (!m.content) continue;
    lines.push(m.role === "user" ? "## You" : `## Assistant${m.model ? ` (${m.model})` : ""}`, "", m.content, "");
    if (m.sources?.length) {
      lines.push("<details><summary>Sources</summary>", "");
      m.sources.forEach((s, i) => lines.push(`${i + 1}. **${s.docName}** (score ${s.score}): ${s.text.slice(0, 160)}…`));
      lines.push("", "</details>", "");
    }
  }
  return lines.join("\n");
}

export function download(filename, text, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "chat";
}
