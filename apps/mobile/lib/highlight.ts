export type Segment = { text: string; mark: boolean };

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Splits text into segments, marking every case- and accent-insensitive occurrence of phrase. */
export function highlight(text: string, phrase: string): Segment[] {
  const needle = fold(phrase.trim());
  if (!needle) return [{ text, mark: false }];
  // Fold char by char, remembering where each folded char came from in the original text.
  let hay = "";
  const at: number[] = [];
  let i = 0;
  for (const ch of text) {
    const f = fold(ch);
    for (let k = 0; k < f.length; k++) at.push(i);
    hay += f;
    i += ch.length;
  }
  at.push(text.length);

  const out: Segment[] = [];
  let last = 0;
  for (let p = hay.indexOf(needle); p !== -1; p = hay.indexOf(needle, p + needle.length)) {
    const start = at[p];
    const end = at[p + needle.length];
    if (start > last) out.push({ text: text.slice(last, start), mark: false });
    out.push({ text: text.slice(start, end), mark: true });
    last = end;
  }
  if (last < text.length) out.push({ text: text.slice(last), mark: false });
  return out;
}
