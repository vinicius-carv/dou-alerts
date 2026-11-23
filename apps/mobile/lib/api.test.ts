jest.mock("./auth-client", () => ({
  API_URL: "http://test",
  authClient: { getCookie: async () => "c=1" },
}));
import { api } from "./api";

it("throws the server error message on non-2xx", async () => {
  globalThis.fetch = jest.fn(async () => new Response(JSON.stringify({ error: "Limite de 10 alertas." }), { status: 400 })) as typeof fetch;
  await expect(api("/api/alerts", { method: "POST" })).rejects.toThrow("Limite de 10 alertas.");
});

it("sends the cookie and parses JSON on success", async () => {
  const f = jest.fn(async () => new Response(JSON.stringify({ alerts: [] }), { status: 200 }));
  globalThis.fetch = f as unknown as typeof fetch;
  expect(await api("/api/alerts")).toEqual({ alerts: [] });
  expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toMatchObject({ Cookie: "c=1" });
});
