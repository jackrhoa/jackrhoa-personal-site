import { describe, it, expect } from 'vitest';
import mds from '../../data/mdsStatements.json';

describe('bundled FIDO metadata snapshot', () => {
  const statements = mds.statements as { aaguid?: string; description: string; attestationRootCertificates: string[] }[];

  it('contains hardware authenticator statements', () => {
    expect(statements.length).toBeGreaterThan(100);
  });

  it('includes the YubiKey 5 Series', () => {
    const yubikey = statements.find(s => s.aaguid === 'ee882879-721c-4913-9775-3dfcce97072a');
    expect(yubikey?.description).toBe('YubiKey 5 Series');
    expect(yubikey?.attestationRootCertificates.length).toBeGreaterThan(0);
  });

  it('has image fields stripped to keep the worker small', () => {
    expect(statements.some(s => 'icon' in s)).toBe(false);
  });
});
