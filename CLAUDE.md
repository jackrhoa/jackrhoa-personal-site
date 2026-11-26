# Project: Jack Rhoa Personal Site

Vite + React + TypeScript. Single-page site, routes in `src/main.tsx`.

- `/` — `src/pages/HomePage.tsx`
- `/schedule` — `src/pages/SchedulePage.tsx` with `fullPage` prop, fully mobile-responsive

New routes must be added to both `src/main.tsx` and `SPA_ROUTES` in `src/worker.ts`, or the worker returns 404.

## Email gate (`/api/email`)
- Worker logic in `src/emailGate.ts`; the address comes from the Worker secret `CONTACT_EMAIL` and must never appear in client code or the repo
- `GET` verifies an Apple Private Access Token (issuer `demo-pat.issuer.cloudflare.com`) or returns a `PrivateToken` 401 challenge
- `POST {token}` verifies Turnstile via siteverify (secret `TURNSTILE_SECRET_KEY`, action `email`, hostname allowlist)
- Local dev: copy `.dev.vars.example` to `.dev.vars` (Turnstile always-pass test keys)

## Hardware key metadata
- `src/data/mdsStatements.json` is a verified, trimmed FIDO Metadata Service snapshot used by `src/webauthnGate.ts` (strict mode: unknown models are rejected)
- Endpoint is `/api/email/key`. Never put "webauthn" in a URL path: Cloudflare's edge challenges any such path before it reaches the worker
- Refresh it every month or two: download https://mds.fidoalliance.org/ in a browser (the server rate-limits scripts), then `node scripts/fetchMds.mjs <path-to-blob.jwt>`

## Infra (`infra/`)
- OpenTofu for this app only (GitHub environment/ruleset, Turnstile widget). Shared infra not tied to this app lives in the separate `jackrhoa/infra` repo
- `turnstile.tf` creates the widget and writes its site key to the `production` environment variable `TURNSTILE_SITE_KEY`, which `deploy.yml` passes to the build as `VITE_TURNSTILE_SITE_KEY`

## Deployment
**Do not run `wrangler deploy` manually.** Deployment happens automatically via git push — let the user push when ready.

## Image conversion
To convert SVG to PNG, use `sips` — macOS Preview and other built-in tools don't work reliably for this:
```
sips -s format png input.svg --out output.png
```
