export type PhraseResult = { ok: true; phrase: string; key: string } | { ok: false; error: string };

export function normalizePhrase(input: string): PhraseResult {
  let phrase = input.trim().replace(/\s+/g, " ");
  if (phrase.length < 3 || phrase.length > 100) return { ok: false, error: "Use entre 3 e 100 caracteres." };
  if (phrase.includes('"')) return { ok: false, error: "Não use aspas." };
  const digits = phrase.replace(/[.\/-]/g, "");
  if (/^\d{14}$/.test(digits) && /^[\d./-]+$/.test(phrase))
    phrase = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return { ok: true, phrase, key: phrase.toLowerCase() };
}
