# DOU alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users save exact-phrase keywords; a daily job searches the DOU and sends an email digest + Expo push for new matching acts; web (Next.js) and mobile (Expo) clients.

**Architecture:** pnpm monorepo. `packages/core` holds pure DOU/matching logic. `apps/web` is Next.js serving pages, the JSON API used by both clients, Better Auth, and the cron route, with Drizzle on Postgres (Neon in prod, Docker Postgres in dev/CI). `apps/mobile` is an Expo app calling the same API.

**Tech Stack:** Node 22, pnpm (via corepack), TypeScript, Next.js 16, React 19, Expo SDK 58 + expo-router, Better Auth 1.7 (+ `@better-auth/expo`, emailOTP, magicLink plugins), Drizzle ORM 0.45 + drizzle-kit + `pg`, Resend 6, expo-server-sdk 8, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-11-22-dou-alerts-design.md`

## Global Constraints

- Repo root: `C:\Users\vinic\Documents\projects\dou-alerts`. Conventional commits in English. End every commit message with the two attribution lines: `Generated with AI` / `Co-Authored-By: AI <ai@example.com>`. Never push.
- No secrets in git. `.env.example` lists `DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, RESEND_API_KEY, EMAIL_FROM, CRON_SECRET, EXPO_ACCESS_TOKEN`; `.env.local` git-ignored.
- `EMAIL_FROM=DOU Alertas <alertas@mail.vinicius-carv.com.br>`.
- DOU search URL: `https://www.in.gov.br/consulta/-/buscar/dou?q=<encodeURIComponent('"'+phrase+'"')>&s=todos&exactDate=dia`. Article URL: `https://www.in.gov.br/web/dou/-/<urlTitle>`. User-Agent: `Mozilla/5.0 (compatible; dou-alerts/0.1; +https://github.com/vinicius-carv/dou-alerts)`. Timeout 30 s, one retry, ≥1 s between DOU requests, max 3 pages (20 results each), stop on a page with <20 results.
- Alerts: phrase 3–100 chars after trim/space collapse, no `"`, max 10 per user, unique per user (case-insensitive). 14 digits (punctuation allowed) → `XX.XXX.XXX/XXXX-XX`.
- Excerpt: stripped `content`, max 300 chars. Retention: matches older than 90 days deleted; orphan acts deleted.
- Cron: `vercel.json` schedule `0 11 * * *`; route `maxDuration = 300`; stop starting phrases after 240 s; phrases processed least-recently-checked first. Auth `Authorization: Bearer ${CRON_SECRET}` else 401.
- UI copy in pt-BR; code, comments, README in English (README has one pt-BR line).
- CI never calls the live DOU.
- Windows dev machine: no deep paths for native builds — the mobile native build runs from `C:\wt\dou-alerts-mobile` copy or a junction if Gradle path length fails.

## Review Focus

- DOU returns a page without the params script (maintenance/WAF HTML) → that phrase errors, logged, job continues; no matches deleted. Test in Task 6.
- Same act matches two alerts of the same user → digest lists it once per alert but only one push/email per user. Test in Task 6.
- Notification send fails (Resend error) → `notified_at` stays null and next run resends. Test in Task 6.
- User adds `"` or a 2-char phrase or an 11th alert → 400 with a pt-BR message, nothing stored. Test in Task 5.
- Request to API without session or another user's alert id on DELETE → 401 / 404, never deletes another user's alert. Test in Task 5.

---

### Task 1: Monorepo scaffold + core DOU parser and phrase normalisation

**Files:**
- Create: `package.json` (private, workspaces via `pnpm-workspace.yaml`: `apps/*`, `packages/*`; scripts `test`, `lint`, `typecheck` running `pnpm -r`), `pnpm-workspace.yaml`, `.gitignore` (node_modules, .next, .env*.local, .expo, dist, android, ios), `.env.example`, `tsconfig.base.json` (strict, ES2022, moduleResolution bundler), `LICENSE` (MIT, Vinicius Carvalho, 2026)
- Create: `packages/core/package.json` (name `@dou-alerts/core`, `main`/`types` → `src/index.ts`, vitest), `packages/core/src/dou.ts`, `packages/core/src/phrase.ts`, `packages/core/src/index.ts`
- Create: `packages/core/test/fixtures/search-banco-do-brasil.html` (captured live: `node scripts/capture-fixture.mjs "Banco do Brasil"` writes it; script lives at `packages/core/scripts/capture-fixture.mjs`), `packages/core/test/dou.test.ts`, `packages/core/test/phrase.test.ts`

**Interfaces:**
- Produces:
  - `type DouAct = { slug: string; title: string; organ: string | null; section: string; pubDate: string; excerpt: string; url: string }`
  - `parseSearchPage(html: string): DouAct[]` — throws `Error("DOU page format changed")` when the params script is missing or not JSON. Adapt `parseSearchPage`/`stripHtml` from `C:\Users\vinic\Documents\projects\mcp-brasil\src\tools\dou.ts` (comment: "adapted from mcp-brasil, MIT"). `excerpt` truncated to 300 chars.
  - `normalizePhrase(input: string): { ok: true; phrase: string; key: string } | { ok: false; error: string }` — `phrase` is display/search form, `key` is lower-cased for uniqueness. Errors (pt-BR): `"Use entre 3 e 100 caracteres."`, `"Não use aspas."`.
  - `searchUrl(phrase: string, page: number): string` (page 1 = no extra param; page n adds `&start=<(n-1)*20>` — the builder must confirm the paging param against the live site in Step 1 by capturing page 2; if a different param, use it and note it in a comment).

- [ ] Step 1: `git init`, `corepack enable`, write root files, capture fixture (and verify page-2 param by hand with the capture script, saving `search-page2.html` only if needed for a test).
- [ ] Step 2: Write failing tests:
  - `parseSearchPage(fixture)` returns 20 acts; every act has non-empty `slug`, `url` starting with `https://www.in.gov.br/web/dou/-/`, `excerpt.length <= 300`, no `<` in `title`.
  - `parseSearchPage("<html></html>")` throws `/format changed/`.
  - `normalizePhrase("  Banco   do Brasil ")` → `{ok:true, phrase:"Banco do Brasil", key:"banco do brasil"}`.
  - `normalizePhrase("00000000000191")` and `("00.000.000/0001-91")` → phrase `"00.000.000/0001-91"`.
  - `normalizePhrase("ab")` → error `"Use entre 3 e 100 caracteres."`; `normalizePhrase('a "b" c')` → `"Não use aspas."`; 101 chars → length error.
  - `searchUrl("Banco do Brasil", 1)` equals `https://www.in.gov.br/consulta/-/buscar/dou?q=%22Banco%20do%20Brasil%22&s=todos&exactDate=dia`.
- [ ] Step 3: Run `pnpm --filter @dou-alerts/core test` → FAIL.
- [ ] Step 4: Implement.
- [ ] Step 5: Run → PASS. Commit `feat(core): DOU search parser and phrase normalisation`.

### Task 2: Core search client and digest builder

**Files:** Create `packages/core/src/search.ts`, `packages/core/src/digest.ts`; tests `packages/core/test/search.test.ts`, `packages/core/test/digest.test.ts`. Export from `index.ts`.

**Interfaces:**
- Consumes: `parseSearchPage`, `searchUrl`, `DouAct`.
- Produces:
  - `searchPhrase(phrase: string, deps: { fetch: typeof fetch; sleep: (ms: number) => Promise<void> }, opts?: { maxPages?: number }): Promise<DouAct[]>` — serial pages, `sleep(1000)` before every request after the first, 30 s `AbortSignal.timeout`, one retry on network error/timeout/5xx, non-2xx after retry throws `Error("DOU: HTTP <status>")`. Dedupes by slug.
  - `type DigestItem = { phrase: string; act: DouAct }`
  - `buildDigest(items: DigestItem[]): { subject: string; html: string; text: string; pushBody: string }` — subject `"DOU Alertas: N novos atos"` (singular `"1 novo ato"`), grouped by phrase, each item title + organ + excerpt + link "Ler no DOU"; `pushBody` = `"N novos atos no DOU para: <phrases joined by ', '>"`. HTML-escape all DOU text.
- [ ] Step 1: Failing tests with a fake fetch: page of 20 then page of 5 → 25 acts, 2 fetch calls, sleep called once with 1000; fake fetch that throws once then succeeds → result returned, 2 calls; 503 twice → rejects `/HTTP 503/`; `maxPages:1` → 1 call. Digest: 3 items across 2 phrases → subject `"DOU Alertas: 3 novos atos"`, html contains each url and escapes `<script>` in a title, text contains each url.
- [ ] Step 2: Run → FAIL. Step 3: implement. Step 4: Run → PASS. Step 5: Commit `feat(core): DOU search client and digest builder`.

### Task 3: Next.js app, database schema and test DB

**Files:**
- Create `apps/web` via `pnpm create next-app apps/web --ts --app --eslint --no-tailwind --src-dir --import-alias "@/*" --use-pnpm` then trim boilerplate. Add deps: `@dou-alerts/core` (workspace), `drizzle-orm`, `pg`, `better-auth`, `@better-auth/expo`, `resend`, `expo-server-sdk`; dev: `drizzle-kit`, `vitest`, `@types/pg`. `next.config.ts`: `transpilePackages: ["@dou-alerts/core"]`.
- Create `apps/web/src/db/schema.ts`, `apps/web/src/db/index.ts`, `apps/web/drizzle.config.ts`, `apps/web/drizzle/` (generated migrations), `apps/web/docker-compose.yml` (postgres:17, port 5433, db `dou_alerts`, user/pass `dou`/`dou` — dev only), `apps/web/vitest.config.ts`, `apps/web/test/db.ts`.

**Interfaces:**
- Produces:
  - Tables (Drizzle `pgTable`): Better Auth core tables generated with `npx @better-auth/cli generate` into `schema.ts` after Task 4 config exists — in this task write the app tables and leave a marked section; Task 4 appends auth tables and regenerates the migration. App tables: `alert(id uuid pk default random, userId text fk user.id on delete cascade, phrase text, key text, createdAt timestamptz default now)` unique `(userId, key)`; `act(slug text pk, title, organ null, section, pubDate text, excerpt, url, firstSeenAt timestamptz default now)`; `match(alertId uuid fk alert.id cascade, actSlug text fk act.slug cascade, createdAt default now, notifiedAt timestamptz null)` pk `(alertId, actSlug)`; `phraseCheck(key text pk, checkedAt timestamptz)`; `pushToken(token text pk, userId fk user cascade, createdAt)`.
  - `db` (drizzle node-postgres instance from `DATABASE_URL`), `export type Db = typeof db`.
  - `test/db.ts`: `resetDb(): Promise<void>` (truncate all tables cascade), `createUser(email: string): Promise<{ id: string }>`; tests use `DATABASE_URL=postgres://dou:dou@localhost:5433/dou_alerts`; `globalSetup` runs migrations.
- [ ] Step 1: Scaffold, schema, `docker compose up -d`, `pnpm drizzle-kit generate && pnpm drizzle-kit migrate`.
- [ ] Step 2: Test `schema.test.ts`: inserting the same `(userId, key)` twice rejects; deleting a user cascades to alerts, matches, push tokens.
- [ ] Step 3: Run `pnpm --filter web test` → PASS; `pnpm --filter web build` succeeds. Commit `feat(web): Next.js app with Drizzle schema`.

### Task 4: Auth (Better Auth + Resend) and login page

**Files:** Create `apps/web/src/lib/auth.ts`, `apps/web/src/lib/mailer.ts`, `apps/web/src/app/api/auth/[...all]/route.ts`, `apps/web/src/lib/session.ts`, `apps/web/src/app/login/page.tsx`, `apps/web/src/lib/auth-client.ts`; test `apps/web/test/auth.test.ts`.

**Interfaces:**
- Produces:
  - `auth` = `betterAuth({ database: drizzleAdapter(db, { provider: "pg", schema }), plugins: [emailOTP({ sendVerificationOTP }), magicLink({ sendMagicLink }), expo()], trustedOrigins: ["dou-alerts://", process.env.BETTER_AUTH_URL] })`. One email per login: both the OTP request and the magic-link request send the same template containing the 6-digit code and (when a link exists) the link. Simplest correct way: web login calls `signIn.magicLink`; mobile calls `emailOtp.sendVerificationOtp`; each email says "Seu código: NNNNNN" / "Entrar: <link>" as applicable. (Owner's "both in one email" is met on web by also sending an OTP in the magic-link email only if Better Auth allows generating it in the callback; if it does not, keep separate flows and note it in the README. Builder decides after reading Better Auth docs; do not hand-roll token storage.)
  - `sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<void>` in `mailer.ts` (Resend, `EMAIL_FROM`); throws on Resend error.
  - `requireUser(req: Request): Promise<{ id: string; email: string } | null>` in `session.ts` via `auth.api.getSession({ headers: req.headers })` (works for cookie and the Expo plugin's header).
- [ ] Step 1: Failing test: with `sendEmail` mocked (`vi.mock("@/lib/mailer")`), POST to the email-OTP send endpoint through `auth.handler` for `a@example.com` → `sendEmail` called once, `to` = address, text matches `/\d{6}/`; verifying that code via `auth.handler` returns a session cookie and `requireUser` with that cookie returns the user.
- [ ] Step 2: FAIL → implement → PASS. Login page: email field → "Enviamos um código e um link para seu e-mail" → code field; on success `router.push("/")`. Commit `feat(web): passwordless email login with Better Auth`.

### Task 5: JSON API (alerts, matches, push token, account)

**Files:** Create `apps/web/src/app/api/alerts/route.ts` (GET, POST), `apps/web/src/app/api/alerts/[id]/route.ts` (DELETE), `apps/web/src/app/api/matches/route.ts` (GET), `apps/web/src/app/api/push-token/route.ts` (POST), `apps/web/src/app/api/account/route.ts` (DELETE), `apps/web/src/lib/repo.ts`; test `apps/web/test/api.test.ts`.

**Interfaces:**
- Consumes: `requireUser`, `db`, `normalizePhrase`.
- Produces (all JSON; 401 `{error:"Não autenticado."}` without session):
  - `GET /api/alerts` → `{ alerts: { id, phrase, createdAt }[] }` newest first.
  - `POST /api/alerts {phrase}` → 201 `{ alert }`; 400 `{error}` for normalise errors, `"Limite de 10 alertas."`, `"Alerta já existe."`.
  - `DELETE /api/alerts/:id` → 204; 404 if not the user's.
  - `GET /api/matches` → `{ matches: { phrase, act: DouAct, createdAt }[] }` newest first, limit 100.
  - `POST /api/push-token {token}` → 204; upsert reassigning `userId`; 400 unless token matches `/^ExponentPushToken\[.+\]$/`.
  - `DELETE /api/account` → 204; deletes user (cascade).
  - `repo.ts` holds the queries used by routes and the job: `listAlerts(userId)`, `addAlert(userId, input)`, `deleteAlert(userId, id)`, `listMatches(userId)`, `savePushToken(userId, token)`, `deleteUser(userId)`.
- [ ] Step 1: Failing tests calling route handlers directly with `requireUser` mocked: the five Review Focus cases for this task (quote / 2-char / 11th alert → 400 with exact messages and count unchanged; no session → 401; deleting another user's alert → 404 and it still exists), plus happy paths for each endpoint and push-token reassignment.
- [ ] Step 2: FAIL → implement → PASS. Commit `feat(web): alerts, matches, push token and account API`.

### Task 6: Daily job and cron route

**Files:** Create `apps/web/src/lib/job.ts`, `apps/web/src/lib/push.ts`, `apps/web/src/app/api/cron/daily/route.ts`, `apps/web/vercel.json`; test `apps/web/test/job.test.ts`.

**Interfaces:**
- Consumes: `searchPhrase`, `buildDigest`, `sendEmail`, `db`.
- Produces:
  - `sendPush(tokens: string[], body: string): Promise<void>` (expo-server-sdk, title `"DOU Alertas"`, data `{ url: "/matches" }`; tickets with `DeviceNotRegistered` delete that token).
  - `runDaily(deps: { search: (phrase: string) => Promise<DouAct[]>; sendEmail: typeof sendEmail; sendPush: typeof sendPush; now: () => number; budgetMs?: number }): Promise<{ phrases: number; acts: number; matches: number; emails: number; pushes: number; errors: string[] }>` — algorithm per spec "Daily job" steps 1–7: distinct alert keys ordered by `phraseCheck.checkedAt` nulls first; for each (until `now()-start > budgetMs ?? 240_000`) search the alert's display phrase, upsert acts, insert matches ignore-conflict, upsert `phraseCheck`; errors push `"<phrase>: <message>"` and continue. Then per user with un-notified matches: one email (`buildDigest`) and one push to all their tokens; mark `notifiedAt` only for that user after the email succeeds (push failure is logged, not blocking). Then retention delete.
  - `GET /api/cron/daily`: 401 unless bearer matches; calls `runDaily` with real deps (`search = p => searchPhrase(p, { fetch, sleep })`), returns summary JSON, `export const maxDuration = 300`.
  - `vercel.json`: `{ "crons": [{ "path": "/api/cron/daily", "schedule": "0 11 * * *" }] }`.
- [ ] Step 1: Failing tests (real test DB, fake deps): two users share phrase "Banco do Brasil" → `search` called once, each user gets one email, matches marked notified; second run with same acts → 0 emails; `search` throws for phrase A but not B → B's matches stored, `errors` has A; `sendEmail` throws for user X → X's matches stay `notifiedAt null`, next run emails X; one user with two alerts matching the same act → one email listing both phrases; budget exceeded after first phrase (fake `now`) → second phrase not searched and is searched first on next run; match with `createdAt` 91 days old deleted and its orphan act removed; route without bearer → 401.
- [ ] Step 2: FAIL → implement → PASS. Commit `feat(web): daily DOU job with email and push notifications`.

### Task 7: Web UI

**Files:** `apps/web/src/app/page.tsx` (alerts + add form; redirect to `/login` without session), `apps/web/src/app/matches/page.tsx`, `apps/web/src/app/account/page.tsx`, `apps/web/src/app/layout.tsx` (nav: Alertas, Atos, Conta), `apps/web/src/app/globals.css` (small, plain CSS). Client components call the Task 5 API with `fetch`.
- [ ] Step 1: Implement; a Vitest + Testing Library test for the add-alert form: server 400 message is shown, success clears the input and lists the alert.
- [ ] Step 2: `pnpm --filter web build` passes; manual check with `pnpm --filter web dev` and the browser pane: log in (real email via Resend to the owner's address), add alert, see empty matches. Commit `feat(web): alerts, matches and account pages`.

### Task 8: Expo mobile app

**Files:** `apps/mobile` via `pnpm create expo-app apps/mobile --template blank-typescript`, then expo-router. Create `app/_layout.tsx`, `app/login.tsx`, `app/(tabs)/index.tsx` (alerts), `app/(tabs)/matches.tsx`, `app/(tabs)/account.tsx`, `lib/auth-client.ts` (`createAuthClient` with `expoClient({ scheme: "dou-alerts", storage: SecureStore })` + `emailOTPClient()`), `lib/api.ts`, `lib/push.ts`. `app.json`: scheme `dou-alerts`, name "DOU Alertas", android package `br.com.viniciuscarv.doualerts`.

**Interfaces:**
- Consumes: Task 4 auth endpoints, Task 5 API at `process.env.EXPO_PUBLIC_API_URL`.
- Produces: `api<T>(path: string, init?: RequestInit): Promise<T>` adding the Better Auth cookie header from `authClient.getCookie()`; throws `Error(body.error)` on non-2xx. `registerPush(): Promise<void>` (expo-notifications permission → `getExpoPushTokenAsync({ projectId })` → `POST /api/push-token`); tapping a notification opens the matches tab.
- [ ] Step 1: Implement screens (login: email → code; alerts: list + add + delete with error text; matches: FlatList with "Ler no DOU" via `Linking.openURL`; account: sign out, delete account with confirm Alert).
- [ ] Step 2: Unit test `lib/api.test.ts` (jest-expo): non-2xx with `{error:"Limite de 10 alertas."}` throws that message. `npx tsc --noEmit` passes.
- [ ] Step 3: Native run on emulator (`adb devices` first, reuse one; set `ANDROID_HOME`; `npx expo run:android`, short path if Gradle fails): login with code, add alert, receive a test push via `sendPush`. Screenshot. Commit `feat(mobile): Expo app with login, alerts, matches and push`.

### Task 9: CI, README, live end-to-end run

**Files:** `.github/workflows/ci.yml`, `README.md`, `docs/e2e.md`.
- [ ] Step 1: CI: ubuntu-latest, Node 22, corepack pnpm, `pnpm install --frozen-lockfile`, Postgres 17 service on 5433, `pnpm -r lint`, `pnpm -r typecheck`, migrate, `pnpm -r test`, `pnpm --filter web build` (dummy env values).
- [ ] Step 2: Live E2E with local web server against Docker Postgres (or a Neon branch if the owner provides `DATABASE_URL`): sign up with the owner's email, add an alert for a phrase present in today's DOU (pick one from today's search results), `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/daily`, confirm the summary JSON, the received email (owner confirms) and the push on the emulator. Record command output (no secrets) in `docs/e2e.md`.
- [ ] Step 3: README: what it is, screenshots (web + mobile), architecture diagram in text, how matching works (exact phrase, CNPJ formatting, extra-edition limitation, 90-day retention), local setup, env vars, tests, deploy notes, credit to mcp-brasil parser, one pt-BR line: "Alertas diários do Diário Oficial da União para CNPJs, nomes e temas — web e app."
- [ ] Step 4: Commit `ci: add GitHub Actions workflow` and `docs: README and e2e record`.
