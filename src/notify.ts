const METHOD_NAMES: Record<string, string> = {
  'private-access-token': 'Apple Private Access Token',
  turnstile: 'Cloudflare Turnstile',
  webauthn: 'Hardware key attestation',
};

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
  const place = [d.city, d.region, d.postalCode, d.country].filter(Boolean).join(', ') || 'unknown';
  const coords = d.latitude !== null && d.longitude !== null ? ` (${d.latitude}, ${d.longitude})` : '';
  const network = d.asOrganization ? `${d.asOrganization}${d.asn ? ` (AS${d.asn})` : ''}` : 'unknown';

  return [
    `Method: ${METHOD_NAMES[d.method] ?? d.method}`,
    ...(d.device ? [`Device: ${d.device}`] : []),
    `Time: ${d.createdAt}${d.timezone ? ` (visitor timezone ${d.timezone})` : ''}`,
    `Location: ${place}${coords}`,
    `Network: ${network}`,
    `IP: ${d.ip ?? 'unknown'}`,
    `Browser: ${d.userAgent ?? 'unknown'}`,
  ].join('\n');
}

export async function notifyUnlock(d: UnlockDetails, ntfyUrl: string, ntfyToken?: string): Promise<void> {
  const headers: Record<string, string> = {
    Title: 'Someone revealed your email',
    Tags: 'unlock',
  };
  if (ntfyToken) headers.Authorization = `Bearer ${ntfyToken}`;
  await fetch(ntfyUrl, { method: 'POST', headers, body: describeUnlock(d) });
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
