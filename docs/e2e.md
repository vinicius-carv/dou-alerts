# Live end-to-end run

Status: **partial.** The auth, alert and cron-auth legs ran against a real local server and Postgres.
The DOU search leg could not complete: in.gov.br closed every connection from the development machine
(see below). Re-run the steps under "Resume" when the DOU is reachable again and replace this file.

Not part of this run: real email delivery (needs the owner's Resend key) and real push (needs an Expo
project / EAS `projectId`). With `RESEND_API_KEY` unset, the dev mailer logs emails instead of sending.

## Setup

```sh
docker compose -f apps/web/docker-compose.yml up -d        # Postgres 17 on :5433
# apps/web/.env.local (git-ignored): DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL=http://localhost:3100,
# CRON_SECRET (random dev values); RESEND_API_KEY unset
pnpm --filter web exec next dev -p 3100
```

## Login through the real HTTP endpoints (worked)

```sh
curl -H 'Origin: http://localhost:3100' -H 'Content-Type: application/json' \
  -X POST localhost:3100/api/auth/email-otp/send-verification-otp \
  -d '{"email":"owner@example.com","type":"sign-in"}'
# {"success":true}
# server log: [mailer:dev] to=owner@example.com subject=Seu acesso ao DOU Alertas / "Seu código: 797241"

curl -c cookies.txt ... -X POST localhost:3100/api/auth/sign-in/email-otp -d '{"email":"owner@example.com","otp":"797241"}'
# 200 {"token":"<redacted>","user":{"email":"owner@example.com","emailVerified":true,...}}

curl -b cookies.txt ... -X POST localhost:3100/api/alerts --data-binary @body.json   # {"phrase":"Ministério da Saúde"}
# 201 {"alert":{"id":"<uuid>","phrase":"Ministério da Saúde",...}}
```

(Note: pass non-ASCII phrases as a UTF-8 file or `é` escapes; Git Bash on Windows mangles them in `-d`.)

## Cron (reached the DOU, which refused the connection)

```sh
curl -H "Authorization: Bearer $CRON_SECRET" localhost:3100/api/cron/daily
# {"phrases":0,"acts":0,"matches":0,"emails":0,"pushes":0,"errors":["Ministério da Saúde: fetch failed"]}
```

The route authenticated correctly and the job handled the failure as designed (logged, skipped, not fatal).

## Why the DOU leg failed

From this machine every request to `https://www.in.gov.br/` completes the TLS handshake and is then closed
by the server before any response bytes (undici `UND_ERR_SOCKET: other side closed`, curl/schannel
"server closed abruptly"). It failed identically with Node fetch, curl, curl in a Docker container, and with
several User-Agent strings, and kept failing for 20+ minutes of retries. That points at an IP-level block
or rate limit at the DOU's WAF rather than the app (the design spec recorded the same URL working from this
machine on 2026-11-22). Google was reachable, so general connectivity was fine.

## Resume

1. Confirm `curl -sI https://www.in.gov.br/consulta` returns 200 (try another network if still blocked).
2. Repeat the login steps, add an alert for a phrase present in today's DOU (e.g. `Ministério da Saúde`).
3. Call `/api/cron/daily`; expect `phrases>=1, acts>=1, matches>=1, emails=1` (logged by the dev mailer).
4. `GET /api/matches` with the cookie; open one `in.gov.br` URL and expect HTTP 200.
5. Optionally screenshot `/matches` to `docs/screenshots/web-matches.png`.
