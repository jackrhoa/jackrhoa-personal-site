import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { generateKeyPairSync, createHash, sign, randomBytes, type KeyObject } from 'node:crypto';
import { MetadataService } from '@simplewebauthn/server';
import { isoCBOR } from '@simplewebauthn/server/helpers';
import { handleWebAuthnGate } from '../../webauthnGate';

const ORIGIN = 'https://jackrhoa.com';
const URL_ = new URL(`${ORIGIN}/api/email/key`);
const EMAIL = 'test@example.com';
const SECRET = 'test-secret';
const b64url = (b: Uint8Array) => Buffer.from(b).toString('base64url');
const u8 = (b: Buffer) => Uint8Array.from(b);

let credKey: KeyObject;
let coseKey: Uint8Array;

beforeAll(() => {
  const realInit = MetadataService.initialize.bind(MetadataService);
  vi.spyOn(MetadataService, 'initialize').mockImplementation(opts => realInit({ ...opts, mdsServers: [] }));

  const pair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  credKey = pair.privateKey;
  const jwk = pair.publicKey.export({ format: 'jwk' });
  coseKey = isoCBOR.encode(new Map<number, number | Uint8Array>([
    [1, 2], [3, -7], [-1, 1],
    [-2, u8(Buffer.from(jwk.x!, 'base64url'))],
    [-3, u8(Buffer.from(jwk.y!, 'base64url'))],
  ]));
});

afterEach(() => vi.useRealTimers());

function call(method: 'GET' | 'POST', body?: unknown, url = URL_, secret: string | null = SECRET) {
  const request = new Request(url, { method, ...(body !== undefined && { body: JSON.stringify(body) }) });
  return handleWebAuthnGate(request, url, EMAIL, secret ?? undefined);
}

async function challenge(): Promise<string> {
  const resp = await call('GET');
  return (await resp.json()).challenge;
}

function authData(): Buffer {
  const credId = randomBytes(16);
  return Buffer.concat([
    createHash('sha256').update('jackrhoa.com').digest(),
    Buffer.from([0x41]),
    Buffer.alloc(4),
    randomBytes(16),
    Buffer.from([0, credId.length]),
    credId,
    Buffer.from(coseKey),
  ]);
}

function registration(chal: string, fmt: 'none' | 'packed') {
  const clientDataJSON = Buffer.from(JSON.stringify({ type: 'webauthn.create', challenge: chal, origin: ORIGIN }));
  const data = authData();
  const attStmt = new Map<string, unknown>();
  if (fmt === 'packed') {
    const clientDataHash = createHash('sha256').update(clientDataJSON).digest();
    attStmt.set('alg', -7);
    attStmt.set('sig', u8(sign('sha256', Buffer.concat([data, clientDataHash]), credKey)));
  }
  const attestationObject = isoCBOR.encode(new Map<string, unknown>([['fmt', fmt], ['attStmt', attStmt], ['authData', u8(data)]]));
  const id = b64url(data.subarray(55, 71));
  return {
    response: {
      id,
      rawId: id,
      type: 'public-key',
      clientExtensionResults: {},
      response: { clientDataJSON: b64url(clientDataJSON), attestationObject: b64url(attestationObject), transports: [] },
    },
  };
}

describe('webauthn gate', () => {
  it('issues direct-attestation options with a signed challenge', async () => {
    const resp = await call('GET');
    expect(resp.status).toBe(200);
    const options = await resp.json();
    expect(options.attestation).toBe('direct');
    expect(options.rp.id).toBe('jackrhoa.com');
    expect(Buffer.from(options.challenge, 'base64url')).toHaveLength(56);
  });

  it('rejects "none" attestation (synced passkeys)', async () => {
    expect((await call('POST', registration(await challenge(), 'none'))).status).toBe(403);
  });

  it('rejects packed self-attestation (no certificate chain)', async () => {
    expect((await call('POST', registration(await challenge(), 'packed'))).status).toBe(403);
  });

  it('rejects a forged challenge', async () => {
    const forged = b64url(randomBytes(56));
    expect((await call('POST', registration(forged, 'none'))).status).toBe(403);
  });

  it('rejects an expired challenge', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const chal = await challenge();
    vi.setSystemTime(Date.now() + 6 * 60 * 1000);
    expect((await call('POST', registration(chal, 'packed'))).status).toBe(403);
  });

  it('refuses unknown hostnames', async () => {
    const evil = new URL('https://evil.example/api/email/key');
    expect((await call('GET', undefined, evil)).status).toBe(403);
  });

  it('returns 503 when the challenge secret is missing', async () => {
    expect((await call('GET', undefined, URL_, null)).status).toBe(503);
  });

  it('rejects a malformed body', async () => {
    expect((await call('POST', { nope: true })).status).toBe(400);
  });
});
