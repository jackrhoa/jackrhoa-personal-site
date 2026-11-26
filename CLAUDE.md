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

## Deployment
**Do not run `wrangler deploy` manually.** Deployment happens automatically via git push — let the user push when ready.

## Image conversion
To convert SVG to PNG, use `sips` — macOS Preview and other built-in tools don't work reliably for this:
```
sips -s format png input.svg --out output.png
```
