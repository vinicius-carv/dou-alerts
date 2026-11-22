# DOU alerts — design

Date: 2026-11-22 · Status: draft for approval (email domain verified in Resend 2026-11-22)

## Intent

Public portfolio project. The owner's site lists React, Next.js, React Native (Expo) and PostgreSQL, but no public repo shows them. This app fills that gap with a small, complete, real product: users save keywords (a CNPJ, a person or company name, a topic phrase), a daily job searches the Diário Oficial da União (DOU), and users get an email digest and a push notification when a new act matches, with a link to the act's full text.

Success: a reviewer clones the repo, reads a clear README, sees tests and CI green, and can trust that it ran end to end against the live DOU. It should read as mid-level full-stack work: clean boundaries, tests where logic lives, no gold plating.

## Goals

- Web app (Next.js) and mobile app (Expo) with the same core screens: login, alerts list (add/delete), recent matches feed, account deletion.
- Passwordless login by email: one email carries a magic link (web) and a 6-digit code (mobile and web).
- Daily job that searches the DOU per distinct keyword and records new matches.
- Notifications: one email digest per user per run with new matches, plus one Expo push per user per run.
- Tests for the DOU client, matching/normalisation, the job, and API routes; CI on GitHub Actions.
- English README with one pt-BR line.

## Non-goals (v1)

- Boolean queries (AND/OR) or several phrases per alert. One alert = one exact phrase.
- Filtering by DOU section (always `s=todos`), backfilling past editions.
- App store release, web push, SMS, admin UI, billing, i18n of the UI (UI copy in pt-BR is fine since the DOU is Brazilian; code and docs in English).

## Anti-goals

- Hammering in.gov.br: requests are serialised with ≥1 s spacing, capped per run.
- Storing secrets in the repo; storing anything beyond email, alerts, push tokens and matches.
- A demo that only works on mocks: the live end-to-end run is part of "done".

## Constraints and facts (verified 2026-11-22)

- `https://www.in.gov.br/consulta/-/buscar/dou?q=<q>&s=todos&exactDate=dia` is reachable from the owner's machine (BR) and from a Vercel function in the default US region (`iad1`, AWS egress): HTTP 200, ~150 KB, 1–4 s. The earlier "non-Brazilian IPs refused" observation does not apply to Vercel. Python `urllib` got 403 (UA/WAF); `fetch` with a browser-like User-Agent works. Use timeout ≥30 s and one retry.
- Results are JSON in `<script id="_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params">` → `jsonArray` (fields `title`, `pubDate`, `pubName`, `editionNumber`, `numberPage`, `artType`, `hierarchyStr`, `content`, `urlTitle`). Full text page: `https://www.in.gov.br/web/dou/-/<urlTitle>`. 20 results per page. Parser and HTML stripping exist in `mcp-brasil/src/tools/dou.ts` (MIT, same author) — copy and adapt, with attribution in a comment.
- Search semantics: unquoted = loose token matching (useless for CNPJs: 5,075 junk hits in a week). Quoted = exact phrase (`"Banco do Brasil"` 2,161 → 81; quoted CNPJ → 5 real hits). Quoted phrase plus extra bare words → 0 results. CNPJ as bare digits → 0 results; must be `XX.XXX.XXX/XXXX-XX`.
- Hosting free tiers: Vercel Hobby (cron at most once a day, function duration limit applies), Neon free Postgres, Resend free email, Expo push service (free, needs an Expo account/project for push tokens).

## Approaches considered

- **A. Monorepo, Next.js serves web + API + cron, Expo app calls the same API (chosen).** One deploy, one language, all four gap technologies visible. Trade-off: the daily job runs inside a Vercel function with a duration limit.
- B. Next.js frontend + separate API service (e.g. Hono). Cleaner split, but two deploys and more wiring for no user-visible gain; shows less Next.js.
- C. Supabase for auth/db/push. Least code, but replaces Neon and most of the hand-written backend, undercutting the full-stack showcase.
- (Dropped) Auth.js instead of Better Auth: mobile login would need custom token handling.

The owner picked A and the name `dou-alerts`.

## Design (decided)

### Repo layout

`C:\Users\vinic\Documents\projects\dou-alerts`, own git repo, pnpm workspaces:

- `packages/core` — pure TypeScript: DOU search client + parser, keyword normalisation, digest building. No framework deps. Unit tests with saved HTML fixtures.
- `apps/web` — Next.js (App Router). Pages, route handlers under `/api/*` used by web and mobile, Better Auth handler, cron route `/api/cron/daily`. Drizzle schema + migrations, Neon Postgres.
- `apps/mobile` — Expo (React Native, expo-router). Same screens; Better Auth Expo client; registers an Expo push token with the API.

### Auth

Better Auth inside the Next app, Drizzle adapter on Neon. Email OTP plugin (6-digit code) plus magic link, both in one email sent via Resend from the verified domain `mail.vinicius-carv.com.br` (region sa-east-1), sender `DOU Alertas <alertas@mail.vinicius-carv.com.br>`. Expo plugin for mobile sessions. Sign-up is open to anyone.

### Data model (Postgres)

- Better Auth tables (user, session, account, verification).
- `alert(id, user_id, phrase, created_at)` — `phrase` is the normalised search phrase; unique (user_id, phrase); max 10 per user (enforced in API).
- `act(slug PK, title, organ, section, pub_date, excerpt, url, first_seen_at)`.
- `match(alert_id, act_slug, created_at, notified_at null)` — PK (alert_id, act_slug), so each act notifies once per alert.
- `push_token(token PK, user_id, created_at)`.
- Retention: the daily job deletes `match` rows older than 90 days and `act` rows no longer referenced. Account deletion cascades everything.

### Keyword normalisation

Trim, collapse spaces, 3–100 chars, reject `"`. A string of exactly 14 digits (with or without punctuation) becomes formatted CNPJ `XX.XXX.XXX/XXXX-XX`. Phrase is sent quoted. Stored lower-cased for dedup; display keeps the user's text.

### Daily job

Vercel cron, once a day at 08:00 America/Sao_Paulo (11:00 UTC; `exactDate=dia` is the current Brasília date, which this time always matches), calls `/api/cron/daily` with the `CRON_SECRET` bearer header (route rejects anything else).

1. Distinct phrases across all alerts.
2. For each phrase, serially with ≥1 s between requests: search `exactDate=dia`, up to 3 pages (60 acts), stop early when a page has <20 results. Timeout 30 s, one retry.
3. Upsert acts; insert matches for every alert with that phrase (conflict = ignore).
4. For each user with un-notified matches: one Resend email digest (title, organ, excerpt, link) and one Expo push ("N novos atos no DOU"); then set `notified_at`.
5. Retention cleanup.
6. Time budget: route sets `maxDuration = 300` (Vercel Hobby with Fluid compute allows 300 s); stop starting new phrases after ~240 s; phrases are processed least-recently-checked first (`phrase_check(phrase, checked_at)` table or column) so a cut-off run does not starve the same phrases every day.
7. Returns a JSON summary (phrases checked, acts seen, matches, emails, pushes, errors) and logs it.

A per-phrase DOU failure is logged and skipped, not fatal. Notification failures leave `notified_at` null so the next run retries.

### Screens (web and mobile)

- Login: email field → "check your email" → code field (web also accepts the link).
- Alerts: list with delete; add field with inline validation and the 10-alert cap.
- Matches: newest first, grouped by day; each shows title, organ, alert phrase, excerpt, "Ler no DOU" link.
- Account: sign out, delete account.
- Mobile asks for push permission after login and registers the token.

### Testing

- `packages/core`: unit tests (Vitest) on parser (fixture HTML captured from live DOU), normalisation, digest.
- `apps/web`: route-handler and job tests with an injected fetch and a real Postgres (Neon branch or local Docker Postgres in CI via service container).
- Mobile: type-check + a light component test; manual run on emulator via native build.
- Live E2E (manual, documented): real account, real alert for a phrase known to appear that day, trigger cron route, receive email and push.

### CI

GitHub Actions: install, lint, type-check, test (with Postgres service), `next build`. No live DOU calls in CI.

### Secrets

`.env.example` only; real values in `.env.local` (git-ignored) and Vercel env: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `EXPO_ACCESS_TOKEN` (optional).

## Builder's calls (made during review, owner may override)

- Mobile talks to the Next API at `EXPO_PUBLIC_API_URL`: the LAN dev server during development, the Vercel URL once deployed. No deploy is needed before mobile work. Better Auth `trustedOrigins` includes the app scheme `dou-alerts://`.
- Mobile login is code-only; the email's magic link is for web. No universal links in v1.
- Acts published in an extra edition after the 08:00 run are not picked up (the next day's `dia` search is a different date). Accepted for v1 and stated in the README; a missed cron day is likewise not backfilled.
- `excerpt` = search `content` with HTML stripped, truncated to 300 chars.
- Registering a push token that already exists reassigns it to the current user (one device, one user).

## Left to the builder

- Exact Next.js/Expo/Better Auth versions (latest stable), styling approach (plain CSS modules or Tailwind — keep it small), component structure, fixture capture script.
- Whether `phrase_check` is a table or a column.
- Email HTML layout.
