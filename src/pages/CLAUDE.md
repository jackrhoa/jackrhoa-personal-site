# Page components

- `HomePage.tsx` — the whole site at `/`: experience, open source contributions, contact links (all in `SECTIONS`), and a link to `/schedule`
- `SchedulePage.tsx` — Google Calendar-powered broadcast schedule at `/schedule`
  - `fullPage` prop enables the SHOW ALL toggle and larger padding
  - `perPage` prop controls cards per page
- `NotFoundPage.tsx` — 404 for unknown routes
