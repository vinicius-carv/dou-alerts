import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { nextCursor, parseSearchPage, searchUrl } from "../src/dou";

const html = readFileSync(new URL("./fixtures/search-banco-do-brasil.html", import.meta.url), "utf8");

describe("parseSearchPage", () => {
  it("parses 20 acts", () => {
    const acts = parseSearchPage(html);
    expect(acts).toHaveLength(20);
    for (const a of acts) {
      expect(a.slug).not.toBe("");
      expect(a.url.startsWith("https://www.in.gov.br/web/dou/-/")).toBe(true);
      expect(a.excerpt.length).toBeLessThanOrEqual(300);
      expect(a.title).not.toContain("<");
    }
  });
  it("throws on unknown format", () => {
    expect(() => parseSearchPage("<html></html>")).toThrow(/format changed/);
  });
});

describe("searchUrl", () => {
  it("builds page 1", () => {
    expect(searchUrl("Banco do Brasil", 1)).toBe(
      "https://www.in.gov.br/consulta/-/buscar/dou?q=%22Banco%20do%20Brasil%22&s=todos&exactDate=dia",
    );
  });
  it("page 2 needs the cursor from page 1", () => {
    expect(() => searchUrl("x y z", 2)).toThrow(/cursor/);
    const c = nextCursor(html)!;
    expect(c).not.toBeNull();
    const u = searchUrl("Banco do Brasil", 2, c);
    expect(u).toContain("newPage=2");
    expect(u).toContain(`id=${c.id}`);
  });
  it("no cursor on empty page", () => {
    expect(nextCursor(readFileSync(new URL("./fixtures/search-empty.html", import.meta.url), "utf8"))).toBeNull();
  });
});
