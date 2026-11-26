const METHOD_NAMES: Record<string, string> = {
  'private-access-token': 'Apple PAT',
  turnstile: 'Cloudflare Turnstile',
  webauthn: 'Hardware Key',
};

const COUNTRY_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

function countryName(code: string): string {
  try {
    return COUNTRY_NAMES.of(code) ?? code;
  } catch {
    return code;
  }
}

function easternTime(iso: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).formatToParts(new Date(iso)).map(p => [p.type, p.value]),
  );
  return `${parts.weekday}, ${parts.month} ${parts.day} at ${parts.hour}:${parts.minute} ${parts.dayPeriod} ${parts.timeZoneName}`;
}

interface CfProperties {
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  latitude?: string;
  longitude?: string;
  asn?: number;
  asOrganization?: string;
}

export interface Unlock {
  method: string;
  device?: string;
}

export interface UnlockDetails {
  createdAt: string;
  method: string;
  device: string | null;
  ip: string | null;
  userAgent: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  asn: number | null;
  asOrganization: string | null;
}

export interface D1Database {
  prepare: (sql: string) => { bind: (...values: unknown[]) => { run: () => Promise<unknown> } };
}

function toNumber(value: string | undefined): number | null {
  const n = Number(value);
  return value !== undefined && Number.isFinite(n) ? n : null;
}

export function unlockDetails(request: Request, unlock: Unlock, now = new Date()): UnlockDetails {
  const cf = (request as unknown as { cf?: CfProperties }).cf ?? {};
  return {
    createdAt: now.toISOString(),
    method: unlock.method,
    device: unlock.device ?? null,
    ip: request.headers.get('CF-Connecting-IP'),
    userAgent: request.headers.get('User-Agent'),
    city: cf.city ?? null,
    region: cf.region ?? null,
    postalCode: cf.postalCode ?? null,
    country: cf.country ?? null,
    timezone: cf.timezone ?? null,
    latitude: toNumber(cf.latitude),
    longitude: toNumber(cf.longitude),
    asn: cf.asn ?? null,
    asOrganization: cf.asOrganization ?? null,
  };
}

export function describeUnlock(d: UnlockDetails): string {
  const method = METHOD_NAMES[d.method] ?? d.method;
  const place = [d.city, d.region, d.country && countryName(d.country)].filter(Boolean).join(', ') || 'unknown';
  const as = d.asn ? `${d.asn}${d.asOrganization ? ` (${d.asOrganization})` : ''}` : d.asOrganization ?? 'unknown';

  return [
    `Method: ${method}${d.device ? ` (${d.device})` : ''}`,
    `Location: ${place}`,
    `Time: ${easternTime(d.createdAt)}`,
    `AS: ${as}`,
    `IP: ${d.ip ?? 'unknown'}`,
    `Browser: ${d.userAgent ?? 'unknown'}`,
  ].join('\n');
}

export async function notifyUnlock(d: UnlockDetails, ntfyUrl: string, ntfyToken?: string): Promise<void> {
  const headers: Record<string, string> = {
    Title: 'Email Revealed',
    Tags: 'unlock',
  };
  if (ntfyToken) headers.Authorization = `Bearer ${ntfyToken}`;
  const resp = await fetch(ntfyUrl, { method: 'POST', headers, body: describeUnlock(d) });
  if (!resp.ok) throw new Error(`ntfy responded ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
}

export async function recordUnlock(db: D1Database, d: UnlockDetails): Promise<void> {
  await db.prepare(
    `INSERT INTO unlocks (created_at, method, device, ip, user_agent, city, region, postal_code, country, timezone, latitude, longitude, asn, as_organization)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    d.createdAt, d.method, d.device, d.ip, d.userAgent, d.city, d.region, d.postalCode,
    d.country, d.timezone, d.latitude, d.longitude, d.asn, d.asOrganization,
  ).run();
}
