import { describe, expect, it, vi } from "vitest";
import { searchPhrase } from "../src/search";

/** Minimal DOU page with `n` hits whose slugs start at `from`. */
const page = (n: number, from = 0) =>
  `<script id="_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params" type="application/json">${JSON.stringify({
    jsonArray: Array.from({ length: n }, (_, i) => ({
      urlTitle: `ato-${from + i}`,
      title: `Ato ${from + i}`,
      score: "1.5",
      classPK: String(from + i),
      displayDateSortable: "1700000000000",
    })),
  })}</script>`;

const ok = (body: string) => new Response(body, { status: 200 });
const mk = (...responses: (() => Response | Promise<Response>)[]) => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  for (const r of responses) fetch.mockImplementationOnce(async () => r());
  return { fetch, sleep: vi.fn(async () => {}) };
};

describe("searchPhrase", () => {
  it("pages by cursor until a short page, sleeping 1s between requests", async () => {
    const d = mk(() => ok(page(20)), () => ok(page(5, 20)));
    const acts = await searchPhrase("Banco do Brasil", d);
    expect(acts).toHaveLength(25);
    expect(d.fetch).toHaveBeenCalledTimes(2);
    expect(d.sleep).toHaveBeenCalledTimes(1);
    expect(d.sleep).toHaveBeenCalledWith(1000);
    const [url, init] = d.fetch.mock.calls[1]!;
    expect(String(url)).toContain("newPage=2");
    expect(String(url)).toContain("id=19");
    expect((init!.headers as Record<string, string>)["User-Agent"]).toMatch(/dou-alerts/);
  });

  it("retries once after a network error", async () => {
    const d = mk(() => { throw new Error("boom"); }, () => ok(page(2)));
    expect(await searchPhrase("x y z", d)).toHaveLength(2);
    expect(d.fetch).toHaveBeenCalledTimes(2);
  });

  it("throws HTTP status after a failed retry", async () => {
    const d = mk(() => new Response("", { status: 503 }), () => new Response("", { status: 503 }));
    await expect(searchPhrase("x y z", d)).rejects.toThrow(/HTTP 503/);
    expect(d.fetch).toHaveBeenCalledTimes(2);
  });

  it("respects maxPages", async () => {
    const d = mk(() => ok(page(20)), () => ok(page(20, 20)));
    expect(await searchPhrase("x y z", d, { maxPages: 1 })).toHaveLength(20);
    expect(d.fetch).toHaveBeenCalledTimes(1);
  });

  it("dedupes by slug", async () => {
    const d = mk(() => ok(page(20)), () => ok(page(5, 15)));
    expect(await searchPhrase("x y z", d)).toHaveLength(20);
  });
});
