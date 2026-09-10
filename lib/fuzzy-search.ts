// Lightweight fuzzy text matching for equipment search — no DB extension required.
// Combines literal substring matches (weighted highest) with bigram (Dice coefficient)
// similarity so close-but-not-exact queries (typos, partial model numbers, words out
// of order) still surface relevant results, not just exact substring hits.

function bigrams(str: string): Map<string, number> {
  const s = str.toLowerCase().trim();
  const map = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const bg = s.slice(i, i + 2);
    map.set(bg, (map.get(bg) || 0) + 1);
  }
  return map;
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const bgA = bigrams(a);
  const bgB = bigrams(b);
  let intersection = 0;
  for (const [bg, count] of bgA) {
    const other = bgB.get(bg);
    if (other) intersection += Math.min(count, other);
  }
  const totalA = [...bgA.values()].reduce((s, n) => s + n, 0);
  const totalB = [...bgB.values()].reduce((s, n) => s + n, 0);
  if (totalA + totalB === 0) return 0;
  return (2 * intersection) / (totalA + totalB);
}

// Score one query word against one field value: 1 for a literal substring match,
// otherwise the best bigram similarity against the field as a whole or any of its
// space-separated tokens (so "swithcer" still matches well against "Switcher" inside
// a longer model/description string).
function scoreWordAgainstField(word: string, field: string): number {
  const f = field.toLowerCase();
  if (f.includes(word)) return 1;
  let best = diceCoefficient(word, f);
  for (const token of f.split(/[\s\-_/]+/)) {
    const sim = diceCoefficient(word, token);
    if (sim > best) best = sim;
  }
  return best;
}

// Average, across every word in the query, of that word's best match against any
// of the given fields. Returns 0..1; higher is a closer match.
export function fuzzyScore(query: string, fields: Array<string | null | undefined>): number {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const values = fields.filter((f): f is string => !!f);
  if (values.length === 0) return 0;
  let total = 0;
  for (const word of words) {
    let best = 0;
    for (const field of values) {
      const s = scoreWordAgainstField(word, field);
      if (s > best) best = s;
    }
    total += best;
  }
  return total / words.length;
}

export const FUZZY_MATCH_THRESHOLD = 0.35;

// Sanitize a search word for use inside a PostgREST `.or("col.ilike.%word%,...")`
// filter string — commas and parentheses are the filter-list delimiters, so they'd
// otherwise break the query if a user types e.g. "AVR-X4300(H)".
export function sanitizeIlikeWord(word: string): string {
  return word.replace(/[,()]/g, "");
}

// Rank + filter a candidate list by fuzzy relevance against the given fields,
// keeping only reasonably close matches and sorting best-first.
export function rankByFuzzyMatch<T>(
  query: string,
  candidates: T[],
  getFields: (item: T) => Array<string | null | undefined>,
  limit: number
): T[] {
  return candidates
    .map((item) => ({ item, score: fuzzyScore(query, getFields(item)) }))
    .filter((s) => s.score >= FUZZY_MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);
}
