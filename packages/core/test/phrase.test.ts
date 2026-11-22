import { describe, expect, it } from "vitest";
import { normalizePhrase } from "../src/phrase";

describe("normalizePhrase", () => {
  it("trims and collapses spaces", () => {
    expect(normalizePhrase("  Banco   do Brasil ")).toEqual({ ok: true, phrase: "Banco do Brasil", key: "banco do brasil" });
  });
  it("formats CNPJ", () => {
    for (const i of ["00000000000191", "00.000.000/0001-91"])
      expect(normalizePhrase(i)).toMatchObject({ ok: true, phrase: "00.000.000/0001-91" });
  });
  it("rejects bad length and quotes", () => {
    expect(normalizePhrase("ab")).toEqual({ ok: false, error: "Use entre 3 e 100 caracteres." });
    expect(normalizePhrase("a".repeat(101))).toEqual({ ok: false, error: "Use entre 3 e 100 caracteres." });
    expect(normalizePhrase('a "b" c')).toEqual({ ok: false, error: "Não use aspas." });
  });
});
