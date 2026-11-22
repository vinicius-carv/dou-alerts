// Usage: node scripts/capture-fixture.mjs "Banco do Brasil" [page] [outfile]
// Writes a live DOU search page (page 1 by default) as a test fixture.
import { writeFileSync } from "node:fs";

const UA = "Mozilla/5.0 (compatible; dou-alerts/0.1; +https://github.com/vinicius-carv/dou-alerts)";
const [phrase, page = "1", out] = process.argv.slice(2);
const url = new URL("https://www.in.gov.br/consulta/-/buscar/dou");
url.searchParams.set("q", `"${phrase}"`);
url.searchParams.set("s", "todos");
url.searchParams.set("exactDate", "dia");
// Fixture needs 20 hits: run with EXTRA="exactDate=semana" (exactDate=dia is empty on weekends).
if (process.env.EXTRA) for (const [k, v] of new URLSearchParams(process.env.EXTRA)) url.searchParams.set(k, v);
const res = await fetch(url, { headers: { "User-Agent": UA } });
console.log(res.status, url.href);
const file = out ?? `test/fixtures/search-${phrase.toLowerCase().replaceAll(" ", "-")}.html`;
writeFileSync(file, await res.text());
console.log("wrote", file);
