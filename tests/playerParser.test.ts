import { describe, expect, it } from 'vitest';
import { formatPlayersForExport, parsePlayerLine, parsePlayerList } from '@/app/lib/playerParser';

describe('parsePlayerLine', () => {
  it('reads a name followed by a suffixed power', () => {
    expect(parsePlayerLine('أبو علي 50M')).toMatchObject({ name: 'أبو علي', power: 50_000_000, status: 'ok' });
  });

  it('reads a comma separated full number', () => {
    expect(parsePlayerLine('أبو علي, 50,000,000')).toMatchObject({ name: 'أبو علي', power: 50_000_000 });
  });

  it('reads a dash separator', () => {
    expect(parsePlayerLine('أبو علي - 50M')).toMatchObject({ name: 'أبو علي', power: 50_000_000 });
  });

  it('reads tab separated values copied from a spreadsheet', () => {
    expect(parsePlayerLine('أبو علي\t50M')).toMatchObject({ name: 'أبو علي', power: 50_000_000 });
  });

  it('strips a leading list marker', () => {
    expect(parsePlayerLine('1. أبو علي 50M')).toMatchObject({ name: 'أبو علي', power: 50_000_000 });
    expect(parsePlayerLine('2) محمد 30M')).toMatchObject({ name: 'محمد', power: 30_000_000 });
  });

  it('handles power placed before the name', () => {
    expect(parsePlayerLine('50M أبو علي')).toMatchObject({ name: 'أبو علي', power: 50_000_000 });
  });

  it('keeps a digit that belongs to the name', () => {
    expect(parsePlayerLine('لاعب 7 50000000')).toMatchObject({ name: 'لاعب 7', power: 50_000_000 });
  });

  it('reads Arabic words for power', () => {
    expect(parsePlayerLine('أحمد | 50 مليون')).toMatchObject({ name: 'أحمد', power: 50_000_000 });
  });

  it('reads lowercase and thousand suffixes', () => {
    expect(parsePlayerLine('خالد 50k')).toMatchObject({ name: 'خالد', power: 50_000 });
    expect(parsePlayerLine('سعد 50 ألف')).toMatchObject({ name: 'سعد', power: 50_000 });
  });

  it('reads Arabic-Indic digits', () => {
    expect(parsePlayerLine('فهد ٥٠M')).toMatchObject({ name: 'فهد', power: 50_000_000 });
  });

  it('flags a line without power instead of dropping it', () => {
    expect(parsePlayerLine('سعيد')).toMatchObject({ name: 'سعيد', power: 0, status: 'missing-power' });
  });

  it('ignores a header row', () => {
    expect(parsePlayerLine('الاسم  القوة')).toBeNull();
    expect(parsePlayerLine('name, power')).toBeNull();
  });

  it('returns null for blank input', () => {
    expect(parsePlayerLine('   ')).toBeNull();
  });

  it('keeps multi word names intact', () => {
    expect(parsePlayerLine('أبو محمد الطيب 1,250,000')).toMatchObject({ name: 'أبو محمد الطيب', power: 1_250_000 });
  });
});

describe('parsePlayerList', () => {
  it('parses many lines, keeps powerless lines flagged, and skips headers', () => {
    const result = parsePlayerList(['الاسم  القوة', '1. أبو علي 50M', '2. محمد 30M', '', 'سعيد'].join('\n'));
    expect(result.players).toHaveLength(3);
    expect(result.players[0]).toMatchObject({ name: 'أبو علي', power: 50_000_000, status: 'ok' });
    expect(result.players[1]).toMatchObject({ name: 'محمد', power: 30_000_000, status: 'ok' });
    expect(result.players[2]).toMatchObject({ name: 'سعيد', power: 0, status: 'missing-power' });
    expect(result.skipped).toBe(1);
  });

  it('reads a spaced suffix', () => {
    expect(parsePlayerLine('ناصر 50 M')).toMatchObject({ name: 'ناصر', power: 50_000_000 });
  });
});

describe('formatPlayersForExport', () => {
  it('exports name and power pairs', () => {
    expect(formatPlayersForExport([{ name: 'أبو علي', power: 50_000_000 }, { name: '', power: 5 }])).toBe('أبو علي, 50000000');
  });
});
