import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { verifyMDSBlob } from '@simplewebauthn/server/helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/data/mdsStatements.json');
const MDS_URL = 'https://mds.fidoalliance.org/';
const COMPROMISED = new Set([
  'USER_VERIFICATION_BYPASS',
  'ATTESTATION_KEY_COMPROMISE',
  'USER_KEY_REMOTE_COMPROMISE',
  'USER_KEY_PHYSICAL_COMPROMISE',
  'REVOKED',
]);
const HARDWARE_ATTESTATION = new Set(['basic_full', 'attca']);
const UNUSED_FIELDS = ['icon', 'iconDark', 'providerLogoLight', 'providerLogoDark', 'legalHeader'];

async function download() {
  const resp = await fetch(MDS_URL, { redirect: 'follow' });
  if (!resp.ok) {
    console.error(`MDS download failed: HTTP ${resp.status} ${await resp.text()}`);
    process.exit(1);
  }
  return resp.text();
}

const blob = process.argv[2] ? readFileSync(process.argv[2], 'utf8').trim() : await download();
const { payload, parsedNextUpdate } = await verifyMDSBlob(blob);

const statements = payload.entries
  .filter(e => e.aaguid && e.metadataStatement)
  .filter(e => {
    const latest = [...e.statusReports].sort((a, b) => (a.effectiveDate ?? '').localeCompare(b.effectiveDate ?? '')).at(-1);
    return !latest || !COMPROMISED.has(latest.status);
  })
  .map(e => e.metadataStatement)
  .filter(s => s.attestationTypes.some(t => HARDWARE_ATTESTATION.has(t)))
  .map(s => Object.fromEntries(Object.entries(s).filter(([k]) => !UNUSED_FIELDS.includes(k))));

writeFileSync(OUT, JSON.stringify({ nextUpdate: parsedNextUpdate.toISOString(), statements }) + '\n');
console.log(`Wrote ${statements.length} of ${payload.entries.length} entries to ${OUT}`);
