import { useEffect, useState, useCallback, useRef } from 'react';
import TEAMS, { espnLogoUrl } from '../data/teams';
import NETWORKS from '../data/networks';
import SPORTS from '../data/sports';
import {
  type CalEvent, type GameEvent, type UnparsedEvent,
  CANCELED_REGEX, HOOVISION_REGEX, parseEvent, stripPositionTags,
} from './scheduleUtils';

const CALENDAR_ID = 'e398559c5a1cbfb6b616fe196ad845c4dd30721af94e6c14efb47ad0a4488993@group.calendar.google.com';
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY as string;
const CACHE_TTL = 5 * 60 * 1000;

const BG     = '#0a0a1a';
const ACCENT = '#aaaaff';

function useMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  const handler = useCallback(() => setMobile(window.innerWidth < 768), []);
  useEffect(() => {
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [handler]);
  return mobile;
}

let cachedEvents: CalEvent[] | null = null;
let cacheTime = 0;
let sharedPage = 0;

function setSharedPage(p: number) {
  sharedPage = p;
  window.dispatchEvent(new CustomEvent('schedule-page'));
}

// ── Team logo ─────────────────────────────────────────────────────────────────

function TeamLogo({ abbrev, sport, size, wrap = false }: { abbrev: string; sport: string; size: number; wrap?: boolean }) {
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
      <span style={{ color: '#d0d0ff', fontFamily: 'monospace', fontWeight: 'bold', fontSize: size * 0.38, letterSpacing: '0.04em', whiteSpace: wrap ? 'normal' : 'nowrap', wordBreak: wrap ? 'break-word' : undefined, lineHeight: wrap ? 1.2 : undefined }}>
        {label}
      </span>
    </div>
  );
}

// ── Network badge ─────────────────────────────────────────────────────────────

function NetworkBadge({ network, mobile = false }: { network: string; mobile?: boolean }) {
  const info = NETWORKS[network];
  const [failed, setFailed] = useState(false);

  if (info && !failed) {
    const scale = (info.scale ?? 1) * (mobile ? 0.55 : 1);
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
  return (
    <span style={{ color: '#888', fontFamily: 'monospace', fontSize: mobile ? 11 : 13, fontWeight: 'bold', letterSpacing: '0.08em', border: '1px solid #333', borderRadius: 3, padding: '2px 6px' }}>
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

// ── Live badge ────────────────────────────────────────────────────────────────

function LiveBadge({ liveUrl }: { liveUrl: string | null }) {
  const inner = (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'rgba(255,51,51,0.12)',
      border: '1px solid rgba(255,51,51,0.4)',
      borderRadius: 4,
      padding: '3px 8px',
    }}>
      <span style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: '#ff3333',
        animation: 'pulse-red 1.4s ease-in-out infinite',
        flexShrink: 0,
      }} />
      <span style={{ color: '#ff4444', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: '0.12em' }}>
        LIVE
      </span>
    </span>
  );
  if (liveUrl) {
    return (
      <a href={liveUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'inline-flex' }}>
        {inner}
      </a>
    );
  }
  return inner;
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 44,
        padding: '0 14px',
        background: 'rgba(170,170,255,0.08)',
        border: '1px solid rgba(170,170,255,0.3)',
        borderRadius: 4,
        color: ACCENT,
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: '0.1em',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {label}
    </a>
  );
}

// ── Game card ─────────────────────────────────────────────────────────────────

function GameCard({ game }: { game: GameEvent }) {
  const mobile = useMobile();
  const timeStr = game.date ? game.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  const dateStr = game.date ? game.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';

  const now = new Date();
  const isLive = game.date <= now && now <= game.endDate;
  const isPast = game.endDate < now;

  const liveBadge = isLive ? <LiveBadge liveUrl={game.liveUrl} /> : null;
  const actionButton =
    (isLive || !isPast) && game.liveUrl   ? <ActionButton href={game.liveUrl} label="WATCH" />
    : isPast && game.recordingUrl         ? <ActionButton href={game.recordingUrl} label="▶ RECORDING" />
    : null;

  const isCanceled  = CANCELED_REGEX.test(game.position);
  const isHoovision = HOOVISION_REGEX.test(game.position);
  const displayPosition = stripPositionTags(game.position);
  const networkSlot = isHoovision ? 'HOOVISION' : game.network;

  const networkEl = networkSlot !== null ? (
    isHoovision
      ? <span style={{ color: '#e0e0ff', fontFamily: 'monospace', fontSize: mobile ? 12 : 15, fontWeight: 'bold', letterSpacing: '0.08em' }}>HOOVISION</span>
      : <NetworkBadge network={networkSlot!} mobile={mobile} />
  ) : null;

  const dateTimeEl = (
    <div style={{ position: 'relative', textAlign: mobile ? 'right' : 'right', flexShrink: 0 }}>
      <div style={{ color: isCanceled ? '#444' : '#7777bb', fontFamily: 'monospace', fontSize: mobile ? 12 : 15, letterSpacing: '0.05em' }}>{dateStr}</div>
      <div style={{ color: isCanceled ? '#333' : '#aaaaff', fontFamily: 'monospace', fontSize: mobile ? 15 : 20, fontWeight: 'bold' }}>{timeStr}</div>
      {isCanceled && (
        <>
          <svg viewBox="0 0 110 46" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <path d="M4,4 Q58,26 106,42" stroke="#cc2222" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.88" />
            <path d="M106,4 Q52,22 4,42" stroke="#cc2222" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.88" />
          </svg>
          <div style={{ color: '#cc2222', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: '0.15em', marginTop: 4, textAlign: 'center' }}>CANCELED</div>
        </>
      )}
    </div>
  );

  if (mobile) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '12px 14px',
        background: 'rgba(170,170,255,0.04)',
        border: '1px solid rgba(170,170,255,0.1)',
        borderRadius: 6,
      }}>
        {/* Row 1: sport + date/time */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <SportBadge sport={game.sport} />
            {liveBadge}
            <div style={{ color: '#555', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em' }}>POSITION</div>
            <div style={{ color: '#e0e0ff', fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', letterSpacing: '0.08em', lineHeight: 1.25 }}>{displayPosition}</div>
          </div>
          {dateTimeEl}
        </div>
        {/* Row 2: matchup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <TeamLogo abbrev={game.awayAbbrev} sport={game.sport} size={34} wrap />
          </div>
          <span style={{ color: '#444', fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold', flexShrink: 0 }}>
            {game.neutral ? 'VS' : '@'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TeamLogo abbrev={game.homeAbbrev} sport={game.sport} size={34} wrap />
          </div>
        </div>
        {/* Row 3: action button + network */}
        {(actionButton || networkEl) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>{actionButton}</div>
            {networkEl && <div style={{ marginLeft: 'auto' }}>{networkEl}</div>}
          </div>
        )}
      </div>
    );
  }

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

      {/* Desktop: combined WATCH LIVE button, or standalone badge/button */}
      {(isLive || actionButton) && (
        <div style={{ flexShrink: 0 }}>
          {isLive && game.liveUrl ? (
            <a href={game.liveUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              minHeight: 36,
              padding: '0 14px',
              background: 'rgba(255,51,51,0.1)',
              border: '1px solid rgba(255,51,51,0.45)',
              borderRadius: 4,
              color: '#ff4444',
              fontFamily: 'monospace',
              fontSize: 12,
              fontWeight: 'bold',
              letterSpacing: '0.12em',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: '#ff3333',
                animation: 'pulse-red 1.4s ease-in-out infinite',
                flexShrink: 0,
              }} />
              WATCH LIVE
            </a>
          ) : isLive ? (
            liveBadge
          ) : (
            actionButton
          )}
        </div>
      )}

      {/* Network / Hoovision */}
      {networkEl && <div style={{ flexShrink: 0 }}>{networkEl}</div>}

      {/* Date / time */}
      <div style={{ minWidth: 110, flexShrink: 0 }}>{dateTimeEl}</div>
    </div>
  );
}

// ── Raw (unparsed) event ──────────────────────────────────────────────────────

function RawCard({ evt }: { evt: UnparsedEvent }) {
  const mobile = useMobile();
  const dateStr = evt.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <div style={{
      display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'flex-start' : 'center', gap: mobile ? 4 : 24,
      padding: mobile ? '10px 14px' : '14px 28px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid #222',
      borderRadius: 6,
    }}>
      <span style={{ color: '#555', fontFamily: 'monospace', fontSize: mobile ? 11 : 14, minWidth: mobile ? 0 : 110 }}>{dateStr}</span>
      <span style={{ color: '#666', fontFamily: 'monospace', fontSize: mobile ? 13 : 16 }}>{evt.raw}</span>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

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

export default function SchedulePage({ perPage = 3, fullPage = false }: { perPage?: number; fullPage?: boolean }) {
  const mobile = useMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [events, setEvents]   = useState<CalEvent[]>(cachedEvents ?? []);
  const [loading, setLoading] = useState(cachedEvents === null);
  // Full-page view has its own independent page state; switcher instances share sharedPage
  const [page, setPage] = useState(fullPage ? 0 : sharedPage);
  const [showAll, setShowAll] = useState(false);

  const navigate = (p: number) => {
    if (fullPage) setPage(p);
    else setSharedPage(p);
    containerRef.current?.scrollTo({ top: 0 });
  };

  // Keep switcher instances in sync via shared page
  useEffect(() => {
    if (fullPage) return;
    const handler = () => setPage(sharedPage);
    window.addEventListener('schedule-page', handler);
    return () => window.removeEventListener('schedule-page', handler);
  }, [fullPage]);

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
  const cutoff = (e: ReturnType<typeof parseEvent>) =>
    e.kind === 'game' ? e.data.endDate : e.data.date;
  const past     = parsed.filter(e => cutoff(e) < now);
  const upcoming = parsed.filter(e => cutoff(e) >= now);

  const isViewingPast      = page < 0;
  const totalPastPages     = Math.ceil(past.length / perPage);
  const totalUpcomingPages = Math.max(1, Math.ceil(upcoming.length / perPage));

  let pageItems: ReturnType<typeof parseEvent>[];
  let pageDisplay = '';
  if (isViewingPast) {
    const pastPageIdx = (-page) - 1;
    const endIdx   = past.length - pastPageIdx * perPage;
    const startIdx = Math.max(0, endIdx - perPage);
    pageItems = past.slice(startIdx, endIdx).reverse();
    if (totalPastPages > 1) pageDisplay = `${pastPageIdx + 1} / ${totalPastPages}`;
  } else {
    pageItems = upcoming.slice(page * perPage, (page + 1) * perPage);
    if (totalUpcomingPages > 1) pageDisplay = `${page + 1} / ${totalUpcomingPages}`;
  }

  const canGoPrev  = page > -totalPastPages;
  const canGoNext  = page < totalUpcomingPages - 1;
  const label      = isViewingPast ? 'PAST GAMES' : 'UPCOMING SCHEDULE';
  const labelColor = isViewingPast ? '#7777bb' : ACCENT;

  const padding = fullPage
    ? (mobile ? '20px 16px' : '48px 64px')
    : '36px 44px';
  const allItems = [...past, ...upcoming].reverse();
  const titleSize = fullPage ? (mobile ? 22 : 36) : 28;

  return (
    <div ref={containerRef} style={{ width: '100%', height: fullPage ? '100vh' : '100%', background: BG, padding, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: mobile ? 10 : 16, marginBottom: mobile ? 14 : 20, borderBottom: '1px solid rgba(170,170,255,0.2)', paddingBottom: mobile ? 10 : 14, flexShrink: 0 }}>
        {!showAll && <NavButton onClick={() => navigate(page - 1)} disabled={!canGoPrev}>◀</NavButton>}
        {!showAll && <NavButton onClick={() => navigate(page + 1)} disabled={!canGoNext}>▶</NavButton>}
        <span style={{ color: showAll ? ACCENT : labelColor, fontFamily: 'monospace', fontSize: titleSize, fontWeight: 'bold', letterSpacing: '0.15em' }}>
          {showAll ? 'ALL GAMES' : label}
        </span>
        {!showAll && pageDisplay && (
          <span style={{ color: '#444', fontFamily: 'monospace', fontSize: 14, marginLeft: 'auto', paddingRight: fullPage ? 0 : '12%' }}>
            {pageDisplay}
          </span>
        )}
        {fullPage && (
          <button
            onClick={() => setShowAll(v => !v)}
            style={{
              marginLeft: showAll || !pageDisplay ? 'auto' : undefined,
              background: 'none',
              border: `1px solid ${showAll ? ACCENT : '#333'}`,
              color: showAll ? ACCENT : '#555',
              fontFamily: 'monospace',
              fontSize: mobile ? 11 : 12,
              letterSpacing: '0.1em',
              padding: mobile ? '4px 10px' : '6px 16px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {showAll ? 'PAGINATE' : 'SHOW ALL'}
          </button>
        )}
      </div>

      {(showAll ? allItems : pageItems).length === 0 ? (
        <div style={{ color: '#555', fontFamily: 'monospace', fontSize: mobile ? 16 : 22, letterSpacing: '0.1em' }}>
          {isViewingPast ? 'NO PAST GAMES' : 'NO UPCOMING EVENTS'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 10 : fullPage ? 14 : 10, flex: showAll ? undefined : 1 }}>
          {(showAll ? allItems : pageItems).map(e =>
            e.kind === 'game'
              ? <GameCard key={e.data.id} game={e.data} />
              : <RawCard  key={e.data.id} evt={e.data} />
          )}
        </div>
      )}
      {mobile && !showAll && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 16, flexShrink: 0 }}>
          <NavButton onClick={() => navigate(page - 1)} disabled={!canGoPrev}>◀</NavButton>
          <NavButton onClick={() => navigate(page + 1)} disabled={!canGoNext}>▶</NavButton>
        </div>
      )}
      <div style={{ flexShrink: 0, height: mobile ? 24 : 48 }} />
    </div>
  );
}
