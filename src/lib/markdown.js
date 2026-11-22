import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js/lib/common";
import DOMPurify from "dompurify";

// marked v5+ dropped the `highlight` option, so the old setOptions({ highlight })
// call did nothing and code blocks were never coloured. marked-highlight is the
// official replacement.
const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
  { gfm: true, breaks: true }
);

// Model output is untrusted. Without sanitizing, a reply (or a prompt-injected
// document) containing <img src=x onerror=...> would run script in the page.
export function renderMarkdown(src) {
  const html = marked.parse(src || "");
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

// Turn [1], [2] citations into small badges after rendering. Skips anything
// inside <pre>/<code> so that arr[1] in a code sample is left alone.
export function decorateCitations(html, count) {
  if (!count) return html;
  return html
    .split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/g)
    .map((part) => {
      if (part.startsWith("<pre") || part.startsWith("<code")) return part;
      return part.replace(/(?<![\w\]])\[(\d{1,2})\](?![(:])/g, (m, n) =>
        Number(n) >= 1 && Number(n) <= count ? `<sup class="cite" data-cite="${n}">${n}</sup>` : m
      );
    })
    .join("");
}
