import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import { parseEvent, CANCELED_REGEX, stripPositionTags } from '../pages/scheduleUtils';
import type { CalEvent, GameEvent } from '../pages/scheduleUtils';
import POSITIONS from '../data/positions';
import SPORTS from '../data/sports';
import TEAMS from '../data/teams';

const CALENDAR_ID = 'e398559c5a1cbfb6b616fe196ad845c4dd30721af94e6c14efb47ad0a4488993@group.calendar.google.com';
const FONT_REGULAR = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@4/files/inter-latin-400-normal.woff2';
const FONT_BOLD    = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@4/files/inter-latin-700-normal.woff2';
const UVA_TEAM_ID  = '258';

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

function logoUrl(id: string): string {
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
  <rect width="1200" height="8" fill="#232D4B"/>
  <rect y="8" width="1200" height="3" fill="#E57200"/>
  <text x="1160" y="54" font-family="Inter, sans-serif" font-size="20" fill="#444444" text-anchor="end">JACKRHOA.COM</text>
  <text x="600" y="340" font-family="Inter, sans-serif" font-size="32" fill="#555555" text-anchor="middle">No upcoming games scheduled</text>
</svg>`;
  }

  const { sport, awayAbbrev, network, position, date } = game;
  const sportFull = SPORTS[sport] ?? sport;
  const posAbbrev = stripPositionTags(position);
  const posFull = POSITIONS[posAbbrev] ?? posAbbrev;

  const networkStr = network ? ` · ${network}` : '';
  const infoLine = `${formatDate(date)}${networkStr} · ${sportFull}`;
  const awaySize = awayFontSize(awayAbbrev);

  // Layout constants
  const LOGO_SIZE = 190;
  const LOGO_Y    = 70;
  const LEFT_CX   = 240;   // UVA logo center x
  const RIGHT_CX  = 960;   // Away logo center x
  const VS_Y      = LOGO_Y + LOGO_SIZE / 2 + 14; // vertical center of logos
  const NAME_Y    = LOGO_Y + LOGO_SIZE + 82;       // below logos

  const uvaLogoUrl = logoUrl(UVA_TEAM_ID);
  const awayLogoUrl = awayTeamId ? logoUrl(awayTeamId) : null;

  const uvaImg  = `<image href="${uvaLogoUrl}" x="${LEFT_CX - LOGO_SIZE / 2}" y="${LOGO_Y}" width="${LOGO_SIZE}" height="${LOGO_SIZE}" preserveAspectRatio="xMidYMid meet"/>`;
  const awayImg = awayLogoUrl
    ? `<image href="${awayLogoUrl}" x="${RIGHT_CX - LOGO_SIZE / 2}" y="${LOGO_Y}" width="${LOGO_SIZE}" height="${LOGO_SIZE}" preserveAspectRatio="xMidYMid meet"/>`
    : '';

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0d0d0d"/>
  <rect width="1200" height="8" fill="#232D4B"/>
  <rect y="8" width="1200" height="3" fill="#E57200"/>

  <text x="1160" y="54" font-family="Inter, sans-serif" font-size="20" fill="#444444" text-anchor="end">JACKRHOA.COM</text>

  ${uvaImg}
  ${awayImg}

  <text x="600" y="${VS_Y}" font-family="Inter, sans-serif" font-size="42" fill="#444444" text-anchor="middle">VS</text>

  <text x="${LEFT_CX}" y="${NAME_Y}" font-family="Inter, sans-serif" font-size="88" font-weight="bold" fill="#FFFFFF" text-anchor="middle">UVA</text>
  <text x="${RIGHT_CX}" y="${NAME_Y}" font-family="Inter, sans-serif" font-size="${awaySize}" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${escXml(awayAbbrev)}</text>

  <text x="600" y="520" font-family="Inter, sans-serif" font-size="26" fill="#888888" text-anchor="middle">${escXml(infoLine)}</text>

  <text x="1160" y="600" font-family="Inter, sans-serif" font-size="18" fill="#555555" text-anchor="end">${escXml(posFull)}</text>
</svg>`;
}

export async function generateOgImage(apiKey: string): Promise<Response> {
  try {
    await ensureInit();
    const game = await fetchNextGame(apiKey);
    const awayTeamId = game ? getAwayTeamId(game.sport, game.awayAbbrev) : null;
    const svg = buildSvg(game, awayTeamId);

    const resvg = new Resvg(svg, {
      font: { fontBuffers, defaultFontFamily: 'Inter', loadSystemFonts: false },
    });

    // Resolve external images (team logos)
    const hrefs = resvg.imagesToResolve();
    await Promise.all(hrefs.map(async (href) => {
      try {
        const res = await fetch(href);
        if (res.ok) resvg.resolveImage(href, new Uint8Array(await res.arrayBuffer()));
      } catch { /* skip failed logos gracefully */ }
    }));

    const png = resvg.render().asPng();
    return new Response(png.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
      },
    });
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
