import { describe, it, expect } from 'vitest';
import {
  normalizeSport,
  parseEvent,
  stripPositionTags,
  CANCELED_REGEX,
  HOOVISION_REGEX,
  GAME_REGEX,
  SPORT_REVERSE,
} from '../../pages/scheduleUtils';

// ── normalizeSport ────────────────────────────────────────────────────────────

describe('normalizeSport', () => {
  it('returns abbreviation unchanged when given a known abbreviation', () => {
    expect(normalizeSport('CFB')).toBe('CFB');
    expect(normalizeSport('BASE')).toBe('BASE');
    expect(normalizeSport('VB')).toBe('VB');
  });

  it('is case-insensitive for abbreviations', () => {
    expect(normalizeSport('cfb')).toBe('CFB');
    expect(normalizeSport('Mlax')).toBe('MLAX');
  });

  it('maps full sport names to abbreviations', () => {
    expect(normalizeSport('FOOTBALL')).toBe('CFB');
    expect(normalizeSport('BASEBALL')).toBe('BASE');
    expect(normalizeSport('VOLLEYBALL')).toBe('VB');
    expect(normalizeSport("MEN'S BASKETBALL")).toBe('MBB');
    expect(normalizeSport("WOMEN'S LACROSSE")).toBe('WLAX');
  });

  it('is case-insensitive for full names', () => {
    expect(normalizeSport('Football')).toBe('CFB');
    expect(normalizeSport('baseball')).toBe('BASE');
  });

  it('returns the input unchanged when sport is unrecognized', () => {
    expect(normalizeSport('ESPORTS')).toBe('ESPORTS');
    expect(normalizeSport('unknownsport')).toBe('UNKNOWNSPORT');
  });

  it('trims whitespace', () => {
    expect(normalizeSport('  CFB  ')).toBe('CFB');
    expect(normalizeSport('  FOOTBALL  ')).toBe('CFB');
  });
});

// ── SPORT_REVERSE ─────────────────────────────────────────────────────────────

describe('SPORT_REVERSE', () => {
  it('maps all full sport names to their abbreviations', () => {
    expect(SPORT_REVERSE['FOOTBALL']).toBe('CFB');
    expect(SPORT_REVERSE["MEN'S BASKETBALL"]).toBe('MBB');
    expect(SPORT_REVERSE['FIELD HOCKEY']).toBe('FHOC');
  });
});

// ── parseEvent ────────────────────────────────────────────────────────────────

function makeEvt(summary: string, dateTime = '2025-09-06T19:30:00-04:00'): Parameters<typeof parseEvent>[0] {
  return { id: 'test-id', summary, start: { dateTime }, end: { dateTime } };
}

describe('parseEvent – game events', () => {
  it('parses a basic game with network', () => {
    const result = parseEvent(makeEvt('TD - CFB vs CLEM (ESPN)'));
    expect(result.kind).toBe('game');
    if (result.kind !== 'game') return;
    expect(result.data.position).toBe('TD');
    expect(result.data.sport).toBe('CFB');
    expect(result.data.awayAbbrev).toBe('CLEM');
    expect(result.data.homeAbbrev).toBe('UVA');
    expect(result.data.network).toBe('ESPN');
  });

  it('parses a game without a network', () => {
    const result = parseEvent(makeEvt('TD - CFB vs CLEM'));
    expect(result.kind).toBe('game');
    if (result.kind !== 'game') return;
    expect(result.data.network).toBeNull();
  });

  it('accepts a full sport name and normalizes to abbreviation', () => {
    const result = parseEvent(makeEvt('TD - FOOTBALL vs VIRGINIA TECH (ESPN)'));
    expect(result.kind).toBe('game');
    if (result.kind !== 'game') return;
    expect(result.data.sport).toBe('CFB');
    expect(result.data.awayAbbrev).toBe('VIRGINIA TECH');
  });

  it('handles multi-word away team names', () => {
    const result = parseEvent(makeEvt('SB - BASE vs VIRGINIA MILITARY INSTITUTE (ACCN)'));
    expect(result.kind).toBe('game');
    if (result.kind !== 'game') return;
    expect(result.data.awayAbbrev).toBe('VIRGINIA MILITARY INSTITUTE');
    expect(result.data.network).toBe('ACCN');
  });

  it('normalizes position and away team to uppercase', () => {
    const result = parseEvent(makeEvt('td - cfb vs clem (espn)'));
    expect(result.kind).toBe('game');
    if (result.kind !== 'game') return;
    expect(result.data.position).toBe('TD');
    expect(result.data.awayAbbrev).toBe('CLEM');
    expect(result.data.network).toBe('ESPN');
  });

  it('always sets homeAbbrev to UVA and neutral to false', () => {
    const result = parseEvent(makeEvt('GFX - MLAX vs ND (ESPNU)'));
    expect(result.kind).toBe('game');
    if (result.kind !== 'game') return;
    expect(result.data.homeAbbrev).toBe('UVA');
    expect(result.data.neutral).toBe(false);
  });

  it('preserves the original summary in raw field', () => {
    const summary = 'TD - CFB vs CLEM (ESPN)';
    const result = parseEvent(makeEvt(summary));
    expect(result.kind).toBe('game');
    if (result.kind !== 'game') return;
    expect(result.data.raw).toBe(summary);
  });

  it('parses canceled game — position includes (CANCELED) tag', () => {
    const result = parseEvent(makeEvt('(CANCELED) TD - CFB vs CLEM (ESPN)'));
    expect(result.kind).toBe('game');
    if (result.kind !== 'game') return;
    expect(result.data.position).toBe('(CANCELED) TD');
  });

  it('parses hoovision game — position includes HOOVISION tag', () => {
    const result = parseEvent(makeEvt('TD (HOOVISION) - CFB vs CLEM'));
    expect(result.kind).toBe('game');
    if (result.kind !== 'game') return;
    expect(result.data.position).toBe('TD (HOOVISION)');
  });

  it('parses an unrecognized network as a raw text badge (stored as-is)', () => {
    const result = parseEvent(makeEvt('TD - CFB vs CLEM (ESPN+)'));
    expect(result.kind).toBe('game');
    if (result.kind !== 'game') return;
    expect(result.data.network).toBe('ESPN+');
  });
});

describe('parseEvent – date handling', () => {
  it('parses dateTime ISO string', () => {
    const result = parseEvent(makeEvt('TD - CFB vs CLEM', '2025-09-06T19:30:00-04:00'));
    expect(result.kind).toBe('game');
    if (result.kind !== 'game') return;
    expect(result.data.date).toBeInstanceOf(Date);
    expect(result.data.date.getFullYear()).toBe(2025);
  });

  it('parses all-day date string (YYYY-MM-DD)', () => {
    const result = parseEvent({
      id: 'test-id',
      summary: 'TD - CFB vs CLEM',
      start: { date: '2025-10-11' },
      end:   { date: '2025-10-11' },
    });
    expect(result.kind).toBe('game');
    if (result.kind !== 'game') return;
    expect(result.data.date.getFullYear()).toBe(2025);
    expect(result.data.date.getMonth()).toBe(9); // 0-indexed October
    expect(result.data.date.getDate()).toBe(11);
  });
});

describe('parseEvent – raw events', () => {
  it('falls back to raw event when no " vs " separator', () => {
    const result = parseEvent(makeEvt('Department Meeting'));
    expect(result.kind).toBe('raw');
    if (result.kind !== 'raw') return;
    expect(result.data.raw).toBe('Department Meeting');
  });

  it('falls back to raw event for empty summary', () => {
    const result = parseEvent(makeEvt(''));
    expect(result.kind).toBe('raw');
  });

  it('requires a dash separator to parse as a game', () => {
    const result = parseEvent(makeEvt('CFB vs CLEM (ESPN)'));
    expect(result.kind).toBe('raw');
  });
});

// ── GAME_REGEX ────────────────────────────────────────────────────────────────

describe('GAME_REGEX', () => {
  it('captures all four groups', () => {
    const m = 'TD - CFB vs CLEM (ESPN)'.match(GAME_REGEX);
    expect(m).not.toBeNull();
    expect(m![1]).toBe('TD');
    expect(m![2]).toBe('CFB');
    expect(m![3]).toBe('CLEM');
    expect(m![4]).toBe('ESPN');
  });

  it('network group is undefined when omitted', () => {
    const m = 'TD - CFB vs CLEM'.match(GAME_REGEX);
    expect(m).not.toBeNull();
    expect(m![4]).toBeUndefined();
  });

  it('does not match events without " vs "', () => {
    expect('TD - CFB'.match(GAME_REGEX)).toBeNull();
    expect('Meeting'.match(GAME_REGEX)).toBeNull();
  });
});

// ── CANCELED_REGEX ────────────────────────────────────────────────────────────

describe('CANCELED_REGEX', () => {
  it('matches (CANCELED) in the position string', () => {
    expect(CANCELED_REGEX.test('(CANCELED) TD')).toBe(true);
  });

  it('matches double-L spelling (CANCELLED)', () => {
    expect(CANCELED_REGEX.test('(CANCELLED) TD')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(CANCELED_REGEX.test('(canceled) td')).toBe(true);
    expect(CANCELED_REGEX.test('(Canceled) TD')).toBe(true);
  });

  it('does not match when parentheses are absent', () => {
    expect(CANCELED_REGEX.test('CANCELED TD')).toBe(false);
  });
});

// ── HOOVISION_REGEX ───────────────────────────────────────────────────────────

describe('HOOVISION_REGEX', () => {
  it('matches HOOVISION in parentheses', () => {
    expect(HOOVISION_REGEX.test('TD (HOOVISION)')).toBe(true);
  });

  it('matches bare HOOVISION keyword', () => {
    expect(HOOVISION_REGEX.test('HOOVISION TD')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(HOOVISION_REGEX.test('td (hoovision)')).toBe(true);
    expect(HOOVISION_REGEX.test('Hoovision TD')).toBe(true);
  });

  it('does not match unrelated strings', () => {
    expect(HOOVISION_REGEX.test('TD ESPN')).toBe(false);
  });
});

// ── stripPositionTags ─────────────────────────────────────────────────────────

describe('stripPositionTags', () => {
  it('strips (CANCELED) from position', () => {
    expect(stripPositionTags('(CANCELED) TD')).toBe('TD');
  });

  it('strips (CANCELLED) (double L) from position', () => {
    expect(stripPositionTags('(CANCELLED) TD')).toBe('TD');
  });

  it('strips (HOOVISION) from position', () => {
    expect(stripPositionTags('TD (HOOVISION)')).toBe('TD');
  });

  it('strips bare HOOVISION keyword from position', () => {
    expect(stripPositionTags('TD HOOVISION')).toBe('TD');
  });

  it('strips both tags when both are present', () => {
    expect(stripPositionTags('(CANCELED) TD (HOOVISION)')).toBe('TD');
  });

  it('returns the original string unchanged when no tags are present', () => {
    expect(stripPositionTags('TD')).toBe('TD');
    expect(stripPositionTags('GFX')).toBe('GFX');
  });

  it('trims surrounding whitespace', () => {
    expect(stripPositionTags('  TD  ')).toBe('TD');
  });
});
