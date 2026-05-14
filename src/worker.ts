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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/og/schedule') {
      return generateOgImage(env.GOOGLE_CALENDAR_API_KEY, request);
    }

    if (url.pathname === '/schedule' && isSocialBot(request)) {
      return generateOgHtml(env.GOOGLE_CALENDAR_API_KEY, url.origin);
    }

    return env.ASSETS.fetch(request);
  },
};
