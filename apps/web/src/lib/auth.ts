import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, magicLink } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { loginMail } from "./emails";
import { sendEmail } from "./mailer";

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
  // Database storage: serverless instances do not share memory, so in-memory limits would not hold.
  rateLimit: { enabled: true, storage: "database" },
  trustedOrigins: ["dou-alerts://", ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [])],
});
