import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, magicLink } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "./mailer";

const loginMail = (to: string, code: string, link?: string) => ({
  to,
  subject: "Seu acesso ao DOU Alertas",
  text: `Seu código: ${code}${link ? `\nEntrar: ${link}` : ""}\n\nO código expira em 5 minutos.`,
  html: `<p>Seu código: <b>${code}</b></p>${link ? `<p><a href="${link}">Entrar no DOU Alertas</a></p>` : ""}<p>O código expira em 5 minutos.</p>`,
});

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  plugins: [
    // Mobile: code only.
    emailOTP({ sendVerificationOTP: ({ email, otp }) => sendEmail(loginMail(email, otp)) }),
    // Web: one email with the link plus a code minted by the emailOTP plugin (no hand-rolled tokens).
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const otp = await auth.api.createVerificationOTP({ body: { email, type: "sign-in" } });
        await sendEmail(loginMail(email, otp, url));
      },
    }),
    expo(),
  ],
  rateLimit: { enabled: true },
  trustedOrigins: ["dou-alerts://", ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [])],
});
