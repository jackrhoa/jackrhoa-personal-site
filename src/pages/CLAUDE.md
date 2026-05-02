# Page components

All pages use `width: 100%, height: 100%` and are shared between desktop (program monitor) and mobile (full-screen in MobileApp).

- `HomePage.tsx` — landing page
- `AboutPage.tsx` — bio + headshot
- `ProjectsPage.tsx` — project cards
- `SchedulePage.tsx` — Google Calendar-powered broadcast schedule
  - Used in three contexts: program monitor (default, perPage=3), preview thumbnail (scaled), and standalone /schedule route (fullPage, perPage=7)
  - `fullPage` prop enables the SHOW ALL toggle and larger padding
  - `perPage` prop controls cards per page
- `FontOnePage.tsx` — FONT 1 watermark overlay source (not a nav page)
