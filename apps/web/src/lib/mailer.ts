import { Resend } from "resend";

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<void> {
  // shortcut: dev-only log instead of sending, so local login works without a Resend key
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production") {
    console.info(`[mailer:dev] to=${msg.to} subject=${msg.subject}\n${msg.text}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: process.env.EMAIL_FROM!, ...msg });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
