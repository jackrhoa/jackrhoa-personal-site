import SPORTS from '../data/sports';

export interface CalEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end:   { dateTime?: string; date?: string };
}

export interface GameEvent {
  id: string;
  date: Date;
  sport: string;
  awayAbbrev: string;
  homeAbbrev: string;
  neutral: boolean;
  network: string | null;
  position: string;
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

export function parseEvent(evt: CalEvent): ParsedEvent {
  const date = evt.start.dateTime
    ? new Date(evt.start.dateTime)
    : (() => {
        const [y, m, d] = (evt.start.date!).split('-').map(Number);
        return new Date(y, m - 1, d);
      })();

  const match = evt.summary.match(GAME_REGEX);
  if (!match) return { kind: 'raw', data: { id: evt.id, date, raw: evt.summary } };

  const [, position, sport, opponent, network] = match;
  return {
    kind: 'game',
    data: {
      id:         evt.id,
      date,
      sport:      normalizeSport(sport),
      awayAbbrev: opponent.trim().toUpperCase(),
      homeAbbrev: 'UVA',
      neutral:    false,
      network:    network ? network.trim().toUpperCase() : null,
      position:   position.trim().toUpperCase(),
      raw:        evt.summary,
    },
  };
}
