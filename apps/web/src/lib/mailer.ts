import { Resend } from "resend";

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: process.env.EMAIL_FROM!, ...msg });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
