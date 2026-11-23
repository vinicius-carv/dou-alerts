import type { DouAct } from "./dou";

export type DigestItem = { phrase: string; act: DouAct };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function buildDigest(items: DigestItem[]): { subject: string; html: string; text: string; pushBody: string } {
  const n = items.length;
  const count = `${n} ${n === 1 ? "novo ato" : "novos atos"}`;
  const groups = new Map<string, DouAct[]>();
  for (const { phrase, act } of items) groups.set(phrase, [...(groups.get(phrase) ?? []), act]);

  const html = [...groups]
    .map(
      ([phrase, acts]) =>
        `<h2>${esc(phrase)}</h2>` +
        acts
          .map(
            (a) =>
              `<p><strong>${esc(a.title)}</strong><br>${a.organ ? esc(a.organ) + "<br>" : ""}${esc(a.excerpt)}<br>` +
              `<a href="${esc(a.url)}">Ler no DOU</a></p>`,
          )
          .join(""),
    )
    .join("");
  const text = [...groups]
    .map(
      ([phrase, acts]) =>
        `== ${phrase} ==\n` +
        acts.map((a) => [a.title, a.organ, a.excerpt, `Ler no DOU: ${a.url}`].filter(Boolean).join("\n")).join("\n\n"),
    )
    .join("\n\n");

  return {
    subject: `DOU Alertas: ${count}`,
    html,
    text,
    pushBody: `${count} no DOU para: ${[...groups.keys()].join(", ")}`,
  };
}
