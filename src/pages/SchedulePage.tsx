import { useEffect, useState, useCallback, useRef } from 'react';
import TEAMS, { espnLogoUrl } from '../data/teams';
import NETWORKS from '../data/networks';
import SPORTS from '../data/sports';
import {
  type CalEvent, type GameEvent, type UnparsedEvent,
  CANCELED_REGEX, HOOVISION_REGEX, parseEvent, stripPositionTags,
} from './scheduleUtils';
import './SchedulePage.css';

const CACHE_TTL = 5 * 60 * 1000;

const BG          = '#07090e';
const ACCENT      = '#5b82ff';
const ACCENT_DIM  = 'rgba(91,130,255,0.1)';
const ACCENT_RING = 'rgba(91,130,255,0.28)';
const LIVE_RED    = '#e83535';
const LIVE_DIM    = 'rgba(232,53,53,0.09)';
const LIVE_RING   = 'rgba(232,53,53,0.32)';
const TEXT        = '#c8d4f0';
const TEXT_MUTED  = '#4a5570';
const TEXT_DIM    = '#2a3048';
const SURFACE     = 'rgba(255,255,255,0.025)';
const BORDER      = 'rgba(255,255,255,0.07)';
const MONO        = "'JetBrains Mono', 'Courier New', monospace";
const DISPLAY     = "'Barlow Condensed', sans-serif";

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

function TeamLogo({ abbrev, sport, size, reverse = false }: { abbrev: string; sport: string; size: number; wrap?: boolean; reverse?: boolean }) {
  const key = abbrev.toUpperCase().replace(/\s+/g, '_');
  const info = TEAMS[`${sport}:${key}`] ?? TEAMS[key];
  const [failed, setFailed] = useState(false);

  const label = info?.shortName ?? abbrev;
  const logo = info && !failed ? (
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
  );

  const nameSpan = (
    <span style={{
      color: TEXT,
      fontFamily: MONO,
      fontWeight: 700,
      fontSize: size * 0.36,
      letterSpacing: '0.04em',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      lineHeight: 1.2,
    }}>
      {label}
    </span>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {reverse ? <>{nameSpan}{logo}</> : <>{logo}{nameSpan}</>}
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
    <span style={{
      color: TEXT_MUTED,
      fontFamily: MONO,
      fontSize: mobile ? 10 : 12,
      fontWeight: 700,
      letterSpacing: '0.1em',
      border: `1px solid rgba(255,255,255,0.1)`,
      borderRadius: 3,
      padding: '2px 7px',
    }}>
      {network}
    </span>
  );
}

// ── Sport badge ───────────────────────────────────────────────────────────────

function SportBadge({ sport }: { sport: string }) {
  const label = SPORTS[sport] ?? sport;
  return (
    <span style={{
      color: TEXT_MUTED,
      fontFamily: MONO,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.12em',
      border: `1px solid rgba(74,85,112,0.5)`,
      borderRadius: 3,
      padding: '2px 7px',
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
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: LIVE_DIM,
      border: `1px solid ${LIVE_RING}`,
      borderRadius: 4,
      padding: '4px 9px',
    }}>
      <span className="sched-live-dot" style={{
        display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
        background: LIVE_RED, flexShrink: 0,
      }} />
      <span style={{ color: LIVE_RED, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em' }}>
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

// ── Countdown button ──────────────────────────────────────────────────────────

function CountdownButton({ href, countdown }: { href: string; countdown: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="sched-btn" style={{
      display: 'inline-flex', alignItems: 'center', gap: 9,
      minHeight: 40,
      padding: '0 13px',
      background: ACCENT_DIM,
      border: `1px solid ${ACCENT_RING}`,
      borderRadius: 4,
      color: ACCENT,
      fontFamily: MONO,
      textDecoration: 'none',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 12, opacity: 0.8 }}>▶</span>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.16em', opacity: 0.55 }}>STARTS IN</span>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em' }}>{countdown}</span>
      </span>
    </a>
  );
}

// ── Watch Live button ─────────────────────────────────────────────────────────

function WatchLiveButton({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="sched-watch-btn" style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      minHeight: 40,
      padding: '0 13px',
      background: LIVE_DIM,
      border: `1px solid ${LIVE_RING}`,
      borderRadius: 4,
      color: LIVE_RED,
      fontFamily: MONO,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.13em',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
    }}>
      <span className="sched-live-dot" style={{
        display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
        background: LIVE_RED, flexShrink: 0,
      }} />
      WATCH LIVE
    </a>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="sched-btn"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 40,
        padding: '0 13px',
        background: ACCENT_DIM,
        border: `1px solid ${ACCENT_RING}`,
        borderRadius: 4,
        color: ACCENT,
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.11em',
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
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = game.date ? game.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  const dateStr = game.date ? game.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';

  const end30        = new Date(game.endDate.getTime() + 30 * 60_000);
  const end60        = new Date(game.endDate.getTime() + 60 * 60_000);
  const recordingExpiry = new Date(game.date); recordingExpiry.setMonth(recordingExpiry.getMonth() + 1);
  const inPreStart   = now >= new Date(game.date.getTime() - 5 * 60_000) && now < game.date;
  const isLive       = game.date <= now && now <= game.endDate;
  const inWatchBuffer = now > game.endDate && now <= end30;
  const inPastWatch  = now > end30 && now <= end60;
  const isPast       = now > end60;

  const secsLeft  = inPreStart ? Math.max(0, Math.ceil((game.date.getTime() - now.getTime()) / 1000)) : 0;
  const countdown = `${Math.floor(secsLeft / 60)}:${(secsLeft % 60).toString().padStart(2, '0')}`;

  const liveBadge = isLive ? <LiveBadge liveUrl={game.liveUrl} /> : null;

  const actionButton =
    game.recordingUrl && now < recordingExpiry             ? <ActionButton href={game.recordingUrl} label="▶ RECORDING" />
    : inPreStart && game.liveUrl                           ? <CountdownButton href={game.liveUrl} countdown={countdown} />
    : (isLive || inWatchBuffer) && game.liveUrl            ? <ActionButton href={game.liveUrl} label="WATCH" />
    : inPastWatch && game.liveUrl                          ? <WatchLiveButton href={game.liveUrl} />
    : null;

  const isCanceled  = CANCELED_REGEX.test(game.position);
  const isHoovision = HOOVISION_REGEX.test(game.position);
  const displayPosition = stripPositionTags(game.position);
  const networkSlot = isHoovision ? 'HOOVISION' : game.network;

  const networkEl = networkSlot !== null ? (
    isHoovision
      ? <span style={{ color: TEXT, fontFamily: MONO, fontSize: mobile ? 12 : 14, fontWeight: 700, letterSpacing: '0.08em' }}>HOOVISION</span>
      : <NetworkBadge network={networkSlot!} mobile={mobile} />
  ) : null;

  // Determine left-border accent color based on event state
  const borderLeftColor =
    isCanceled          ? 'rgba(180,50,50,0.35)'
    : isLive || inWatchBuffer ? LIVE_RED
    : inPreStart        ? 'rgba(255,185,55,0.6)'
    : isPast            ? 'rgba(42,52,80,0.7)'
    : ACCENT_RING;

  const cardBg = (isLive || inWatchBuffer) ? `rgba(232,53,53,0.04)` : SURFACE;

  const dateTimeEl = (
    <div style={{ textAlign: 'right', flexShrink: 0, position: 'relative' }}>
      <div style={{ color: isCanceled ? TEXT_DIM : TEXT_MUTED, fontFamily: MONO, fontSize: mobile ? 10 : 11, letterSpacing: '0.06em', marginBottom: 3 }}>{dateStr}</div>
      <div style={{ color: isCanceled ? TEXT_DIM : ACCENT, fontFamily: MONO, fontSize: mobile ? 15 : 19, fontWeight: 700, letterSpacing: '0.03em' }}>{timeStr}</div>
      {isCanceled && (
        <>
          <svg viewBox="0 0 110 46" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <path d="M4,4 Q58,26 106,42" stroke="#cc2222" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.88" />
            <path d="M106,4 Q52,22 4,42" stroke="#cc2222" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.88" />
          </svg>
          <div style={{ color: '#cc2222', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', marginTop: 4, textAlign: 'center' }}>CANCELED</div>
        </>
      )}
    </div>
  );

  if (mobile) {
    return (
      <div className="sched-card" style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: '12px 14px',
        background: cardBg,
        border: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${borderLeftColor}`,
        borderRadius: 5,
      }}>
        {/* Row 1: sport + date/time */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <SportBadge sport={game.sport} />
            <div style={{ color: TEXT, fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: '0.07em', lineHeight: 1.25 }}>{displayPosition}</div>
          </div>
          {dateTimeEl}
        </div>
        {/* Row 2: matchup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <TeamLogo abbrev={game.awayAbbrev} sport={game.sport} size={28} wrap />
          </div>
          <span style={{ color: TEXT_DIM, fontFamily: MONO, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {game.neutral ? 'VS' : '@'}
          </span>
          <div style={{ flex: 1 }}>
            <TeamLogo abbrev={game.homeAbbrev} sport={game.sport} size={28} wrap reverse />
          </div>
        </div>
        {/* Row 3: action button + network */}
        {(!game.recordingUrl && isLive && game.liveUrl
          ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <WatchLiveButton href={game.liveUrl} />
              {networkEl && <div style={{ marginLeft: 'auto' }}>{networkEl}</div>}
            </div>
          : (!game.recordingUrl && isLive)
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                {liveBadge}
                {networkEl && <div style={{ marginLeft: 'auto' }}>{networkEl}</div>}
              </div>
            : (actionButton || networkEl)
              ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div>{actionButton}</div>
                  {networkEl && <div style={{ marginLeft: 'auto' }}>{networkEl}</div>}
                </div>
              : null
        )}
      </div>
    );
  }

  return (
    <div className="sched-card" style={{
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '10px 20px',
      background: cardBg,
      border: `1px solid ${BORDER}`,
      borderLeft: `3px solid ${borderLeftColor}`,
      borderRadius: 5,
    }}>
      {/* Position */}
      <div style={{ flexShrink: 0, width: 110, textAlign: 'center' }}>
        <div style={{ color: TEXT_MUTED, fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', marginBottom: 3 }}>ROLE</div>
        <div style={{ color: TEXT, fontFamily: MONO, fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.25 }}>{displayPosition}</div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: 'stretch', background: BORDER, flexShrink: 0 }} />

      {/* Sport */}
      <div style={{ flexShrink: 0 }}>
        <SportBadge sport={game.sport} />
      </div>

      {/* Matchup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0, justifyContent: 'center' }}>
        <TeamLogo abbrev={game.awayAbbrev} sport={game.sport} size={42} />
        <span style={{ color: TEXT_DIM, fontFamily: MONO, fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
          {game.neutral ? 'VS' : '@'}
        </span>
        <TeamLogo abbrev={game.homeAbbrev} sport={game.sport} size={42} reverse />
      </div>

      {/* Action area */}
      {(isLive || actionButton) && (
        <div style={{ flexShrink: 0 }}>
          {!game.recordingUrl && isLive && game.liveUrl ? (
            <WatchLiveButton href={game.liveUrl} />
          ) : !game.recordingUrl && isLive ? (
            liveBadge
          ) : (
            actionButton
          )}
        </div>
      )}

      {/* Network / Hoovision */}
      {networkEl && <div style={{ flexShrink: 0 }}>{networkEl}</div>}

      {/* Date / time */}
      <div style={{ minWidth: 110, flexShrink: 0, position: 'relative' }}>{dateTimeEl}</div>
    </div>
  );
}

// ── Raw (unparsed) event ──────────────────────────────────────────────────────

function RawCard({ evt }: { evt: UnparsedEvent }) {
  const mobile = useMobile();
  const dateStr = evt.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <div className="sched-card" style={{
      display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'flex-start' : 'center', gap: mobile ? 4 : 24,
      padding: mobile ? '10px 14px' : '12px 20px',
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderLeft: `3px solid rgba(74,85,112,0.35)`,
      borderRadius: 5,
    }}>
      <span style={{ color: TEXT_MUTED, fontFamily: MONO, fontSize: mobile ? 10 : 11, minWidth: mobile ? 0 : 110, letterSpacing: '0.06em' }}>{dateStr}</span>
      <span style={{ color: 'rgba(200,212,240,0.45)', fontFamily: MONO, fontSize: mobile ? 13 : 14 }}>{evt.raw}</span>
    </div>
  );
}

// ── Nav button ────────────────────────────────────────────────────────────────

function NavButton({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className="sched-nav" style={{
      background: 'none',
      border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'}`,
      color: disabled ? TEXT_DIM : TEXT_MUTED,
      fontFamily: MONO,
      fontSize: 16,
      width: 36, height: 36,
      borderRadius: 4,
      cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      lineHeight: 1,
    }}>
      {children}
    </button>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function SchedulePage({ perPage = 3, fullPage = false }: { perPage?: number; fullPage?: boolean }) {
  const mobile = useMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [events, setEvents]   = useState<CalEvent[]>(cachedEvents ?? []);
  const [loading, setLoading] = useState(cachedEvents === null);
  const [page, setPage] = useState(fullPage ? 0 : sharedPage);
  const [showAll, setShowAll] = useState(false);

  const navigate = (p: number) => {
    if (fullPage) setPage(p);
    else setSharedPage(p);
    containerRef.current?.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (fullPage) return;
    const handler = () => setPage(sharedPage);
    window.addEventListener('schedule-page', handler);
    return () => window.removeEventListener('schedule-page', handler);
  }, [fullPage]);

  useEffect(() => {
    if (cachedEvents !== null && Date.now() - cacheTime < CACHE_TTL) return;
    const tMin = new Date(); tMin.setFullYear(tMin.getFullYear() - 1);
    const tMax = new Date(); tMax.setFullYear(tMax.getFullYear() + 2);
    const url =
      `/api/calendar?timeMin=${encodeURIComponent(tMin.toISOString())}` +
      `&timeMax=${encodeURIComponent(tMax.toISOString())}`;
    fetch(url)
      .then(r => r.json())
      .then(data => { cachedEvents = data.items ?? []; cacheTime = Date.now(); setEvents(cachedEvents!); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ width: '100%', height: '100%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: TEXT_MUTED, fontFamily: MONO, fontSize: 13, letterSpacing: '0.2em' }}>LOADING…</span>
    </div>
  );

  const now    = new Date();
  const parsed = events.map(parseEvent);
  const cutoff = (e: ReturnType<typeof parseEvent>) => {
    if (e.kind !== 'game') return e.data.date;
    return new Date(e.data.endDate.getTime() + 30 * 60_000);
  };
  const past = parsed.filter(e =>
    (e.kind === 'game' && !!e.data.recordingUrl) || cutoff(e) < now
  );
  const upcoming = parsed.filter(e =>
    !(e.kind === 'game' && !!e.data.recordingUrl) && cutoff(e) >= now
  );

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
  const titleColor = isViewingPast ? TEXT_MUTED : TEXT;

  const padding = fullPage
    ? (mobile ? '20px 16px' : '48px 64px')
    : '36px 44px';
  const allItems = [...past, ...upcoming].reverse();
  const titleSize = fullPage ? (mobile ? 24 : 38) : 30;

  return (
    <div ref={containerRef} style={{
      width: '100%', height: '100%',
      background: BG, padding, boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', overflow: 'auto',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap',
        gap: mobile ? 8 : 14,
        marginBottom: mobile ? 14 : 20,
        paddingBottom: mobile ? 12 : 16,
        borderBottom: `1px solid ${BORDER}`,
        flexShrink: 0,
      }}>
        {!showAll && (
          <div style={{ display: 'flex', gap: 6 }}>
            <NavButton onClick={() => navigate(page - 1)} disabled={!canGoPrev}>‹</NavButton>
            <NavButton onClick={() => navigate(page + 1)} disabled={!canGoNext}>›</NavButton>
          </div>
        )}

        <span style={{
          color: showAll ? TEXT : titleColor,
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: titleSize,
          letterSpacing: '0.08em',
          lineHeight: 1,
        }}>
          {showAll ? 'ALL GAMES' : label}
        </span>

        {!showAll && pageDisplay && (
          <span style={{ color: TEXT_DIM, fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', marginLeft: 4 }}>
            {pageDisplay}
          </span>
        )}

        {fullPage && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="sched-toggle"
            style={{
              marginLeft: 'auto',
              background: showAll ? ACCENT_DIM : 'none',
              border: `1px solid ${showAll ? ACCENT_RING : 'rgba(255,255,255,0.1)'}`,
              color: showAll ? ACCENT : TEXT_MUTED,
              fontFamily: MONO,
              fontSize: mobile ? 10 : 11,
              letterSpacing: '0.12em',
              padding: mobile ? '4px 10px' : '5px 14px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {showAll ? 'PAGINATE' : 'SHOW ALL'}
          </button>
        )}
      </div>

      {/* Content */}
      {(showAll ? allItems : pageItems).length === 0 ? (
        <div style={{ color: TEXT_MUTED, fontFamily: MONO, fontSize: mobile ? 13 : 15, letterSpacing: '0.12em' }}>
          {isViewingPast ? 'NO PAST GAMES' : 'NO UPCOMING EVENTS'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 8 : fullPage ? 10 : 8, flex: showAll ? undefined : 1 }}>
          {(showAll ? allItems : pageItems).map(e =>
            e.kind === 'game'
              ? <GameCard key={e.data.id} game={e.data} />
              : <RawCard  key={e.data.id} evt={e.data} />
          )}
        </div>
      )}

      {mobile && !showAll && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, paddingTop: 16, flexShrink: 0 }}>
          <NavButton onClick={() => navigate(page - 1)} disabled={!canGoPrev}>‹</NavButton>
          <NavButton onClick={() => navigate(page + 1)} disabled={!canGoNext}>›</NavButton>
        </div>
      )}
      <div style={{ flexShrink: 0, height: mobile ? 24 : 48 }} />
    </div>
  );
}
