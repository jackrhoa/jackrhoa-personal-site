export interface Source {
  id: number;
  label: string;      // shown on multiviewer UMD
  busLabel?: string;  // shown on bus map buttons (falls back to label if absent)
  bg: string;
  text: string;
  isColorBars?: boolean;
  pageKey?: string;
}

export const SOURCES: Source[] = [
  { id: 1, label: 'HOME',      bg: '#001a10', text: '#6bff8a', pageKey: 'home' },
  { id: 2, label: 'ABOUT',     bg: '#1a0808', text: '#ff6b6b', pageKey: 'about' },
  { id: 3, label: 'PROJECTS',  bg: '#0a1a30', text: '#4db8ff', pageKey: 'projects' },
  { id: 4, label: 'WORK SCHEDULE', busLabel: 'SCHED', bg: '#0a0a1a', text: '#aaaaff', pageKey: 'schedule' },
  { id: 5, label: 'FONT 1',    bg: '#002a2a', text: '#6bffff' },
  { id: 6, label: 'BARS',      bg: '#111',    text: '#fff', isColorBars: true },
  { id: 7, label: 'BLACK',     bg: '#000',    text: '#333' },
];

export const COLOR_BAR_STRIPES = [
  '#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0',
];
