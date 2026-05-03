import { describe, it, expect } from 'vitest';
import SPORTS from '../../data/sports';
import NETWORKS from '../../data/networks';
import POSITIONS from '../../data/positions';
import { SOURCES } from '../../sources';

// ── sports.ts ─────────────────────────────────────────────────────────────────

describe('SPORTS data', () => {
  const EXPECTED_ABBREVS = [
    'CFB', 'MBB', 'WBB', 'MLAX', 'WLAX', 'MSOC', 'WSOC',
    'WRES', 'BASE', 'SOFT', 'MTEN', 'WTEN', 'MSWIM', 'WSWIM',
    'MXCO', 'WXCO', 'MTRK', 'WTRK', 'FHOC', 'VB', 'MGOLF', 'WGOLF',
  ];

  it('contains all expected sport abbreviations', () => {
    for (const abbrev of EXPECTED_ABBREVS) {
      expect(SPORTS).toHaveProperty(abbrev);
    }
  });

  it('has a non-empty string name for every abbreviation', () => {
    for (const [abbrev, name] of Object.entries(SPORTS)) {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
      expect(abbrev.length).toBeGreaterThan(0);
    }
  });

  it('maps CFB to FOOTBALL', () => {
    expect(SPORTS['CFB']).toBe('FOOTBALL');
  });

  it('maps BASE to BASEBALL', () => {
    expect(SPORTS['BASE']).toBe('BASEBALL');
  });

  it('all full names are uppercase', () => {
    for (const name of Object.values(SPORTS)) {
      expect(name).toBe(name.toUpperCase());
    }
  });
});

// ── networks.ts ───────────────────────────────────────────────────────────────

describe('NETWORKS data', () => {
  const EXPECTED_KEYS = ['ESPN', 'ESPN2', 'ESPNU', 'ACCN', 'ACCNX'];

  it('contains all expected network keys', () => {
    for (const key of EXPECTED_KEYS) {
      expect(NETWORKS).toHaveProperty(key);
    }
  });

  it('every entry has a non-empty url', () => {
    for (const [key, info] of Object.entries(NETWORKS)) {
      expect(typeof info.url).toBe('string');
      expect(info.url.length).toBeGreaterThan(0);
      // suppress unused key warning
      expect(key).toBeTruthy();
    }
  });

  it('scale is a number when defined', () => {
    for (const info of Object.values(NETWORKS)) {
      if (info.scale !== undefined) {
        expect(typeof info.scale).toBe('number');
        expect(info.scale).toBeGreaterThan(0);
      }
    }
  });
});

// ── positions.ts ──────────────────────────────────────────────────────────────

describe('POSITIONS data', () => {
  const EXPECTED_KEYS = ['TD', 'SB', 'GFX', 'A1', 'A2', 'DIR', 'PROD', 'AP'];

  it('contains all expected position abbreviations', () => {
    for (const key of EXPECTED_KEYS) {
      expect(POSITIONS).toHaveProperty(key);
    }
  });

  it('every entry has a non-empty full name', () => {
    for (const [key, name] of Object.entries(POSITIONS)) {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it('maps TD to TECHNICAL DIRECTOR', () => {
    expect(POSITIONS['TD']).toBe('TECHNICAL DIRECTOR');
  });
});

// ── sources.ts ────────────────────────────────────────────────────────────────

describe('SOURCES data', () => {
  it('has 7 sources', () => {
    expect(SOURCES).toHaveLength(7);
  });

  it('every source has a label and background color', () => {
    for (const source of SOURCES) {
      expect(typeof source.label).toBe('string');
      expect(source.label.length).toBeGreaterThan(0);
      expect(typeof source.bg).toBe('string');
    }
  });

  it('WORK SCHEDULE source has busLabel SCHED', () => {
    const sched = SOURCES.find(s => s.label === 'WORK SCHEDULE');
    expect(sched).toBeDefined();
    expect(sched!.busLabel).toBe('SCHED');
  });

  it('BARS source is flagged as color bars', () => {
    const bars = SOURCES.find(s => s.label === 'BARS');
    expect(bars).toBeDefined();
    expect(bars!.isColorBars).toBe(true);
  });

  it('BLACK source has a true-black background', () => {
    const black = SOURCES.find(s => s.label === 'BLACK');
    expect(black).toBeDefined();
    expect(black!.bg).toBe('#000');
  });

  it('content pages have a pageKey', () => {
    const contentLabels = ['HOME', 'ABOUT', 'PROJECTS', 'WORK SCHEDULE'];
    for (const label of contentLabels) {
      const source = SOURCES.find(s => s.label === label);
      expect(source?.pageKey).toBeDefined();
    }
  });
});
