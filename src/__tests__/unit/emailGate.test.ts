import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { generateKeyPairSync, sign, createHash, randomBytes, constants, type KeyObject } from 'node:crypto';
import { handleEmailGate } from '../../emailGate';

const EMAIL = 'test@example.com';

const ORIGIN = 'https://jackrhoa.com';
const b64url = (b: Buffer) => b.toString('base64url');

let privateKey: KeyObject;
let spki: Buffer;

beforeAll(() => {
  const pair = generateKeyPairSync('rsa-pss', {
    modulusLength: 2048,
    hashAlgorithm: 'sha384',
    mgf1HashAlgorithm: 'sha384',
    saltLength: 48,
  });
  privateKey = pair.privateKey;
  spki = pair.publicKey.export({ type: 'spki', format: 'der' });
});

afterEach(() => vi.unstubAllGlobals());

function stubFetch(siteverify: object = { success: false }) {
  const realFetch = fetch;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('private-token-issuer-directory')) {
      return Response.json({ 'token-keys': [{ 'token-type': 2, 'token-key': b64url(spki), 'not-before': 0 }] });
    }
    if (url.includes('siteverify')) return Response.json(siteverify);
    return realFetch(input, init);
  }));
}

function get(headers: Record<string, string> = {}) {
  return handleEmailGate(new Request(`${ORIGIN}/api/email`, { headers }), new URL(`${ORIGIN}/api/email`), EMAIL, 'secret');
}

function challengeFrom(resp: Response): Buffer {
  const header = resp.headers.get('WWW-Authenticate') ?? '';
  const match = header.match(/challenge="([^"]+)"/);
  return Buffer.from(match![1], 'base64url');
}

function mintToken(challenge: Buffer): Buffer {
  const input = Buffer.concat([
    Buffer.from([0x00, 0x02]),
    randomBytes(32),
    createHash('sha256').update(challenge).digest(),
    createHash('sha256').update(spki).digest(),
  ]);
  const signature = sign('sha384', input, {
    key: privateKey,
    padding: constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 48,
  });
  return Buffer.concat([input, signature]);
}

describe('email gate: private access tokens', () => {
  it('challenges requests without a token', async () => {
    stubFetch();
    const resp = await get();
    expect(resp.status).toBe(401);
    expect(resp.headers.get('WWW-Authenticate')).toMatch(/^PrivateToken challenge="[^"]+", token-key="[^"]+"$/);
    expect(resp.headers.get('Cache-Control')).toBe('no-store');
  });

  it('unlocks with a valid token for the issued challenge', async () => {
    stubFetch();
    const token = mintToken(challengeFrom(await get()));
    const resp = await get({ Authorization: `PrivateToken token="${b64url(token)}"` });
    expect(resp.status).toBe(200);
    expect(await resp.json()).toEqual({ email: EMAIL, method: 'private-access-token' });
  });

  it('rejects a token with a tampered signature', async () => {
    stubFetch();
    const token = mintToken(challengeFrom(await get()));
    token[token.length - 1] ^= 0xff;
    const resp = await get({ Authorization: `PrivateToken token="${b64url(token)}"` });
    expect(resp.status).toBe(401);
  });

  it('rejects a token minted for a different challenge', async () => {
    stubFetch();
    const token = mintToken(randomBytes(64));
    const resp = await get({ Authorization: `PrivateToken token="${b64url(token)}"` });
    expect(resp.status).toBe(401);
  });
});

describe('email gate: turnstile', () => {
  function post(body: unknown) {
    return handleEmailGate(
      new Request(`${ORIGIN}/api/email`, { method: 'POST', body: JSON.stringify(body) }),
      new URL(`${ORIGIN}/api/email`),
      EMAIL,
      'secret',
    );
  }

  it('unlocks when siteverify passes with matching action and hostname', async () => {
    stubFetch({ success: true, action: 'email', hostname: 'jackrhoa.com' });
    const resp = await post({ token: 'x' });
    expect(resp.status).toBe(200);
    expect(await resp.json()).toEqual({ email: EMAIL, method: 'turnstile' });
  });

  it('rejects a wrong action', async () => {
    stubFetch({ success: true, action: 'bonus', hostname: 'jackrhoa.com' });
    expect((await post({ token: 'x' })).status).toBe(403);
  });

  it('rejects a wrong hostname', async () => {
    stubFetch({ success: true, action: 'email', hostname: 'evil.example' });
    expect((await post({ token: 'x' })).status).toBe(403);
  });

  it('rejects a failed verification', async () => {
    stubFetch({ success: false });
    expect((await post({ token: 'x' })).status).toBe(403);
  });

  it('rejects a missing token', async () => {
    stubFetch();
    expect((await post({})).status).toBe(400);
  });
});

describe('email gate: configuration', () => {
  it('returns 503 when the email secret is missing', async () => {
    stubFetch();
    const resp = await handleEmailGate(new Request(`${ORIGIN}/api/email`), new URL(`${ORIGIN}/api/email`), undefined, 'secret');
    expect(resp.status).toBe(503);
  });
});
