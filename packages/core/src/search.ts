import { nextCursor, parseSearchPage, searchUrl, type DouAct, type PageCursor } from "./dou";

const UA = "Mozilla/5.0 (compatible; dou-alerts/0.1; +https://github.com/vinicius-carv/dou-alerts)";
const PAGE_SIZE = 20;

export type SearchDeps = { fetch: typeof fetch; sleep: (ms: number) => Promise<void> };

async function getHtml(url: string, fetchFn: typeof fetch): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchFn(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return await res.text();
      lastError = new Error(`DOU: HTTP ${res.status}`);
      if (res.status < 500) break; // 4xx will not improve on retry
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/** Serial keyset-paged search: max `maxPages` pages of 20, stops on a short page. */
export async function searchPhrase(phrase: string, deps: SearchDeps, opts: { maxPages?: number } = {}): Promise<DouAct[]> {
  const maxPages = opts.maxPages ?? 3;
  const bySlug = new Map<string, DouAct>();
  let cursor: PageCursor | undefined;
  for (let page = 1; page <= maxPages; page++) {
    if (page > 1) await deps.sleep(1000);
    const html = await getHtml(searchUrl(phrase, page, cursor), deps.fetch);
    const acts = parseSearchPage(html);
    for (const a of acts) if (!bySlug.has(a.slug)) bySlug.set(a.slug, a);
    if (acts.length < PAGE_SIZE) break;
    cursor = nextCursor(html) ?? undefined;
    if (!cursor) break;
  }
  return [...bySlug.values()];
}
