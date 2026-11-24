// Email-safe building blocks: tables, inline styles, system fonts, no images.
export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const C = { paper: "#F6F7F4", ink: "#13233A", soft: "#55606E", rule: "#D8DCE1", marker: "#FFE15A", seal: "#1E6B47" };
export const SERIF = "Georgia,'Times New Roman',serif";
export const SANS = "Arial,Helvetica,sans-serif";

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Marker stroke around plain text (escaped here). */
export const markHtml = (text: string, extra = "") =>
  `<mark style="background:${C.marker};color:${C.ink};padding:0 3px;${extra}">${esc(text)}</mark>`;

/** Escapes text, then wraps case- and accent-insensitive occurrences of phrase in a marker <mark>. */
export function highlightHtml(text: string, phrase: string): string {
  const needle = fold(phrase.trim());
  if (!needle) return esc(text);
  let hay = "";
  const at: number[] = []; // folded index -> original index
  let i = 0;
  for (const ch of text) {
    const f = fold(ch);
    for (let k = 0; k < f.length; k++) at.push(i);
    hay += f;
    i += ch.length;
  }
  at.push(text.length);
  let out = "";
  let last = 0;
  for (let p = hay.indexOf(needle); p !== -1; p = hay.indexOf(needle, p + needle.length)) {
    const start = at[p]!;
    const end = at[p + needle.length]!;
    out += esc(text.slice(last, start)) + markHtml(text.slice(start, end));
    last = end;
  }
  return out + esc(text.slice(last));
}

/** Shared shell: wordmark, content, footer. `body` is trusted HTML; `footer` is plain text. */
export function emailShell(opts: { title: string; body: string; footer: string }): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${C.paper};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.paper}" style="background:${C.paper};"><tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:0 0 20px 0;border-bottom:1px solid ${C.rule};font-family:${SERIF};font-size:20px;font-weight:bold;color:${C.ink};">DOU ${markHtml("Alertas")}</td></tr>
<tr><td style="padding:24px 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.ink};">${opts.body}</td></tr>
<tr><td style="padding:16px 0 0 0;border-top:1px solid ${C.rule};font-family:${SANS};font-size:14px;line-height:1.5;color:${C.soft};">${esc(opts.footer)}</td></tr>
</table></td></tr></table></body></html>`;
}
