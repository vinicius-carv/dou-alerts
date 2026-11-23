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
