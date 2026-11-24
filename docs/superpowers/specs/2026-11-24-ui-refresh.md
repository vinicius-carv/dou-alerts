# UI refresh — design notes

Owner's brief (2026-11-24): "work on the front a little bit before pushing, it's still way too barebone".

## Subject, audience, job

Subject: a clipping service for Brazil's official gazette (Diário Oficial da União).
Audience: people who must not miss an act: procurement teams watching "licitação TI", lawyers and
compliance staff watching a CNPJ or a name, journalists.
Primary job: scan today's new acts that mention my terms, and open the full text.

## The one memorable thing

The highlighter. Monitoring the gazette used to mean reading it with a marker in hand. Every place a
watched term appears (alert list, the act excerpt, the login sample) it is marked with a yellow
highlighter stroke. Everything else stays quiet: ink on paper.

## Tokens

Color
- paper `#F6F7F4` (cool off-white background, not cream)
- ink `#13233A` (navy ink: text, primary buttons)
- ink-soft `#55606E` (secondary text, meta)
- rule `#D8DCE1` (dividers, input borders)
- marker `#FFE15A` (highlight only: terms, focus ring fill)
- seal `#1E6B47` (links "Ler no DOU", success)
- alert `#A3262A` (errors, destructive)

Type
- Literata (serif, reading face) for act titles, excerpts and page headings: the gazette is a
  document, read it like one. Body line-height 1.6.
- Atkinson Hyperlegible (sans) for UI: labels, buttons, nav, meta. Chosen for legibility of
  CNPJs and diacritics at small sizes.
- Scale (1.25): 14 / 16 / 20 / 25 / 31 / 39 px. Sentence case everywhere; DOU act titles are shown as
  published (they arrive in capitals, that is the source's content).

Layout
- Single reading column, max 46rem, left-aligned. Header: wordmark (the word "Alertas" sits on a
  marker stroke), nav as plain text links with the current page underlined in ink.
- Login (desktop ≥ 900px): two columns. Left: a sample clipping — a real-looking DOU excerpt with a
  CNPJ marked — that shows what the product does. Right: the form. Mobile: form first, sample below.
- Alerts: add form at the top (input + button on one line), then the watched terms as a list; each
  term is shown marked, with how many acts it matched in the last 90 days and a quiet remove button.
- Atos (matches): filter by term (toggle chips, only when there are 2+ terms); days as headings
  ("segunda-feira, 23 de novembro"); each act: meta line (section, organ) in sans, title in serif,
  excerpt with the term marked, link "Ler no DOU" in seal green. Dividers between acts, no cards.
- Empty states give the next action ("Adicione uma expressão para começar").

Principles
- One bold element (the marker); no gradients, no drop shadows, one radius (4px) for inputs/buttons.
- No all-caps labels, no numbered markers, no eyebrow labels, no arrows appended to links.
- Visible focus (2px ink outline + marker fill on links), respects prefers-reduced-motion, contrast AA.
- Mobile app follows the same tokens: Literata for titles/excerpts, marker highlight, tab icons from
  @expo/vector-icons.

Checked against generic defaults: background is cool, not cream; accent is a functional highlight
on real content, not a decorative brand color; no card grid; no mono labels.
