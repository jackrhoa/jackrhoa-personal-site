import { describe, it, expect, vi, afterEach } from 'vitest';
import { describeUnlock, notifyUnlock, recordUnlock, unlockDetails } from '../../notify';

function visitor() {
  const request = new Request('https://jackrhoa.com/api/email', {
    headers: { 'CF-Connecting-IP': '203.0.113.7', 'User-Agent': 'TestBrowser/1.0' },
  });
  Object.defineProperty(request, 'cf', {
    value: {
      city: 'Charlottesville', region: 'Virginia', postalCode: '22903', country: 'US',
      timezone: 'America/New_York', latitude: '38.03', longitude: '-78.48',
      asn: 7922, asOrganization: 'Comcast Cable',
    },
  });
  return request;
}

afterEach(() => vi.unstubAllGlobals());

describe('unlock notification', () => {
  it('describes method, device, time, location, network, IP and browser', () => {
    const text = describeUnlock(unlockDetails(visitor(), { method: 'webauthn', device: 'YubiKey 5 Series' }, new Date('2026-11-25T12:00:00Z')));
    expect(text).toBe([
      'Method: Hardware key attestation',
      'Device: YubiKey 5 Series',
      'Time: 2026-11-25T12:00:00.000Z (visitor timezone America/New_York)',
      'Location: Charlottesville, Virginia, 22903, US (38.03, -78.48)',
      'Network: Comcast Cable (AS7922)',
      'IP: 203.0.113.7',
      'Browser: TestBrowser/1.0',
    ].join('\n'));
  });

  it('falls back to unknown without Cloudflare request data', () => {
    const text = describeUnlock(unlockDetails(new Request('https://jackrhoa.com/api/email'), { method: 'turnstile' }));
    expect(text).toContain('Method: Cloudflare Turnstile');
    expect(text).toContain('Location: unknown');
    expect(text).toContain('Network: unknown');
    expect(text).not.toContain('Device:');
  });

  it('posts to ntfy with a bearer token when given', async () => {
    const fetchMock = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);
    await notifyUnlock(unlockDetails(visitor(), { method: 'private-access-token' }), 'https://ntfy.sh/secret-topic', 'tk_abc');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://ntfy.sh/secret-topic');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tk_abc');
    expect(String(init.body)).toContain('Method: Apple Private Access Token');
  });

  it('records every detail as a row', async () => {
    const run = vi.fn(async () => ({}));
    const bind = vi.fn(() => ({ run }));
    const prepare = vi.fn(() => ({ bind }));
    await recordUnlock({ prepare }, unlockDetails(visitor(), { method: 'turnstile' }, new Date('2026-11-25T12:00:00Z')));
    expect(prepare.mock.calls[0][0]).toMatch(/^INSERT INTO unlocks/);
    expect(bind).toHaveBeenCalledWith(
      '2026-11-25T12:00:00.000Z', 'turnstile', null, '203.0.113.7', 'TestBrowser/1.0',
      'Charlottesville', 'Virginia', '22903', 'US', 'America/New_York', 38.03, -78.48, 7922, 'Comcast Cable',
    );
    expect(run).toHaveBeenCalled();
  });
});
