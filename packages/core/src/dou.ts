// Parser adapted from mcp-brasil (MIT), same author.
export type DouAct = {
  slug: string;
  title: string;
  organ: string | null;
  section: string;
  pubDate: string;
  excerpt: string;
  url: string;
};

/** Keyset cursor of the last hit on a page; the DOU site paginates with it, not with an offset. */
export type PageCursor = { score: string; id: string; displayDate: string };

const ARTICLE_BASE = "https://www.in.gov.br/web/dou/-/";
const FORMAT = "DOU page format changed";
const PARAMS_RE = /<script id="_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params"[^>]*>([\s\S]*?)<\/script>/;
const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', nbsp: " " };

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>|<\/(?:p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
        return Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
      }
      return NAMED[e.toLowerCase()] ?? m;
    })
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const oneLine = (html: string) => stripHtml(html).replace(/\s+/g, " ");

function hits(html: string): Record<string, unknown>[] {
  const m = PARAMS_RE.exec(html);
  let items: unknown;
  try {
    items = m && (JSON.parse(m[1]!) as { jsonArray?: unknown }).jsonArray;
  } catch {
    items = undefined;
  }
  if (!Array.isArray(items) || items.some((i) => !i || typeof i !== "object")) throw new Error(FORMAT);
  return items as Record<string, unknown>[];
}

export function parseSearchPage(html: string): DouAct[] {
  return hits(html).map((i) => {
    const slug = String(i.urlTitle ?? "");
    const organ = typeof i.hierarchyStr === "string" && i.hierarchyStr !== "" ? i.hierarchyStr : null;
    return {
      slug,
      title: oneLine(String(i.title ?? "")),
      organ,
      section: String(i.pubName ?? ""),
      pubDate: String(i.pubDate ?? ""),
      excerpt: oneLine(String(i.content ?? "")).slice(0, 300),
      url: ARTICLE_BASE + slug,
    };
  });
}

export function nextCursor(html: string): PageCursor | null {
  const last = hits(html).at(-1);
  if (!last) return null;
  const { score, classPK: id, displayDateSortable: displayDate } = last;
  if ([score, id, displayDate].some((v) => v == null || v === "")) throw new Error(FORMAT);
  return { score: String(score), id: String(id), displayDate: String(displayDate) };
}

/**
 * Page 1 has no extra params. Verified live: `start`/`delta`/`currentPage` alone are ignored or
 * return nothing; the site's own pager submits currentPage+newPage plus the last hit's
 * score/id/displayDate, so page n>1 needs the cursor from page n-1 (see nextCursor).
 */
export function searchUrl(phrase: string, page: number, cursor?: PageCursor): string {
  const base = `https://www.in.gov.br/consulta/-/buscar/dou?q=${encodeURIComponent('"' + phrase + '"')}&s=todos&exactDate=dia`;
  if (page <= 1) return base;
  if (!cursor) throw new Error("searchUrl: page > 1 needs the cursor from the previous page");
  return (
    `${base}&sortType=0&delta=20&currentPage=${page - 1}&newPage=${page}` +
    `&score=${encodeURIComponent(cursor.score)}&id=${encodeURIComponent(cursor.id)}&displayDate=${encodeURIComponent(cursor.displayDate)}`
  );
}
