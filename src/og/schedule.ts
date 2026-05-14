import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import { ACCNX_LOGO_DATA_URI } from './accnxLogo';
import { parseEvent, CANCELED_REGEX, stripPositionTags } from '../pages/scheduleUtils';
import type { CalEvent, GameEvent } from '../pages/scheduleUtils';
import POSITIONS from '../data/positions';
import SPORTS from '../data/sports';
import TEAMS from '../data/teams';

const CALENDAR_ID = 'e398559c5a1cbfb6b616fe196ad845c4dd30721af94e6c14efb47ad0a4488993@group.calendar.google.com';
const FONT_REGULAR = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@4/files/inter-latin-400-normal.woff2';
const FONT_BOLD    = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@4/files/inter-latin-700-normal.woff2';
const UVA_TEAM_ID  = '258';

const ESPN_CDN = 'https://secure.espncdn.com/watchespn/images/channels';
const NETWORK_LOGOS: Record<string, string> = {
  'ESPN':  `${ESPN_CDN}/e748f3c0-3f7c-3088-a90a-0ccb2588e0ed.png`,
  'ESPN2': `${ESPN_CDN}/017f41a2-ef4f-39d3-9f45-f680b88cd23b.png`,
  'ESPNU': `${ESPN_CDN}/500b1f7c-dad5-33f9-907c-87427babe201.png`,
  'ACCN':  `${ESPN_CDN}/76b92674-175c-4ff1-8989-380aa514eb87.png`,
  'ACCNX': ACCNX_LOGO_DATA_URI,
};

let resvgReady = false;
let fontBuffers: Uint8Array[] = [];

async function ensureInit() {
  if (resvgReady) return;
  await initWasm(resvgWasm);
  const [r, b] = await Promise.all([fetch(FONT_REGULAR), fetch(FONT_BOLD)]);
  fontBuffers = [new Uint8Array(await r.arrayBuffer()), new Uint8Array(await b.arrayBuffer())];
  resvgReady = true;
}

async function fetchNextGame(apiKey: string): Promise<GameEvent | null> {
  const now = new Date().toISOString();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events` +
    `?key=${apiKey}&timeMin=${now}&maxResults=20&singleEvents=true&orderBy=startTime`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json() as { items?: CalEvent[] };
  for (const item of data.items ?? []) {
    if (CANCELED_REGEX.test(item.summary)) continue;
    const parsed = parseEvent(item);
    if (parsed.kind === 'game') return parsed.data;
  }
  return null;
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function awayFontSize(name: string): number {
  if (name.length <= 3)  return 88;
  if (name.length <= 6)  return 80;
  if (name.length <= 10) return 68;
  if (name.length <= 14) return 56;
  return 46;
}

function formatDate(date: Date): string {
  const isAllDay = date.getUTCHours() === 0 && date.getUTCMinutes() === 0;
  const datePart = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
  if (isAllDay) return datePart;
  const timePart = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${datePart} · ${timePart}`;
}

function teamLogoUrl(id: string): string {
  return `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;
}

function getAwayTeamId(sport: string, abbrev: string): string | null {
  const info = TEAMS[`${sport}:${abbrev}`] ?? TEAMS[abbrev];
  return info?.id ?? null;
}

function buildSvg(game: GameEvent | null, awayTeamId: string | null): string {
  if (!game) {
    return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0d0d0d"/>
  <text x="600" y="330" font-family="Inter, sans-serif" font-size="32" fill="#555555" text-anchor="middle">No upcoming games scheduled</text>
  <text x="1140" y="610" font-family="Inter, sans-serif" font-size="18" fill="#333333" text-anchor="end">JACKRHOA.COM</text>
</svg>`;
  }

  const { sport, awayAbbrev, network, position, date } = game;
  const sportFull = SPORTS[sport] ?? sport;
  const posAbbrev = stripPositionTags(position);
  const posFull = POSITIONS[posAbbrev] ?? posAbbrev;
  const dateStr = formatDate(date);
  const awaySize = awayFontSize(awayAbbrev);
  const networkLogoUrl = network ? (NETWORK_LOGOS[network] ?? null) : null;

  // ── Layout ──────────────────────────────────────────────────────────────────
  const LOGO_SIZE = 150;
  const LOGO_Y    = 30;
  const LEFT_CX   = 240;
  const RIGHT_CX  = 960;

  // Tricodes sit below the team logos
  const NAME_Y    = LOGO_Y + LOGO_SIZE + 78; // ~258, baseline

  // Network logo centered between the two tricodes, vertically aligned with them
  const NET_H     = 130;
  const NET_W     = 210;
  const NET_CX    = 600;

  // Divider, date, bottom row
  const DIVIDER_Y = NAME_Y + 68;  // ~326
  const DATE_Y    = DIVIDER_Y + 105; // ~431, centered x=600
  const BOTTOM_Y  = 548;

  // ── Team logos ──────────────────────────────────────────────────────────────
  // Away on left, UVA (home) on right
  const awayImg = awayTeamId
    ? `<image href="${teamLogoUrl(awayTeamId)}" x="${LEFT_CX - LOGO_SIZE / 2}" y="${LOGO_Y}" width="${LOGO_SIZE}" height="${LOGO_SIZE}" preserveAspectRatio="xMidYMid meet"/>`
    : '';
  const uvaImg = `<image href="${teamLogoUrl(UVA_TEAM_ID)}" x="${RIGHT_CX - LOGO_SIZE / 2}" y="${LOGO_Y}" width="${LOGO_SIZE}" height="${LOGO_SIZE}" preserveAspectRatio="xMidYMid meet"/>`;

  // ── Network logo in logo row + @ in tricode row ─────────────────────────────
  // @ in logo row, network logo in tricode row
  const atSymbol = `<text x="600" y="${LOGO_Y + LOGO_SIZE / 2 + 22}" font-family="Inter, sans-serif" font-size="80" font-weight="bold" fill="#3a3a3a" text-anchor="middle">@</text>`;
  const netLogoImg = networkLogoUrl
    ? `<image href="${networkLogoUrl}" x="${NET_CX - NET_W / 2}" y="${NAME_Y - NET_H * 0.82}" width="${NET_W}" height="${NET_H}" preserveAspectRatio="xMidYMid meet"/>`
    : network
      ? `<text x="600" y="${NAME_Y}" font-family="Inter, sans-serif" font-size="38" font-weight="bold" fill="#555555" text-anchor="middle">${escXml(network)}</text>`
      : '';

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0d0d0d"/>

  ${awayImg}
  ${uvaImg}

  ${netLogoImg}

  <text x="${LEFT_CX}" y="${NAME_Y}" font-family="Inter, sans-serif" font-size="${awaySize}" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${escXml(awayAbbrev)}</text>
  ${atSymbol}
  <text x="${RIGHT_CX}" y="${NAME_Y}" font-family="Inter, sans-serif" font-size="82" font-weight="bold" fill="#FFFFFF" text-anchor="middle">UVA</text>

  <line x1="60" y1="${DIVIDER_Y}" x2="1140" y2="${DIVIDER_Y}" stroke="#1e1e1e" stroke-width="1.5"/>

  <text x="600" y="${DATE_Y}" font-family="Inter, sans-serif" font-size="54" font-weight="bold" fill="#e0e0e0" text-anchor="middle">${escXml(dateStr)}</text>

  <text x="60" y="${BOTTOM_Y}" font-family="Inter, sans-serif" font-size="44" font-weight="bold" fill="#5a5a5a" text-anchor="start">${escXml(sportFull)}</text>
  <text x="1140" y="${BOTTOM_Y}" font-family="Inter, sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="end">${escXml(posFull)}</text>

  <text x="1140" y="612" font-family="Inter, sans-serif" font-size="18" fill="#2a2a2a" text-anchor="end">JACKRHOA.COM</text>
</svg>`;
}

export async function generateOgImage(apiKey: string, request: Request): Promise<Response> {
  const cache: Cache = (caches as unknown as { default: Cache }).default;
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    await ensureInit();
    const game = await fetchNextGame(apiKey);
    const awayTeamId = game ? getAwayTeamId(game.sport, game.awayAbbrev) : null;
    const svg = buildSvg(game, awayTeamId);

    const resvg = new Resvg(svg, {
      font: { fontBuffers, defaultFontFamily: 'Inter', loadSystemFonts: false },
    });

    // Resolve external images (team logos + network logo)
    const hrefs = resvg.imagesToResolve();
    await Promise.all(hrefs.map(async (href) => {
      try {
        const res = await fetch(href);
        if (res.ok) resvg.resolveImage(href, new Uint8Array(await res.arrayBuffer()));
      } catch { /* skip failed images gracefully */ }
    }));

    const png = resvg.render().asPng();
    const response = new Response(png.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
      },
    });
    await cache.put(request, response.clone());
    return response;
  } catch (err) {
    console.error('OG image generation failed:', err);
    return new Response('Image generation failed', { status: 500 });
  }
}

export async function generateOgHtml(apiKey: string, origin: string): Promise<Response> {
  const game = await fetchNextGame(apiKey).catch(() => null);

  let title = 'Jack Rhoa — Broadcast Schedule';
  let description = 'Upcoming UVA broadcasts by Jack Rhoa.';

  if (game) {
    const sportFull = SPORTS[game.sport] ?? game.sport;
    const dateStr = formatDate(game.date);
    const networkStr = game.network ? ` · ${game.network}` : '';
    title = `UVA vs ${game.awayAbbrev} — ${sportFull}`;
    description = `${dateStr}${networkStr}`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escXml(title)}</title>
  <meta name="description" content="${escXml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escXml(origin)}/schedule">
  <meta property="og:title" content="${escXml(title)}">
  <meta property="og:description" content="${escXml(description)}">
  <meta property="og:image" content="${escXml(origin)}/og/schedule">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escXml(title)}">
  <meta name="twitter:description" content="${escXml(description)}">
  <meta name="twitter:image" content="${escXml(origin)}/og/schedule">
  <meta http-equiv="refresh" content="0; url=/schedule">
</head>
<body></body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
