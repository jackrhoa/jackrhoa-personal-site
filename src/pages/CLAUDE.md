# Page components

- `HomePage.tsx` — the whole site at `/`: experience, open source, contact links (all in `SECTIONS`)
- `SchedulePage.tsx` — Google Calendar-powered broadcast schedule at `/schedule`
  - `fullPage` prop enables the SHOW ALL toggle and larger padding
  - `perPage` prop controls cards per page
- `NotFoundPage.tsx` — 404 for unknown routes
- `RevealEmail.tsx` — "Reveal email" button in the CONTACT column. Fetches `/api/email`; Apple Private Access Tokens reveal it directly, otherwise a Turnstile widget (site key from `VITE_TURNSTILE_SITE_KEY`, test key in dev) must pass. The hardware security key option is hidden unless built with `VITE_ENABLE_HARDWARE_KEY=true` (off until the FIDO Metadata Service is bundled)
