import { generateOgImage, generateOgHtml } from './og/schedule';
import { handleEmailGate } from './emailGate';
import { handleWebAuthnGate } from './webauthnGate';

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  GOOGLE_CALENDAR_API_KEY: string;
  TURNSTILE_SECRET_KEY?: string;
  CONTACT_EMAIL?: string;
  WEBAUTHN_CHALLENGE_SECRET?: string;
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

const SPA_ROUTES = new Set(['/', '/schedule']);

const CALENDAR_ID = '7e2c6dfa4e2df80f152afadb1acca09030360115a5c3439e89daa557a1445828@group.calendar.google.com';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/email/key') {
      return handleWebAuthnGate(request, url, env.CONTACT_EMAIL, env.WEBAUTHN_CHALLENGE_SECRET);
    }

    if (url.pathname === '/api/email') {
      return handleEmailGate(request, url, env.CONTACT_EMAIL, env.TURNSTILE_SECRET_KEY);
    }

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

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) {
      return response;
    }
    const index = await env.ASSETS.fetch(new Request(new URL('/', url), request));
    return new Response(index.body, {
      status: SPA_ROUTES.has(url.pathname) ? 200 : 404,
      headers: index.headers,
    });
  },
};
