import { describe, expect, it } from "vitest";
import { buildDigest, type DigestItem } from "../src/digest";

const act = (n: number, title = `Titulo ${n}`) => ({
  slug: `s${n}`, title, organ: "Orgao", section: "DO3", pubDate: "01/01/2026",
  excerpt: "trecho", url: `https://www.in.gov.br/web/dou/-/s${n}`,
});
const items: DigestItem[] = [
  { phrase: "Banco do Brasil", act: act(1) },
  { phrase: "Banco do Brasil", act: act(2, "<script>alert(1)</script>") },
  { phrase: "Petrobras", act: act(3) },
];

describe("buildDigest", () => {
  const d = buildDigest(items);
  it("builds subject and push body", () => {
    expect(d.subject).toBe("DOU Alertas: 3 novos atos");
    expect(d.pushBody).toBe("3 novos atos no DOU para: Banco do Brasil, Petrobras");
    expect(buildDigest([items[0]!]).subject).toBe("DOU Alertas: 1 novo ato");
  });
  it("includes urls and escapes html", () => {
    for (const i of items) {
      expect(d.html).toContain(i.act.url);
      expect(d.text).toContain(i.act.url);
    }
    expect(d.html).not.toContain("<script>");
    expect(d.html).toContain("&lt;script&gt;");
    expect(d.html).toContain("Ler no DOU");
  });
  it("marks the phrase in the excerpt and in the heading", () => {
    const m = buildDigest([{ phrase: "Saúde", act: { ...act(9), excerpt: "Ministerio da SAUDE publica" } }]);
    expect(m.html).toMatch(/<mark[^>]*>SAUDE<\/mark> publica/);
  });
  it("caps acts per phrase at 20 and links to the app only when appUrl is given", () => {
    const many: DigestItem[] = Array.from({ length: 25 }, (_, i) => ({ phrase: "X", act: act(i) }));
    const without = buildDigest(many);
    expect(without.html).toContain("e mais 5 atos");
    expect(without.html).not.toContain("veja todos no app");
    expect(without.html).not.toContain("s24");
    expect(without.text).toContain("s24");
    expect(buildDigest(many, "https://app.example").html).toContain('href="https://app.example"');
    expect(buildDigest(items).html).not.toContain("e mais");
  });
  it("has the digest footer and no unsubscribe", () => {
    expect(d.html).toContain("cadastrou alertas no DOU Alertas.");
    expect(d.html.toLowerCase()).not.toContain("unsubscribe");
  });
});
