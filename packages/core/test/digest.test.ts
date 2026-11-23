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
});
