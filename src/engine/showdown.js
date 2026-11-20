/**
 * Exact 7-card showdown evaluator (Texas Hold'em).
 * Best 5 of 7; ties broken laundry-list style — category first, then every
 * significant card high to low. Only the best five cards ever count:
 * the 6th/7th cards never break ties, suits never break ties.
 *
 * Categories (low → high): HIGH, PAIR, TWO_PAIR, TRIPS, STRAIGHT, FLUSH,
 * FULL_HOUSE, QUADS, STRAIGHT_FLUSH.
 *
 * Card scheme: { rank: '2'..'T'|'J'|'Q'|'K'|'A', suit: 's'|'h'|'d'|'c' }.
 */

const RANK_VAL = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
const VAL_RANK = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export const SHOWDOWN_CATEGORY = {
  HIGH: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  TRIPS: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  QUADS: 7,
  STRAIGHT_FLUSH: 8,
};

const CATEGORY_NAME = {
  [SHOWDOWN_CATEGORY.HIGH]: 'High Card',
  [SHOWDOWN_CATEGORY.PAIR]: 'Pair',
  [SHOWDOWN_CATEGORY.TWO_PAIR]: 'Two Pair',
  [SHOWDOWN_CATEGORY.TRIPS]: 'Three of a Kind',
  [SHOWDOWN_CATEGORY.STRAIGHT]: 'Straight',
  [SHOWDOWN_CATEGORY.FLUSH]: 'Flush',
  [SHOWDOWN_CATEGORY.FULL_HOUSE]: 'Full House',
  [SHOWDOWN_CATEGORY.QUADS]: 'Four of a Kind',
  [SHOWDOWN_CATEGORY.STRAIGHT_FLUSH]: 'Straight Flush',
};

const desc = (a, b) => b - a;

// High card of the best 5-straight inside a rank-value multiset, 0 when none.
// Wheel (A-2-3-4-5) counts, high 5.
export function straightHigh(values) {
  const uniq = [...new Set(values)].sort((a, b) => a - b);
  if (uniq.includes(14)) uniq.unshift(1); // ace plays low too
  let best = 0;
  for (let i = 0; i <= uniq.length - 5; i++) {
    if (uniq[i + 4] - uniq[i] === 4) best = Math.max(best, uniq[i + 4]);
  }
  return best;
}

/**
 * @param {Array} hole - 2 cards {rank, suit}
 * @param {Array} board - 5 cards {rank, suit}
 * @returns {{ category: number, ranks: number[], name: string }}
 *   ranks: tiebreak values high → low (category-specific length).
 */
export function evaluateHand(hole, board) {
  const cards = [...(hole || []), ...(board || [])];
  const vals = cards.map(c => RANK_VAL[c.rank]);

  // Suit groups (flush needs 5+; with 6-7 suited, only the top 5 play).
  const bySuit = {};
  for (const c of cards) (bySuit[c.suit] = bySuit[c.suit] || []).push(RANK_VAL[c.rank]);
  const flushVals = Object.values(bySuit).find(g => g.length >= 5)?.sort(desc) || null;

  // Rank groups, trips/pairs first, then rank.
  const counts = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([v, n]) => ({ v: Number(v), n }))
    .sort((a, b) => b.n - a.n || b.v - a.v);
  const quads = groups.filter(g => g.n === 4);
  const trips = groups.filter(g => g.n === 3);
  const pairs = groups.filter(g => g.n === 2);
  const kick = (exclude, take) =>
    groups.filter(g => !exclude.includes(g.v)).map(g => g.v).sort(desc).slice(0, take);

  // Straight flush: a straight inside the flush suit (royal = high ace).
  if (flushVals) {
    const sf = straightHigh(flushVals);
    if (sf > 0) return { category: SHOWDOWN_CATEGORY.STRAIGHT_FLUSH, ranks: [sf], name: CATEGORY_NAME[SHOWDOWN_CATEGORY.STRAIGHT_FLUSH] };
  }
  if (quads.length > 0) {
    const q = quads[0].v;
    return { category: SHOWDOWN_CATEGORY.QUADS, ranks: [q, ...kick([q], 1)], name: CATEGORY_NAME[SHOWDOWN_CATEGORY.QUADS] };
  }
  // Full house: best trips + best pair — a second trips plays as the pair.
  if (trips.length > 0 && (pairs.length > 0 || trips.length > 1)) {
    const t = trips[0].v;
    const p = trips.length > 1 ? trips[1].v : pairs.slice().sort((a, b) => b.v - a.v)[0].v;
    return { category: SHOWDOWN_CATEGORY.FULL_HOUSE, ranks: [t, p], name: CATEGORY_NAME[SHOWDOWN_CATEGORY.FULL_HOUSE] };
  }
  if (flushVals) {
    return { category: SHOWDOWN_CATEGORY.FLUSH, ranks: flushVals.slice(0, 5), name: CATEGORY_NAME[SHOWDOWN_CATEGORY.FLUSH] };
  }
  const st = straightHigh(vals);
  if (st > 0) return { category: SHOWDOWN_CATEGORY.STRAIGHT, ranks: [st], name: CATEGORY_NAME[SHOWDOWN_CATEGORY.STRAIGHT] };
  if (trips.length > 0) {
    const t = trips[0].v;
    return { category: SHOWDOWN_CATEGORY.TRIPS, ranks: [t, ...kick([t], 2)], name: CATEGORY_NAME[SHOWDOWN_CATEGORY.TRIPS] };
  }
  if (pairs.length >= 2) {
    const sorted = pairs.slice().sort((a, b) => b.v - a.v);
    const [hi, lo] = [sorted[0].v, sorted[1].v];
    return { category: SHOWDOWN_CATEGORY.TWO_PAIR, ranks: [hi, lo, ...kick([hi, lo], 1)], name: CATEGORY_NAME[SHOWDOWN_CATEGORY.TWO_PAIR] };
  }
  if (pairs.length === 1) {
    const p = pairs[0].v;
    return { category: SHOWDOWN_CATEGORY.PAIR, ranks: [p, ...kick([p], 3)], name: CATEGORY_NAME[SHOWDOWN_CATEGORY.PAIR] };
  }
  return { category: SHOWDOWN_CATEGORY.HIGH, ranks: [...vals].sort(desc).slice(0, 5), name: CATEGORY_NAME[SHOWDOWN_CATEGORY.HIGH] };
}

/** Lexicographic compare: <0 a loses, 0 tie (split), >0 a wins. */
export function compareHands(a, b) {
  if (a.category !== b.category) return a.category - b.category;
  const n = Math.max(a.ranks.length, b.ranks.length);
  for (let i = 0; i < n; i++) {
    const d = (a.ranks[i] || 0) - (b.ranks[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** One-line hand label for settle text, e.g. "Flush, K high". */
export function describeHand(ev) {
  const top = VAL_RANK[ev.ranks[0]];
  return `${ev.name}, ${top} high`;
}
