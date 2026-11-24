# Live end-to-end run

**Status: passed on 2026-11-23** against the live Diário Oficial da União, local web server, Docker Postgres.
Email used the dev mailer fallback (logged, not sent) and push was off (no EAS project), so real
email and push delivery are not covered here.

## Setup

```bash
docker compose -f apps/web/docker-compose.yml up -d
# apps/web/.env.local (git-ignored): DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL=http://localhost:3917,
# CRON_SECRET (random dev values); RESEND_API_KEY unset -> emails are logged
DATABASE_URL=postgres://dou:dou@localhost:5433/dou_alerts npx drizzle-kit migrate   # in apps/web
npx next dev -p 3917                                                                  # in apps/web
```

## Login through the real HTTP endpoints

```bash
curl -X POST $B/api/auth/email-otp/send-verification-otp -H "origin: $B" -H "content-type: application/json" \
  -d '{"email":"owner@example.com","type":"sign-in"}'
# {"success":true}; server log: [mailer:dev] to=owner@example.com subject=Seu acesso ao DOU Alertas
curl -c jar -X POST $B/api/auth/sign-in/email-otp -H "origin: $B" -H "content-type: application/json" \
  -d '{"email":"owner@example.com","otp":"<otp from log>"}'
# 200
curl -b jar -X POST $B/api/alerts -H "origin: $B" -H "content-type: application/json; charset=utf-8" \
  --data-binary @body.json        # {"phrase":"Ministério da Saúde"} saved as UTF-8
# 201 {"alert":{"id":"<uuid>","phrase":"Ministério da Saúde",...}}
```

Send non-ASCII bodies from a UTF-8 file on Windows: Git Bash's inline `-d` re-encodes accents.

## Daily job against the live DOU

```bash
curl -H "Authorization: Bearer $CRON_SECRET" $B/api/cron/daily
# {"phrases":1,"acts":60,"matches":60,"emails":1,"pushes":0,"errors":[]}   (10.8 s: 3 pages x 20, keyset paging, 1 s spacing)
# server log: [mailer:dev] to=owner@example.com subject=DOU Alertas: 60 novos atos

curl -b jar $B/api/matches
# 60 matches, e.g.
# Ministério da Saúde | 23/11/2026 | EXTRATO DE TERMO ADITIVO | https://www.in.gov.br/web/dou/-/extrato-de-termo-aditivo-745769836

curl -o act.html -w "%{http_code}" https://www.in.gov.br/web/dou/-/extrato-de-termo-aditivo-745769836
# 200, page contains div.texto-dou (the act's full text)

# second run, same day: no duplicate notification
curl -H "Authorization: Bearer $CRON_SECRET" $B/api/cron/daily
# {"phrases":1,"acts":60,"matches":0,"emails":0,"pushes":0,"errors":[]}
```

## Notes

- An earlier attempt the same day failed with `fetch failed`: in.gov.br closes connections coming from VPN
  exit IPs. Without the VPN (Brazilian residential IP) and from a Vercel function in `iad1` it answers normally.
- Real email delivery was checked on 2026-11-24 with a Resend key for the verified domain
  `mail.vinicius-carv.com.br`: the login email (code + magic link) and two digests ("60 novos atos",
  "22 novos atos") arrived in a Gmail inbox (not spam), sent from `DOU Alertas <alertas@mail.vinicius-carv.com.br>`.
- Not covered: real push delivery (needs `eas init` for an Expo project id).
