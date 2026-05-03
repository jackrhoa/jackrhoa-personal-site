import SPORTS from '../data/sports';

export interface CalEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end:   { dateTime?: string; date?: string };
}

export interface GameEvent {
  id: string;
  date: Date;
  endDate: Date;
  sport: string;
  awayAbbrev: string;
  homeAbbrev: string;
  neutral: boolean;
  network: string | null;
  position: string;
  liveUrl: string | null;
  recordingUrl: string | null;
  raw: string;
}

export interface UnparsedEvent {
  id: string;
  date: Date;
  raw: string;
}

export type ParsedEvent = { kind: 'game'; data: GameEvent } | { kind: 'raw'; data: UnparsedEvent };

// Format: "POSITION - SPORT vs AWAY_TEAM (NETWORK?)"
// "(CANCELED) POSITION" and "(HOOVISION)" in position field are special tokens.
export const GAME_REGEX     = /^(.+?)\s*-\s*(.+?)\s+vs\s+(.+?)(?:\s*\(([^)]+)\))?\s*$/i;
export const CANCELED_REGEX = /\(cancel+ed\)/i;
export const HOOVISION_REGEX = /hoovision/i;

export const SPORT_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SPORTS).map(([abbrev, name]) => [name.toUpperCase(), abbrev])
);

export function normalizeSport(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (SPORTS[upper] !== undefined) return upper;
  return SPORT_REVERSE[upper] ?? upper;
}

export function stripPositionTags(position: string): string {
  return position
    .replace(/\s*\(cancel+ed\)/i, '')
    .replace(/\s*\(hoovision\)/i, '')
    .replace(/hoovision/i, '')
    .trim();
}

function extractUrl(raw: string): string | null {
  const t = raw.trim();
  // Google Calendar wraps links in <a href="..."> when added via the UI
  const hrefMatch = t.match(/<a\s+href=["']([^"']+)["']/i);
  if (hrefMatch) return hrefMatch[1];
  // Plain URL — take the first non-whitespace token
  const token = t.match(/\S+/)?.[0];
  if (!token) return null;
  // Prepend https:// if no protocol present
  return /^https?:\/\//i.test(token) ? token : `https://${token}`;
}

export function parseDescriptionUrls(description?: string): { liveUrl: string | null; recordingUrl: string | null } {
  if (!description) return { liveUrl: null, recordingUrl: null };
  let liveUrl: string | null = null;
  let recordingUrl: string | null = null;
  for (const line of description.split(/\n|<br\s*\/?>/i)) {
    const t = line.trim();
    const lm = t.match(/^live\s*:\s*(.+)/i);
    if (lm) { liveUrl = extractUrl(lm[1]); continue; }
    const rm = t.match(/^recording\s*:\s*(.+)/i);
    if (rm) { recordingUrl = extractUrl(rm[1]); }
  }
  return { liveUrl, recordingUrl };
}

export function parseEvent(evt: CalEvent): ParsedEvent {
  const date = evt.start.dateTime
    ? new Date(evt.start.dateTime)
    : (() => {
        const [y, m, d] = (evt.start.date!).split('-').map(Number);
        return new Date(y, m - 1, d);
      })();

  const endDate = evt.end.dateTime
    ? new Date(evt.end.dateTime)
    : (() => {
        const [y, m, d] = (evt.end.date!).split('-').map(Number);
        return new Date(y, m - 1, d);
      })();

  const match = evt.summary.match(GAME_REGEX);
  if (!match) return { kind: 'raw', data: { id: evt.id, date, raw: evt.summary } };

  const [, position, sport, opponent, network] = match;
  const { liveUrl, recordingUrl } = parseDescriptionUrls(evt.description);
  return {
    kind: 'game',
    data: {
      id:           evt.id,
      date,
      endDate,
      sport:        normalizeSport(sport),
      awayAbbrev:   opponent.trim().toUpperCase(),
      homeAbbrev:   'UVA',
      neutral:      false,
      network:      network ? network.trim().toUpperCase() : null,
      position:     position.trim().toUpperCase(),
      liveUrl,
      recordingUrl,
      raw:          evt.summary,
    },
  };
}
