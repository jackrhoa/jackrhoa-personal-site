import { useEffect, useState } from 'react';
import TEAMS, { espnLogoUrl } from '../data/teams';
import NETWORKS from '../data/networks';
import SPORTS from '../data/sports';

const CALENDAR_ID = 'e398559c5a1cbfb6b616fe196ad845c4dd30721af94e6c14efb47ad0a4488993@group.calendar.google.com';
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY as string;
const CACHE_TTL = 5 * 60 * 1000;

const BG     = '#0a0a1a';
const ACCENT = '#aaaaff';

interface CalEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end:   { dateTime?: string; date?: string };
}

let cachedEvents: CalEvent[] | null = null;
let cacheTime = 0;
let sharedPage = 0;

function setSharedPage(p: number) {
  sharedPage = p;
  window.dispatchEvent(new CustomEvent('schedule-page'));
}

// ── Parser ────────────────────────────────────────────────────────────────────
// Format: "CFB | CLEM @ HOU | ESPN | TD"  (@ = away@home, vs = neutral)
// Falls back to raw title if format doesn't match.

interface GameEvent {
  id: string;
  date: Date;
  sport: string;
  awayAbbrev: string;
  homeAbbrev: string;
  neutral: boolean;
  network: string | null;
  position: string;
  raw: string; // original title
}

interface UnparsedEvent {
  id: string;
  date: Date;
  raw: string;
}

type ParsedEvent = { kind: 'game'; data: GameEvent } | { kind: 'raw'; data: UnparsedEvent };

// Format: "TD - CFB vs CLEM (ESPN)" or "TD - FOOTBALL vs VIRGINIA TECH (ESPN)"
// Network is optional. Must contain " vs " to be parsed as a game.
// Home team is always UVA. Sport accepts abbreviation or full name; always stored as abbreviation.
const SPORT_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SPORTS).map(([abbrev, name]) => [name.toUpperCase(), abbrev])
);

function normalizeSport(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (SPORTS[upper] !== undefined) return upper;
  return SPORT_REVERSE[upper] ?? upper;
}

function parseEvent(evt: CalEvent): ParsedEvent {
  const date = evt.start.dateTime ? new Date(evt.start.dateTime)
    : (() => { const [y,m,d] = (evt.start.date!).split('-').map(Number); return new Date(y,m-1,d); })();

  const m = evt.summary.match(/^(.+?)\s*-\s*(.+?)\s+vs\s+(.+?)(?:\s*\(([^)]+)\))?\s*$/i);
  if (!m) return { kind: 'raw', data: { id: evt.id, date, raw: evt.summary } };

  const [, position, sport, opponent, network] = m;
  return {
    kind: 'game',
    data: {
      id: evt.id,
      date,
      sport:       normalizeSport(sport),
      awayAbbrev:  opponent.trim().toUpperCase(),
      homeAbbrev:  'UVA',
      neutral:     false,
      network:     network ? network.trim().toUpperCase() : null,
      position:    position.trim().toUpperCase(),
      raw:         evt.summary,
    },
  };
}

// ── Team logo ─────────────────────────────────────────────────────────────────

function TeamLogo({ abbrev, sport, size }: { abbrev: string; sport: string; size: number }) {
  const key = abbrev.toUpperCase().replace(/\s+/g, '_');
  const info = TEAMS[`${sport}:${key}`] ?? TEAMS[key];
  const [failed, setFailed] = useState(false);

  const label = info?.shortName ?? abbrev;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      {info && !failed ? (
        <img
          src={espnLogoUrl(info.id)}
          alt={info.name}
          title={info.name}
          width={size}
          height={size}
          style={{ objectFit: 'contain', flexShrink: 0 }}
          onError={() => setFailed(true)}
        />
      ) : (
        <div style={{ width: size, height: size, flexShrink: 0 }} />
      )}
      <span style={{ color: '#d0d0ff', fontFamily: 'monospace', fontWeight: 'bold', fontSize: size * 0.38, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
}

// ── Network badge ─────────────────────────────────────────────────────────────

function NetworkBadge({ network }: { network: string }) {
  const info = NETWORKS[network];
  const [failed, setFailed] = useState(false);

  if (info && !failed) {
    const scale = info.scale ?? 1;
    return (
      <img
        src={info.url}
        alt={network}
        title={network}
        style={{ height: 84 * scale, maxWidth: 216 * scale, objectFit: 'contain' }}
        onError={() => setFailed(true)}
      />
    );
  }
  // Unknown network — display raw text as a badge
  return (
    <span style={{ color: '#888', fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', letterSpacing: '0.08em', border: '1px solid #333', borderRadius: 3, padding: '2px 8px' }}>
      {network}
    </span>
  );
}

// ── Sport badge ───────────────────────────────────────────────────────────────

function SportBadge({ sport }: { sport: string }) {
  const color = '#888';
  const label = SPORTS[sport] ?? sport;
  return (
    <span style={{
      color,
      fontFamily: 'monospace',
      fontSize: 11,
      fontWeight: 'bold',
      letterSpacing: '0.1em',
      border: `1px solid ${color}`,
      borderRadius: 3,
      padding: '2px 8px',
      opacity: 0.85,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ── Game card ─────────────────────────────────────────────────────────────────

function GameCard({ game }: { game: GameEvent }) {
  const timeStr = game.date ? game.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  const dateStr = game.date ? game.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';

  const isCanceled  = /\(cancel+ed\)/i.test(game.position);
  const isHoovision = /hoovision/i.test(game.position);
  const displayPosition = game.position
    .replace(/\s*\(cancel+ed\)/i, '')
    .replace(/\s*\(hoovision\)/i, '')
    .replace(/hoovision/i, '')
    .trim();
  const networkSlot = isHoovision ? 'HOOVISION' : game.network;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '10px 20px',
      background: 'rgba(170,170,255,0.04)',
      border: '1px solid rgba(170,170,255,0.1)',
      borderRadius: 6,
    }}>
      {/* Position */}
      <div style={{ flexShrink: 0, width: 110, textAlign: 'center' }}>
        <div style={{ color: '#555', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', marginBottom: 2 }}>POSITION</div>
        <div style={{ color: '#e0e0ff', fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold', letterSpacing: '0.1em', lineHeight: 1.25 }}>{displayPosition}</div>
      </div>

      {/* Sport */}
      <div style={{ flexShrink: 0 }}>
        <SportBadge sport={game.sport} />
      </div>

      {/* Matchup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0, justifyContent: 'center', overflow: 'hidden' }}>
        <TeamLogo abbrev={game.awayAbbrev} sport={game.sport} size={48} />
        <span style={{ color: '#444', fontFamily: 'monospace', fontSize: 22, fontWeight: 'bold', flexShrink: 0 }}>
          {game.neutral ? 'VS' : '@'}
        </span>
        <TeamLogo abbrev={game.homeAbbrev} sport={game.sport} size={48} />
      </div>

      {/* Network / Hoovision */}
      {networkSlot !== null && (
        <div style={{ flexShrink: 0 }}>
          {isHoovision ? (
            <span style={{ color: '#e0e0ff', fontFamily: 'monospace', fontSize: 15, fontWeight: 'bold', letterSpacing: '0.08em' }}>HOOVISION</span>
          ) : (
            <NetworkBadge network={networkSlot!} />
          )}
        </div>
      )}

      {/* Date / time */}
      <div style={{ minWidth: 110, flexShrink: 0, textAlign: 'right', position: 'relative' }}>
        <div style={{ color: isCanceled ? '#444' : '#7777bb', fontFamily: 'monospace', fontSize: 15, letterSpacing: '0.05em' }}>{dateStr}</div>
        <div style={{ color: isCanceled ? '#333' : '#aaaaff', fontFamily: 'monospace', fontSize: 20, fontWeight: 'bold' }}>{timeStr}</div>
        {isCanceled && (
          <>
            <svg
              viewBox="0 0 110 46"
              style={{ position: 'absolute', inset: 0, width: '100%', height: 46, pointerEvents: 'none' }}
            >
              <path d="M4,4 Q58,26 106,42" stroke="#cc2222" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.88" />
              <path d="M106,4 Q52,22 4,42" stroke="#cc2222" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.88" />
            </svg>
            <div style={{ color: '#cc2222', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: '0.15em', marginTop: 4, textAlign: 'center' }}>CANCELED</div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Raw (unparsed) event ──────────────────────────────────────────────────────

function RawCard({ evt }: { evt: UnparsedEvent }) {
  const dateStr = evt.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24,
      padding: '14px 28px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid #222',
      borderRadius: 6,
    }}>
      <span style={{ color: '#555', fontFamily: 'monospace', fontSize: 14, minWidth: 110 }}>{dateStr}</span>
      <span style={{ color: '#666', fontFamily: 'monospace', fontSize: 16 }}>{evt.raw}</span>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

const PER_PAGE = 3;

function NavButton({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: 'none',
      border: '1px solid #333',
      color: disabled ? '#333' : ACCENT,
      fontFamily: 'monospace',
      fontSize: 20,
      width: 40, height: 40,
      borderRadius: 4,
      cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {children}
    </button>
  );
}

export default function SchedulePage() {
  const [events, setEvents]   = useState<CalEvent[]>(cachedEvents ?? []);
  const [loading, setLoading] = useState(cachedEvents === null);
  const [page, setPage]       = useState(sharedPage);

  // Keep all instances (multiviewer, preview, program) in sync
  useEffect(() => {
    const handler = () => setPage(sharedPage);
    window.addEventListener('schedule-page', handler);
    return () => window.removeEventListener('schedule-page', handler);
  }, []);

  useEffect(() => {
    if (cachedEvents !== null && Date.now() - cacheTime < CACHE_TTL) {
      setEvents(cachedEvents); setLoading(false); return;
    }
    const tMin = new Date(); tMin.setFullYear(tMin.getFullYear() - 1);
    const tMax = new Date(); tMax.setFullYear(tMax.getFullYear() + 2);
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events` +
      `?key=${API_KEY}&timeMin=${encodeURIComponent(tMin.toISOString())}` +
      `&timeMax=${encodeURIComponent(tMax.toISOString())}` +
      `&maxResults=500&singleEvents=true&orderBy=startTime`;
    fetch(url)
      .then(r => r.json())
      .then(data => { cachedEvents = data.items ?? []; cacheTime = Date.now(); setEvents(cachedEvents!); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ width: '100%', height: '100%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: ACCENT, fontFamily: 'monospace', fontSize: 28, letterSpacing: '0.15em' }}>LOADING...</span>
    </div>
  );

  const now    = new Date();
  const parsed = events.map(parseEvent);
  const past     = parsed.filter(e => e.data.date < now); // chronological, oldest first
  const upcoming = parsed.filter(e => e.data.date >= now); // soonest first

  const isViewingPast      = page < 0;
  const totalPastPages     = Math.ceil(past.length / PER_PAGE);
  const totalUpcomingPages = Math.max(1, Math.ceil(upcoming.length / PER_PAGE));

  let pageItems: ReturnType<typeof parseEvent>[];
  let pageDisplay = '';
  if (isViewingPast) {
    const pastPageIdx = (-page) - 1; // 0 = most recent past page
    const endIdx   = past.length - pastPageIdx * PER_PAGE;
    const startIdx = Math.max(0, endIdx - PER_PAGE);
    pageItems = past.slice(startIdx, endIdx); // oldest at top, most recent at bottom
    if (totalPastPages > 1) pageDisplay = `${pastPageIdx + 1} / ${totalPastPages}`;
  } else {
    pageItems = upcoming.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    if (totalUpcomingPages > 1) pageDisplay = `${page + 1} / ${totalUpcomingPages}`;
  }

  const canGoPrev  = page > -totalPastPages;
  const canGoNext  = page < totalUpcomingPages - 1;
  const label      = isViewingPast ? 'PAST GAMES' : 'UPCOMING SCHEDULE';
  const labelColor = isViewingPast ? '#7777bb' : ACCENT;

  return (
    <div style={{ width: '100%', height: '100%', background: BG, padding: '36px 44px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      {/* Header — arrows on left to stay clear of watermark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, borderBottom: '1px solid rgba(170,170,255,0.2)', paddingBottom: 14 }}>
        <NavButton onClick={() => setSharedPage(page - 1)} disabled={!canGoPrev}>◀</NavButton>
        <NavButton onClick={() => setSharedPage(page + 1)} disabled={!canGoNext}>▶</NavButton>
        <span style={{ color: labelColor, fontFamily: 'monospace', fontSize: 28, fontWeight: 'bold', letterSpacing: '0.15em' }}>
          {label}
        </span>
        {pageDisplay && (
          <span style={{ color: '#444', fontFamily: 'monospace', fontSize: 14, marginLeft: 'auto', paddingRight: '12%' }}>
            {pageDisplay}
          </span>
        )}
      </div>

      {pageItems.length === 0 ? (
        <div style={{ color: '#555', fontFamily: 'monospace', fontSize: 22, letterSpacing: '0.1em' }}>
          {isViewingPast ? 'NO PAST GAMES' : 'NO UPCOMING EVENTS'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {pageItems.map(e =>
            e.kind === 'game'
              ? <GameCard key={e.data.id} game={e.data} />
              : <RawCard  key={e.data.id} evt={e.data} />
          )}
        </div>
      )}
    </div>
  );
}
