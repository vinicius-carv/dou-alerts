import type { DouAct } from "./dou";
import { C, SANS, SERIF, emailShell, esc, highlightHtml, markHtml } from "./email";

export type DigestItem = { phrase: string; act: DouAct };

const MAX_PER_PHRASE = 20;
const FOOTER = "Você recebe este e-mail porque cadastrou alertas no DOU Alertas.";

export function buildDigest(
  items: DigestItem[],
  appUrl?: string,
): { subject: string; html: string; text: string; pushBody: string } {
  const n = items.length;
  const count = `${n} ${n === 1 ? "novo ato" : "novos atos"}`;
  const groups = new Map<string, DouAct[]>();
  for (const { phrase, act } of items) groups.set(phrase, [...(groups.get(phrase) ?? []), act]);

  const section = ([phrase, acts]: [string, DouAct[]]) => {
    const more = acts.length - MAX_PER_PHRASE;
    const moreLine =
      more > 0
        ? `<p style="margin:16px 0 0 0;font-family:${SANS};font-size:14px;color:${C.soft};">e mais ${more} ${more === 1 ? "ato" : "atos"}${
            appUrl ? ` — <a href="${esc(appUrl)}" style="color:${C.seal};">veja todos no app</a>` : ""
          }</p>`
        : "";
    return (
      `<h2 style="margin:32px 0 8px 0;font-family:${SERIF};font-size:25px;line-height:1.25;color:${C.ink};">${markHtml(phrase, "padding:0 4px;")}</h2>` +
      acts
        .slice(0, MAX_PER_PHRASE)
        .map((a) => {
          const meta = [a.section, a.organ].filter(Boolean).join(" · ");
          return (
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.rule};"><tr><td style="padding:16px 0;">` +
            (meta ? `<div style="font-family:${SANS};font-size:14px;color:${C.soft};">${esc(meta)}</div>` : "") +
            `<div style="margin:4px 0 8px 0;font-family:${SERIF};font-size:20px;line-height:1.3;font-weight:bold;color:${C.ink};">${esc(a.title)}</div>` +
            `<div style="font-family:${SERIF};font-size:16px;line-height:1.6;color:${C.ink};">${highlightHtml(a.excerpt, phrase)}</div>` +
            `<div style="margin-top:8px;font-family:${SANS};font-size:14px;"><a href="${esc(a.url)}" style="color:${C.seal};font-weight:bold;">Ler no DOU</a></div>` +
            `</td></tr></table>`
          );
        })
        .join("") +
      moreLine
    );
  };

  const html = emailShell({
    title: `DOU Alertas: ${count}`,
    body: `<p style="margin:0;">${count} no DOU para os seus alertas.</p>${[...groups].map(section).join("")}`,
    footer: FOOTER,
  });

  const text =
    [...groups]
      .map(
        ([phrase, acts]) =>
          `== ${phrase} ==\n` +
          acts.map((a) => [a.title, a.organ, a.excerpt, `Ler no DOU: ${a.url}`].filter(Boolean).join("\n")).join("\n\n"),
      )
      .join("\n\n") + `\n\n${FOOTER}`;

  return {
    subject: `DOU Alertas: ${count}`,
    html,
    text,
    pushBody: `${count} no DOU para: ${[...groups.keys()].join(", ")}`,
  };
}
