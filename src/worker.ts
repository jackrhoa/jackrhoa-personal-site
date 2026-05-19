import { generateOgImage, generateOgHtml } from './og/schedule';

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  GOOGLE_CALENDAR_API_KEY: string;
}

const BOT_PATTERNS = [
  'twitterbot',
  'facebookexternalhit',
  'linkedinbot',
  'slackbot',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'applebot',
];

function isSocialBot(request: Request): boolean {
  const ua = (request.headers.get('user-agent') ?? '').toLowerCase();
  return BOT_PATTERNS.some(p => ua.includes(p));
}

const CALENDAR_ID = 'e398559c5a1cbfb6b616fe196ad845c4dd30721af94e6c14efb47ad0a4488993@group.calendar.google.com';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/og/schedule') {
      return generateOgImage(env.GOOGLE_CALENDAR_API_KEY, request);
    }

    if (url.pathname === '/schedule' && isSocialBot(request)) {
      return generateOgHtml(env.GOOGLE_CALENDAR_API_KEY, url.origin);
    }

    if (url.pathname === '/api/calendar') {
      const timeMin = url.searchParams.get('timeMin');
      const timeMax = url.searchParams.get('timeMax');
      if (!timeMin || !timeMax) {
        return new Response('Missing timeMin or timeMax', { status: 400 });
      }
      const gcalUrl =
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events` +
        `?key=${env.GOOGLE_CALENDAR_API_KEY}` +
        `&timeMin=${encodeURIComponent(timeMin)}` +
        `&timeMax=${encodeURIComponent(timeMax)}` +
        `&maxResults=500&singleEvents=true&orderBy=startTime`;
      const resp = await fetch(gcalUrl);
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
