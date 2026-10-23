export type ParsedLineStatus = 'ok' | 'missing-power' | 'no-name';

export interface ParsedPlayerLine {
  raw: string;
  name: string;
  power: number;
  status: ParsedLineStatus;
}

export interface ParseResult {
  players: ParsedPlayerLine[];
  skipped: number;
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

const SUFFIX_MULTIPLIERS: Array<{ pattern: RegExp; multiplier: number }> = [
  { pattern: /^(?:b|bn|مليار|مليارات|بليون)$/i, multiplier: 1_000_000_000 },
  { pattern: /^(?:m|mn|مليون|ملايين|م)$/i, multiplier: 1_000_000 },
  { pattern: /^(?:k|thousand|ألف|الف|آلاف|الاف)$/i, multiplier: 1_000 },
];

// A leading list marker such as "1." / "2)" / "3-" / "٤-" that is not part of the name.
const LEADING_MARKER = /^\s*(?:\d{1,3}|[٠-٩]{1,3}|[۰-۹]{1,3})\s*[.)\-–—:|]\s+/;
// Words that commonly appear as a header row rather than a player entry.
const HEADER_WORDS = /^(?:الاسم|اسم|اللاعب|لاعب|القوة|قوة|الرقم|رقم|name|player|power)$/i;

function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)));
}

function normalizeText(value: string): string {
  return normalizeDigits(value)
    .replace(/\u066B|\u066C/g, '.') // Arabic decimal / thousands separators
    .replace(/[\u0640]/g, '') // tatweel
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function multiplierForSuffix(suffix: string): number | null {
  for (const entry of SUFFIX_MULTIPLIERS) {
    if (entry.pattern.test(suffix)) return entry.multiplier;
  }
  return null;
}

interface Candidate {
  start: number;
  end: number;
  value: number;
  score: number;
}

function findCandidates(line: string): Candidate[] {
  const candidates: Candidate[] = [];
  const numberPattern = /\d[\d,]*(?:\.\d+)?/g;
  let match: RegExpExecArray | null;

  while ((match = numberPattern.exec(line)) !== null) {
    const rawNumber = match[0];
    const start = match.index;
    let end = start + rawNumber.length;
    const numeric = Number(rawNumber.replace(/,/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) continue;

    const after = line.slice(end);
    const afterTrimmed = after.trim();

    let value = numeric;
    let score = 0;

    // Suffix attached directly or separated by a space: "50M", "50 M", "50 مليون".
    const suffixMatch = /^([A-Za-z\u0600-\u06FF]{1,10})/.exec(afterTrimmed);
    if (suffixMatch) {
      const multiplier = multiplierForSuffix(suffixMatch[1]);
      if (multiplier) {
        value = numeric * multiplier;
        score += 2;
        const suffixStart = line.length - after.length + after.indexOf(suffixMatch[1]);
        end = suffixStart + suffixMatch[1].length;
      }
    }

    const trailing = line.slice(end);
    const trailingTrimmed = trailing.trim();
    if (numeric >= 1000) score += 1;
    if (trailingTrimmed.length === 0) score += 3;
    else if (/^[\s|,;:\-–—]+$/.test(trailing)) score += 1;

    // Leading list markers ("1.", "2)") are numbering, not power.
    const isLeadingMarker = start === 0 && /^[.)\-–—:|]\s/.test(after);
    if (isLeadingMarker) score -= 5;

    candidates.push({ start, end, value, score });
  }

  return candidates;
}

function pickPowerCandidate(candidates: Candidate[]): Candidate | null {
  if (!candidates.length) return null;
  return candidates.reduce((best, candidate) => {
    if (candidate.score !== best.score) return candidate.score > best.score ? candidate : best;
    return candidate.start > best.start ? candidate : best;
  }, candidates[0]);
}

function cleanupName(value: string): string {
  return value
    .replace(LEADING_MARKER, '')
    .replace(/^[\s|,;:\-–—.]+/, '')
    .replace(/[\s|,;:\-–—.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses one pasted line into a player entry.
 *
 * The power is chosen by scoring every numeric candidate: a trailing number with
 * a K/M/B (or Arabic) suffix wins, while a leading list marker such as "1." is
 * penalised so it is not mistaken for power. Everything left over becomes the name.
 */
export function parsePlayerLine(input: string): ParsedPlayerLine | null {
  const line = normalizeText(input);
  if (!line) return null;

  const withoutMarker = line.replace(LEADING_MARKER, '');
  if (!withoutMarker) return null;

  // A header row ("الاسم  القوة", "name, power") has no player data, so skip it.
  const headerTokens = withoutMarker.split(/[\s|,;:\-–—]+/).filter(Boolean);
  if (headerTokens.length > 0 && headerTokens.every((token) => HEADER_WORDS.test(token))) {
    return null;
  }

  const candidates = findCandidates(line);
  const power = pickPowerCandidate(candidates);

  if (!power) {
    const name = cleanupName(line);
    if (!name) return null;
    return { raw: input.trim(), name, power: 0, status: 'missing-power' };
  }

  const remainder = `${line.slice(0, power.start)} ${line.slice(power.end)}`;
  const name = cleanupName(remainder);

  if (!name) {
    return { raw: input.trim(), name: '', power: power.value, status: 'no-name' };
  }
  return { raw: input.trim(), name, power: power.value, status: 'ok' };
}

export function parsePlayerList(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const players: ParsedPlayerLine[] = [];
  let skipped = 0;

  for (const line of lines) {
    const parsed = parsePlayerLine(line);
    if (!parsed) {
      if (line.trim()) skipped += 1;
      continue;
    }
    players.push(parsed);
  }

  return { players, skipped };
}

export function formatPlayersForExport(players: Array<{ name: string; power: number }>): string {
  return players
    .filter((player) => player.name.trim())
    .map((player) => `${player.name.trim()}, ${player.power}`)
    .join('\n');
}
