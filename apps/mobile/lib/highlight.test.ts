import { highlight } from "./highlight";

const marked = (text: string, phrase: string) => highlight(text, phrase).filter((s) => s.mark).map((s) => s.text);

test("marks occurrences regardless of case and accents, keeping the original text", () => {
  const text = "BRASIL. MINISTERIO DA SAUDE. Portaria do Ministério da Saúde.";
  expect(marked(text, "Ministério da Saúde")).toEqual(["MINISTERIO DA SAUDE", "Ministério da Saúde"]);
  expect(marked(text, "ministerio da saude")).toEqual(["MINISTERIO DA SAUDE", "Ministério da Saúde"]);
  expect(highlight(text, "Ministério da Saúde").map((s) => s.text).join("")).toBe(text);
});

test("handles decomposed accents in the source text", () => {
  const nfd = "Saúde".normalize("NFD");
  expect(marked(`na ${nfd} pública`, "saude")).toEqual([nfd]);
});

test("returns the text unmarked when there is no match or no phrase", () => {
  expect(highlight("Edital de licitação", "CNPJ")).toEqual([{ text: "Edital de licitação", mark: false }]);
  expect(highlight("Edital", "  ")).toEqual([{ text: "Edital", mark: false }]);
});

test("marks a CNPJ with punctuation", () => {
  expect(highlight("CNPJ 12.345.678/0001-90.", "12.345.678/0001-90")).toEqual([
    { text: "CNPJ ", mark: false },
    { text: "12.345.678/0001-90", mark: true },
    { text: ".", mark: false },
  ]);
});
