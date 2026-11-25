# Page components

- `HomePage.tsx` — the whole site at `/`: experience, open source, contact links (all in `SECTIONS`)
- `SchedulePage.tsx` — Google Calendar-powered broadcast schedule at `/schedule`, styled like the home page (theme vars, Tailwind)
  - `perPage` prop controls cards per page
- `NotFoundPage.tsx` — 404 for unknown routes
- `RevealEmail.tsx` — "Reveal email" button in the CONTACT column. Fetches `/api/email`; Apple Private Access Tokens reveal it directly, otherwise a Turnstile widget (site key from `VITE_TURNSTILE_SITE_KEY`, test key in dev) must pass. The hardware security key option is hidden unless built with `VITE_ENABLE_HARDWARE_KEY=true` (on in production via `deploy.yml`)
