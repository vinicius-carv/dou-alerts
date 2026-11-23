import { afterEach, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/mailer";

afterEach(() => vi.unstubAllEnvs());

it("logs instead of sending when RESEND_API_KEY is unset outside production", async () => {
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("NODE_ENV", "development");
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  await sendEmail({ to: "a@b.c", subject: "S", html: "<p>x</p>", text: "code 123456" });
  expect(info).toHaveBeenCalledWith(expect.stringContaining("code 123456"));
  info.mockRestore();
});
