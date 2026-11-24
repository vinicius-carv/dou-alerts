import { C, SANS, emailShell, esc, markHtml } from "@dou-alerts/core";

export const loginMail = (to: string, code: string, link?: string) => ({
  to,
  subject: "Seu acesso ao DOU Alertas",
  text: `Seu código: ${code}${link ? `\nEntrar: ${link}` : "\nDigite este código no app para entrar."}\n\nO código expira em 5 minutos.\n\nVocê pediu para entrar no DOU Alertas. Se não foi você, ignore este e-mail.`,
  html: emailShell({
    title: "Seu acesso ao DOU Alertas",
    footer: "Você pediu para entrar no DOU Alertas. Se não foi você, ignore este e-mail.",
    body:
      `<p style="margin:0 0 16px 0;">${link ? "Use o botão abaixo ou digite o código para entrar." : "Digite este código no app para entrar."}</p>` +
      `<p style="margin:0 0 24px 0;font-family:${SANS};font-size:36px;font-weight:bold;letter-spacing:10px;line-height:1.3;">${markHtml(code, "padding:4px 8px 4px 18px;")}</p>` +
      (link
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C.ink}" style="border-radius:4px;background:${C.ink};"><a href="${esc(link)}" style="display:inline-block;padding:12px 24px;font-family:${SANS};font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Entrar no DOU Alertas</a></td></tr></table>` +
          `<p style="margin:16px 0 0 0;font-size:14px;color:${C.soft};word-break:break-all;">Ou copie este endereço: <a href="${esc(link)}" style="color:${C.seal};">${esc(link)}</a></p>`
        : "") +
      `<p style="margin:24px 0 0 0;font-size:14px;color:${C.soft};">O código expira em 5 minutos.</p>`,
  }),
});
