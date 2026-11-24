import { describe, expect, it } from "vitest";
import { highlightHtml } from "../src/email";

describe("highlightHtml", () => {
  it("matches ignoring case and accents", () => {
    const h = highlightHtml("MINISTERIO DA SAUDE publica portaria", "Ministério da Saúde");
    expect(h).toMatch(/<mark[^>]*>MINISTERIO DA SAUDE<\/mark> publica portaria/);
  });
  it("escapes html in the text, inside and outside matches", () => {
    const h = highlightHtml("<b>x</b> Saúde <i>", "saúde");
    expect(h).not.toContain("<b>");
    expect(h).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(h).toContain(">Saúde</mark> &lt;i&gt;");
  });
  it("returns escaped text when the phrase is empty", () => {
    expect(highlightHtml("a<b", " ")).toBe("a&lt;b");
  });
});
