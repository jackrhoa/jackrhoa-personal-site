import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  MetadataService,
  type MetadataStatement,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { decodeAttestationObject } from '@simplewebauthn/server/helpers';
import { ALLOWED_HOSTNAMES, noStore, unlocked } from './emailGate';
import mds from './data/mdsStatements.json';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const VERIFIED_FORMATS = new Set(['packed', 'tpm', 'android-key', 'apple']);
const DEV_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

type Bytes = Uint8Array<ArrayBuffer>;

let metadataReady: Promise<void> | null = null;

function initMetadata(): Promise<void> {
  if (!metadataReady) {
    metadataReady = MetadataService.initialize({
      statements: mds.statements as unknown as MetadataStatement[],
      mdsServers: [],
      verificationMode: 'strict',
    }).catch(err => {
      metadataReady = null;
      throw err;
    });
  }
  return metadataReady;
}

function b64urlDecode(s: string): Bytes {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function hmac(secret: string, data: Bytes): Promise<Bytes> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

async function issueChallenge(secret: string): Promise<Bytes> {
  const body = new Uint8Array(24);
  crypto.getRandomValues(body.subarray(0, 16));
  new DataView(body.buffer).setBigUint64(16, BigInt(Date.now()));
  const mac = await hmac(secret, body);
  const out = new Uint8Array(56);
  out.set(body);
  out.set(mac, 24);
  return out;
}

async function checkChallenge(secret: string, challenge: string): Promise<boolean> {
  const bytes = b64urlDecode(challenge);
  if (bytes.length !== 56) return false;
  const body = bytes.slice(0, 24);
  const expected = await hmac(secret, body);
  let diff = 0;
  for (let i = 0; i < 32; i++) diff |= expected[i] ^ bytes[24 + i];
  if (diff !== 0) return false;
  const issued = Number(new DataView(body.buffer).getBigUint64(16));
  const age = Date.now() - issued;
  return age >= 0 && age <= CHALLENGE_TTL_MS;
}

function allowedOrigin(url: URL): boolean {
  if (ALLOWED_HOSTNAMES.has(url.hostname)) return url.protocol === 'https:';
  return DEV_HOSTNAMES.has(url.hostname);
}

export async function handleWebAuthnGate(
  request: Request,
  url: URL,
  email: string | undefined,
  challengeSecret: string | undefined,
): Promise<Response> {
  if (!email || !challengeSecret) return noStore('WebAuthn not configured', { status: 503 });
  if (!allowedOrigin(url)) return noStore('Forbidden', { status: 403 });

  if (request.method === 'GET') {
    const options = await generateRegistrationOptions({
      rpName: 'Jack Rhoa',
      rpID: url.hostname,
      userName: 'visitor',
      userDisplayName: 'Visitor',
      challenge: await issueChallenge(challengeSecret),
      attestationType: 'direct',
      authenticatorSelection: { residentKey: 'discouraged', userVerification: 'discouraged' },
      preferredAuthenticatorType: 'securityKey',
      timeout: 60_000,
    });
    return noStore(JSON.stringify(options), { headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => null) as { response?: RegistrationResponseJSON } | null;
    if (!body?.response || typeof body.response !== 'object') return noStore('Bad request', { status: 400 });

    try {
      await initMetadata();
      const result = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: challenge => checkChallenge(challengeSecret, challenge),
        expectedOrigin: url.origin,
        expectedRPID: url.hostname,
        requireUserVerification: false,
      });
      const info = result.registrationInfo;
      if (!result.verified || !info || !VERIFIED_FORMATS.has(info.fmt)) {
        return noStore('Forbidden', { status: 403 });
      }
      const x5c = decodeAttestationObject(info.attestationObject).get('attStmt').get('x5c');
      if (!x5c?.length) return noStore('Forbidden', { status: 403 });
      const statement = await MetadataService.getStatement(info.aaguid);
      if (!statement) return noStore('Forbidden', { status: 403 });
      return unlocked(email, 'webauthn', statement.description);
    } catch {
      return noStore('Forbidden', { status: 403 });
    }
  }

  return noStore('Method not allowed', { status: 405, headers: { Allow: 'GET, POST' } });
}
