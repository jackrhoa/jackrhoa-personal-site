# Project: Jack Rhoa Personal Site

Vite + React + TypeScript. Desktop: Ross Carbonite ME1 switcher as navigation. Mobile: simple tab nav.

## Desktop (`/`)
- `src/App.tsx` — switcher state and layout
- `src/components/` — switcher UI (multiviewer, panel, T-bar, etc.)
- Pages render inside the program monitor at scaled 1280×720

## Mobile (`/` on screens < 768px)
- `src/MobileApp.tsx` — tab nav (HOME, ABOUT, PROJECTS, SCHEDULE)
- Same page components, rendered full-screen, no switcher wrapper
- Detection at boot in `src/main.tsx` via `window.innerWidth < 768`

## Standalone schedule (`/schedule`)
- `src/pages/SchedulePage.tsx` with `fullPage` prop — fully mobile-responsive

## Adding or removing a content page (must do both)
1. **Desktop** — add a `Source` in `src/sources.ts`, wire `pageKey` in `App.tsx` / `ProgramMonitor.tsx`
2. **Mobile** — add a tab in `src/MobileApp.tsx` and import the page component

## Changing existing page content
Page components in `src/pages/` are shared — one change applies to both desktop and mobile.
