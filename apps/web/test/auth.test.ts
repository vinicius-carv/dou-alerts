import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mailer", () => ({ sendEmail: vi.fn(async () => {}) }));

import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";
import { requireUser } from "@/lib/session";
import { resetDb } from "./db";

const post = (path: string, body: unknown) =>
  auth.handler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify(body),
    }),
  );

const lastMail = () => vi.mocked(sendEmail).mock.calls.at(-1)![0];

describe("auth", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(sendEmail).mockClear();
  });

  it("email OTP round-trip yields a session", async () => {
    const res = await post("/email-otp/send-verification-otp", { email: "a@example.com", type: "sign-in" });
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(lastMail().to).toBe("a@example.com");
    const code = lastMail().text.match(/\d{6}/)![0];

    const signIn = await post("/sign-in/email-otp", { email: "a@example.com", otp: code });
    expect(signIn.status).toBe(200);
    const cookie = signIn.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    expect(cookie).toContain("session_token");

    const user = await requireUser(new Request("http://localhost:3000/", { headers: { cookie } }));
    expect(user?.email).toBe("a@example.com");
    expect(await requireUser(new Request("http://localhost:3000/"))).toBeNull();
  });

  it("magic-link request sends one email with both the code and the link", async () => {
    const res = await post("/sign-in/magic-link", { email: "b@example.com" });
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(lastMail().text).toMatch(/\d{6}/);
    expect(lastMail().text).toContain("http");

    // The code from the same email must work.
    const code = lastMail().text.match(/Seu código: (\d{6})/)![1];
    const signIn = await post("/sign-in/email-otp", { email: "b@example.com", otp: code });
    expect(signIn.status).toBe(200);
  });
});
