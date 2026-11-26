const PAT_ISSUER = 'demo-pat.issuer.cloudflare.com';
const PAT_TOKEN_TYPE = 0x0002;
const PAT_WINDOW_SECONDS = 300;
const TURNSTILE_ACTION = 'email';
export const ALLOWED_HOSTNAMES = new Set(['jackrhoa.com', 'www.jackrhoa.com']);
const TURNSTILE_TEST_SECRET_PREFIX = '1x0000000000000000000000000000000';
const RSA_ENCRYPTION_ALG_ID = new Uint8Array([
  0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
]);

interface IssuerKey {
  raw: Bytes;
  id: Bytes;
  notBefore: number;
}

type Bytes = Uint8Array<ArrayBuffer>;

const encoder = new TextEncoder();

export function noStore(body: BodyInit | null, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(body, { ...init, headers });
}

export type VerificationMethod = 'private-access-token' | 'turnstile' | 'webauthn';

export function unlocked(email: string, method: VerificationMethod, device?: string): Response {
  return noStore(JSON.stringify({ email, method, ...(device && { device }) }), { headers: { 'Content-Type': 'application/json' } });
}

function b64urlDecode(s: string): Bytes {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function b64urlEncode(bytes: Bytes): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...parts: Bytes[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

function u16(n: number): Bytes {
  return new Uint8Array([(n >> 8) & 0xff, n & 0xff]);
}

function equal(a: Bytes, b: Bytes): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sha256(data: Bytes): Promise<Bytes> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

function derLength(len: number): Bytes {
  if (len < 0x80) return new Uint8Array([len]);
  const bytes: number[] = [];
  for (let n = len; n > 0; n >>= 8) bytes.unshift(n & 0xff);
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

function readDerLength(b: Bytes, i: number): [number, number] {
  const first = b[i];
  if (first < 0x80) return [first, i + 1];
  const n = first & 0x7f;
  let len = 0;
  for (let k = 0; k < n; k++) len = (len << 8) | b[i + 1 + k];
  return [len, i + 1 + n];
}

function der(tag: number, content: Bytes): Bytes {
  return concat(new Uint8Array([tag]), derLength(content.length), content);
}

function pssSpkiToRsaSpki(spki: Bytes): Bytes {
  if (spki[0] !== 0x30) throw new Error('bad spki');
  const [, algStart] = readDerLength(spki, 1);
  if (spki[algStart] !== 0x30) throw new Error('bad spki');
  const [algLen, algBody] = readDerLength(spki, algStart + 1);
  const bitStart = algBody + algLen;
  if (spki[bitStart] !== 0x03) throw new Error('bad spki');
  const [bitLen, bitBody] = readDerLength(spki, bitStart + 1);
  const rsaPublicKey = spki.slice(bitBody + 1, bitBody + bitLen);
  return der(0x30, concat(RSA_ENCRYPTION_ALG_ID, der(0x03, concat(new Uint8Array([0]), rsaPublicKey))));
}

let cachedKeys: { keys: IssuerKey[]; expires: number } | null = null;

async function issuerKeys(): Promise<IssuerKey[]> {
  if (cachedKeys && cachedKeys.expires > Date.now()) return cachedKeys.keys;
  const keys = await fetchIssuerKeys();
  cachedKeys = { keys, expires: Date.now() + 3600_000 };
  return keys;
}

async function fetchIssuerKeys(): Promise<IssuerKey[]> {
  const resp = await fetch(`https://${PAT_ISSUER}/.well-known/private-token-issuer-directory`);
  if (!resp.ok) throw new Error(`issuer directory ${resp.status}`);
  const dir = await resp.json() as { 'token-keys': { 'token-type': number; 'token-key': string; 'not-before'?: number }[] };
  const now = Date.now() / 1000;
  const keys = dir['token-keys'].filter(k => k['token-type'] === PAT_TOKEN_TYPE && (k['not-before'] ?? 0) <= now);
  return Promise.all(keys.map(async k => {
    const raw = b64urlDecode(k['token-key']);
    return { raw, id: await sha256(raw), notBefore: k['not-before'] ?? 0 };
  }));
}

async function redemptionContext(bucket: number): Promise<Bytes> {
  return sha256(encoder.encode(`jackrhoa-email:${bucket}`));
}

async function tokenChallenge(origin: string, bucket: number): Promise<Bytes> {
  const issuer = encoder.encode(PAT_ISSUER);
  const originInfo = encoder.encode(origin);
  const context = await redemptionContext(bucket);
  return concat(
    u16(PAT_TOKEN_TYPE),
    u16(issuer.length), issuer,
    new Uint8Array([context.length]), context,
    u16(originInfo.length), originInfo,
  );
}

function currentBucket(): number {
  return Math.floor(Date.now() / 1000 / PAT_WINDOW_SECONDS);
}

async function verifyPrivateToken(authorization: string, origin: string, keys: IssuerKey[]): Promise<boolean> {
  const match = authorization.match(/PrivateToken\s+token="?([A-Za-z0-9_\-+/=]+)"?/i);
  if (!match) return false;
  const token = b64urlDecode(match[1]);
  if (token.length !== 2 + 32 + 32 + 32 + 256) return false;
  if (((token[0] << 8) | token[1]) !== PAT_TOKEN_TYPE) return false;

  const challengeDigest = token.slice(34, 66);
  const keyId = token.slice(66, 98);
  const bucket = currentBucket();
  const expected = await Promise.all([bucket, bucket - 1].map(async b => sha256(await tokenChallenge(origin, b))));
  if (!expected.some(d => equal(d, challengeDigest))) return false;

  const key = keys.find(k => equal(k.id, keyId));
  if (!key) return false;
  const publicKey = await crypto.subtle.importKey(
    'spki', pssSpkiToRsaSpki(key.raw), { name: 'RSA-PSS', hash: 'SHA-384' }, false, ['verify'],
  );
  return crypto.subtle.verify({ name: 'RSA-PSS', saltLength: 48 }, publicKey, token.slice(98), token.slice(0, 98));
}

async function privateTokenChallenge(origin: string, keys: IssuerKey[]): Promise<Response> {
  const newest = keys.reduce<IssuerKey | null>((a, k) => (!a || k.notBefore > a.notBefore ? k : a), null);
  if (!newest) return noStore('Locked', { status: 401 });
  const challenge = b64urlEncode(await tokenChallenge(origin, currentBucket()));
  return noStore('Locked', {
    status: 401,
    headers: {
      'WWW-Authenticate': `PrivateToken challenge="${challenge}", token-key="${b64urlEncode(newest.raw)}"`,
    },
  });
}

async function verifyTurnstile(token: string, secret: string, request: Request): Promise<boolean> {
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  form.append('idempotency_key', crypto.randomUUID());
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.append('remoteip', ip);

  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  if (!resp.ok) return false;
  const result = await resp.json() as { success: boolean; action?: string; hostname?: string };
  if (!result.success) return false;
  if (secret.startsWith(TURNSTILE_TEST_SECRET_PREFIX)) return true;
  return result.action === TURNSTILE_ACTION && ALLOWED_HOSTNAMES.has(result.hostname ?? '');
}

export async function handleEmailGate(
  request: Request,
  url: URL,
  email: string | undefined,
  turnstileSecret: string | undefined,
): Promise<Response> {
  if (!email) return noStore('Email not configured', { status: 503 });

  if (request.method === 'GET') {
    const keys = await issuerKeys().catch(() => []);
    const authorization = request.headers.get('Authorization');
    if (authorization && keys.length && await verifyPrivateToken(authorization, url.hostname, keys).catch(() => false)) {
      return unlocked(email, 'private-access-token');
    }
    return privateTokenChallenge(url.hostname, keys);
  }

  if (request.method === 'POST') {
    if (!turnstileSecret) return noStore('Turnstile not configured', { status: 503 });
    const body = await request.json().catch(() => null) as { token?: unknown } | null;
    if (typeof body?.token !== 'string' || body.token.length > 2048) return noStore('Bad request', { status: 400 });
    if (await verifyTurnstile(body.token, turnstileSecret, request)) return unlocked(email, 'turnstile');
    return noStore('Forbidden', { status: 403 });
  }

  return noStore('Method not allowed', { status: 405, headers: { Allow: 'GET, POST' } });
}
