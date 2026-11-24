// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AlertsManager from "@/app/alerts-manager";

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) =>
    init?.method === "POST" ? json({ error: "Expressão muito curta." }, 400) : json({ alerts: [] })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("shows the server error message on 400", async () => {
  render(<AlertsManager />);
  fireEvent.change(await screen.findByLabelText("Nova expressão"), { target: { value: "a" } });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Expressão muito curta.");
});

test("clears the input and lists the new alert on success", async () => {
  vi.mocked(fetch).mockImplementation((_u, init) =>
    init?.method === "POST"
      ? json({ alert: { id: "1", phrase: "licitação", createdAt: "2026-01-01T00:00:00Z" } }, 201)
      : json({ alerts: [] }));
  render(<AlertsManager />);
  const input = (await screen.findByLabelText("Nova expressão")) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "licitação" } });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
  expect(await screen.findByText("licitação")).toBeTruthy();
  expect(input.value).toBe("");
});

test("shows an error when the initial load fails", async () => {
  vi.mocked(fetch).mockImplementation(() => json({}, 500));
  render(<AlertsManager />);
  expect((await screen.findByRole("alert")).textContent).toMatch("Não foi possível carregar os alertas");
});

test("shows a pt-BR message when adding fails at the network level", async () => {
  vi.mocked(fetch).mockImplementation((_u, init) =>
    init?.method === "POST" ? Promise.reject(new TypeError("Failed to fetch")) : json({ alerts: [] }));
  render(<AlertsManager />);
  fireEvent.change(await screen.findByLabelText("Nova expressão"), { target: { value: "licitação" } });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
  expect((await screen.findByRole("alert")).textContent).toMatch("Sem conexão com o servidor");
});

test("shows how many acts each term matched in the last 90 days", async () => {
  const recent = new Date().toISOString();
  vi.mocked(fetch).mockImplementation((url) =>
    String(url).includes("matches")
      ? json({ matches: [
          { phrase: "licitação", createdAt: recent },
          { phrase: "licitação", createdAt: recent },
          { phrase: "licitação", createdAt: "2020-01-01T00:00:00Z" },
        ] })
      : json({ alerts: [{ id: "1", phrase: "licitação", createdAt: recent }] }));
  render(<AlertsManager />);
  expect(await screen.findByText("2 atos nos últimos 90 dias")).toBeTruthy();
});
