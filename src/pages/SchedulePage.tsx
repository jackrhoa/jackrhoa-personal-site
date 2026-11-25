import { useEffect, useState, useCallback, useRef } from 'react';
import TEAMS, { espnLogoUrl } from '../data/teams';
import NETWORKS from '../data/networks';
import SPORTS from '../data/sports';
import {
  type CalEvent, type GameEvent, type UnparsedEvent,
  CANCELED_REGEX, HOOVISION_REGEX, parseEvent, stripPositionTags,
} from './scheduleUtils';

const CACHE_TTL = 5 * 60 * 1000;

const LIVE_RED = '#e83535';
const labelClass = 'text-[13px] tracking-[0.1em] opacity-75 font-normal';
const linkClass = 'hover:opacity-60 transition-opacity';
const buttonClass = `inline-flex items-center justify-center gap-2 min-h-10 px-3 rounded border border-(--fg)/30 hover:bg-(--fg)/5 transition-colors whitespace-nowrap text-[12px] tracking-[0.1em]`;
const liveButtonClass = `inline-flex items-center justify-center gap-2 min-h-10 px-3 rounded border border-[#e83535]/50 hover:bg-[#e83535]/10 transition-colors whitespace-nowrap text-[12px] tracking-[0.1em] text-[#e83535]`;

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

function LiveDot() {
  return <span className="inline-block w-[7px] h-[7px] rounded-full shrink-0 animate-pulse" style={{ background: LIVE_RED }} />;
}

function TeamLogo({ abbrev, sport, size, reverse = false }: { abbrev: string; sport: string; size: number; reverse?: boolean }) {
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
      className="object-contain shrink-0"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="shrink-0" style={{ width: size, height: size }} />
  );

  const nameSpan = (
    <span className="text-sm md:text-lg leading-tight break-words">{label}</span>
  );

  return (
    <div className="flex items-center gap-2.5">
      {reverse ? <>{nameSpan}{logo}</> : <>{logo}{nameSpan}</>}
    </div>
  );
}

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
        className="object-contain"
        style={{ height: 84 * scale, maxWidth: 216 * scale }}
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className={`${labelClass} border border-(--fg)/30 rounded px-2 py-0.5`}>{network}</span>;
}

function SportBadge({ sport }: { sport: string }) {
  const label = SPORTS[sport] ?? sport;
  return <span className={`${labelClass} text-[11px] border border-(--fg)/30 rounded px-2 py-0.5 whitespace-nowrap`}>{label}</span>;
}

function LiveBadge({ liveUrl }: { liveUrl: string | null }) {
  const inner = (
    <span className="inline-flex items-center gap-1.5 rounded border border-[#e83535]/50 px-2 py-1 text-[12px] tracking-[0.1em] text-[#e83535]">
      <LiveDot />
      LIVE
    </span>
  );
  if (liveUrl) {
    return (
      <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
        {inner}
      </a>
    );
  }
  return inner;
}

function CountdownButton({ href, countdown }: { href: string; countdown: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass}>
      <span className="opacity-75">▶</span>
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[10px] opacity-60">STARTS IN</span>
        <span className="text-[13px]">{countdown}</span>
      </span>
    </a>
  );
}

function WatchLiveButton({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={liveButtonClass}>
      <LiveDot />
      WATCH LIVE
    </a>
  );
}

function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass}>
      {label}
    </a>
  );
}

function GameCard({ game }: { game: GameEvent }) {
  const mobile = useMobile();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const isMidnight = game.date && game.date.getHours() === 0 && game.date.getMinutes() === 0;
  const timeStr = !game.date ? '' : isMidnight ? 'TBA' : game.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
      ? <span className="text-[12px] md:text-[14px] tracking-[0.1em]">HOOVISION</span>
      : <NetworkBadge network={networkSlot!} mobile={mobile} />
  ) : null;

  const accentClass =
    isCanceled                ? 'border-l-(--fg)/15'
    : isLive || inWatchBuffer ? 'border-l-[#e83535]'
    : inPreStart              ? 'border-l-[#e0a030]'
    : isPast                  ? 'border-l-(--fg)/15'
    : 'border-l-(--fg)/50';

  const cardClass = `border border-(--fg)/15 border-l-[3px] ${accentClass} rounded hover:bg-(--fg)/[0.03] transition-colors`;

  const dateTimeEl = (
    <div className="text-right shrink-0 relative">
      <div className={`${labelClass} mb-1`}>{dateStr}</div>
      <div className="text-base md:text-xl">{timeStr}</div>
      {isCanceled && (
        <>
          <svg viewBox="0 0 110 46" className="absolute inset-0 w-full h-full pointer-events-none">
            <path d="M4,4 Q58,26 106,42" stroke="#cc2222" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.88" />
            <path d="M106,4 Q52,22 4,42" stroke="#cc2222" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.88" />
          </svg>
          <div className="text-[11px] tracking-[0.15em] mt-1 text-center text-[#cc2222]">CANCELED</div>
        </>
      )}
    </div>
  );

  const actionArea =
    !game.recordingUrl && isLive && game.liveUrl ? <WatchLiveButton href={game.liveUrl} />
    : !game.recordingUrl && isLive               ? liveBadge
    : actionButton;

  if (mobile) {
    return (
      <div className={`${cardClass} flex flex-col gap-3 px-4 py-3`}>
        <div className="flex items-start justify-between">
          <div className="flex flex-col items-start gap-1.5">
            <SportBadge sport={game.sport} />
            <div className="text-base leading-tight">{displayPosition}</div>
          </div>
          {dateTimeEl}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex justify-end">
            <TeamLogo abbrev={game.awayAbbrev} sport={game.sport} size={28} />
          </div>
          <span aria-label="at" className="opacity-60 shrink-0">@</span>
          <div className="flex-1">
            <TeamLogo abbrev={game.homeAbbrev} sport={game.sport} size={28} reverse />
          </div>
        </div>
        {(actionArea || networkEl) && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>{actionArea}</div>
            {networkEl && <div className="ml-auto">{networkEl}</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${cardClass} flex items-center gap-5 px-5 py-3`}>
      <div className="shrink-0 w-[120px] text-center">
        <div className={`${labelClass} text-[11px] mb-1`}>ROLE</div>
        <div className="text-base leading-tight">{displayPosition}</div>
      </div>

      <div className="w-px self-stretch bg-(--fg)/15 shrink-0" />

      <div className="shrink-0">
        <SportBadge sport={game.sport} />
      </div>

      <div className="flex items-center gap-4 flex-1 min-w-0 justify-center">
        <TeamLogo abbrev={game.awayAbbrev} sport={game.sport} size={42} />
        <span aria-label="at" className="opacity-60 text-lg shrink-0">@</span>
        <TeamLogo abbrev={game.homeAbbrev} sport={game.sport} size={42} reverse />
      </div>

      {actionArea && <div className="shrink-0">{actionArea}</div>}

      {networkEl && <div className="shrink-0">{networkEl}</div>}

      <div className="min-w-[110px] shrink-0 relative">{dateTimeEl}</div>
    </div>
  );
}

function RawCard({ evt }: { evt: UnparsedEvent }) {
  const dateStr = evt.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-6 px-4 py-2.5 md:px-5 md:py-3 border border-(--fg)/15 border-l-[3px] border-l-(--fg)/15 rounded hover:bg-(--fg)/[0.03] transition-colors">
      <span className={`${labelClass} md:min-w-[110px]`}>{dateStr}</span>
      <span className="opacity-75">{evt.raw}</span>
    </div>
  );
}

function NavButton({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 shrink-0 flex items-center justify-center rounded border border-(--fg)/30 text-lg leading-none transition-colors enabled:hover:bg-(--fg)/5 enabled:cursor-pointer disabled:opacity-25"
    >
      {children}
    </button>
  );
}

export default function SchedulePage({ perPage = 7 }: { perPage?: number }) {
  const mobile = useMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [events, setEvents]   = useState<CalEvent[]>(cachedEvents ?? []);
  const [loading, setLoading] = useState(cachedEvents === null);
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const navigate = (p: number) => {
    setPage(p);
    containerRef.current?.scrollTo({ top: 0 });
  };

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
    <div className="h-full flex items-center justify-center bg-(--bg) text-(--fg) font-serif">
      <span className={labelClass}>LOADING…</span>
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

  const canGoPrev = page > -totalPastPages;
  const canGoNext = page < totalUpcomingPages - 1;
  const title     = showAll ? 'All Games' : isViewingPast ? 'Past Games' : 'Upcoming Schedule';
  const allItems  = [...past, ...upcoming].reverse();
  const items     = showAll ? allItems : pageItems;

  const navButtons = (
    <div className="flex gap-2">
      <NavButton onClick={() => navigate(page - 1)} disabled={!canGoPrev}>‹</NavButton>
      <NavButton onClick={() => navigate(page + 1)} disabled={!canGoNext}>›</NavButton>
    </div>
  );

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-(--bg) text-(--fg) font-serif">
      <div className="w-full max-w-7xl mx-auto px-6 py-12 md:px-16 flex flex-col gap-8">
        <a href="/" className={`${labelClass} ${linkClass} self-start`}>HOME</a>

        <div className="flex items-center flex-wrap gap-3 md:gap-4 pb-4 border-b border-(--fg)/15">
          {!showAll && navButtons}
          <h1 className="text-3xl md:text-5xl font-normal leading-none">{title}</h1>
          {!showAll && pageDisplay && <span className={labelClass}>{pageDisplay}</span>}
          <button
            onClick={() => setShowAll(v => !v)}
            className={`${labelClass} ${linkClass} ml-auto cursor-pointer border border-(--fg)/30 rounded px-3 py-1 ${showAll ? 'bg-(--fg)/5' : ''}`}
          >
            {showAll ? 'PAGINATE' : 'SHOW ALL'}
          </button>
        </div>

        {items.length === 0 ? (
          <div className={labelClass}>{isViewingPast ? 'NO PAST GAMES' : 'NO UPCOMING EVENTS'}</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map(e =>
              e.kind === 'game'
                ? <GameCard key={e.data.id} game={e.data} />
                : <RawCard  key={e.data.id} evt={e.data} />
            )}
          </div>
        )}

        {mobile && !showAll && <div className="flex justify-center">{navButtons}</div>}
      </div>
    </div>
  );
}
