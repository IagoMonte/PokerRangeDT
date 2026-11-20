/**
 * Dynamic Bucket Logic
 * Redistributes pre-flop range into Buckets A, B, C, and D based on current board and hand strength.
 */
import { classifyHand, HAND_CLASSES } from './classifier.js';
import { countOuts } from './draws.js';

export const BUCKETS = {
  A: 'BUCKET_A', // Monster hands (Sets, Straights, Flushes)
  B: 'BUCKET_B', // Strong hands (Overpairs, Top Pairs, Two Pairs)
  C: 'BUCKET_C', // Medium hands (Middle Pairs, Gutshots, Overcards)
  D: 'BUCKET_D', // Air / Low equity bluffs
};

/**
 * Tuning surface for the postflop brain (the fine-tuning lives here, not in
 * the formula). drawUpgrade: AIR climbs with live outs — strong draws play
 * like strong hands, medium draws like medium hands, backdoors stay air.
 */
export const BUCKET_CONFIG = {
  classMap: {
    [HAND_CLASSES.FLUSH]: BUCKETS.A,
    [HAND_CLASSES.STRAIGHT]: BUCKETS.A,
    [HAND_CLASSES.SET]: BUCKETS.A,
    [HAND_CLASSES.TRIPS]: BUCKETS.A,
    [HAND_CLASSES.TWO_PAIR]: BUCKETS.B,
    [HAND_CLASSES.OVERPAIR]: BUCKETS.B,
    [HAND_CLASSES.TOP_PAIR]: BUCKETS.B,
    [HAND_CLASSES.PAIR]: BUCKETS.C,
    [HAND_CLASSES.AIR]: BUCKETS.D,
  },
  drawUpgrade: {
    airStrongOuts: 9,  // AIR + outs >= 9 (flush draw, combo) → B
    airMediumOuts: 4,  // AIR + outs >= 4 (OESD, gutshot) → C
    pairStrongOuts: 8, // PAIR + outs >= 8 (pair + strong redraw) → B
  },
};

/**
 * Bucket for one REAL hand (the brain path: villain classifies their own
 * hole cards, never anyone else's range).
 * @param {string} handClass - one of HAND_CLASSES
 * @param {number} outs - unique outs from countOuts (default 0)
 * @param {Object} config - override BUCKET_CONFIG for fine-tuning
 */
export function bucketFor(handClass, outs = 0, config = BUCKET_CONFIG) {
  const { classMap, drawUpgrade } = { ...BUCKET_CONFIG, ...config };
  const base = classMap[handClass] || BUCKETS.D;
  if (base === BUCKETS.D && outs >= (drawUpgrade?.airStrongOuts ?? 9)) return BUCKETS.B;
  if (base === BUCKETS.D && outs >= (drawUpgrade?.airMediumOuts ?? 4)) return BUCKETS.C;
  if (base === BUCKETS.C && outs >= (drawUpgrade?.pairStrongOuts ?? 8)) return BUCKETS.B;
  return base;
}

/**
 * Classify + count outs + bucket in one call for a real hand.
 * @returns {{ handClass: string, outs: number, draws: string[], bucket: string }}
 */
export function bucketForHand(holeCards, board, config = BUCKET_CONFIG) {
  const handClass = classifyHand(holeCards, board);
  const { outs, draws } = countOuts(holeCards, board);
  return { handClass, outs, draws, bucket: bucketFor(handClass, outs, config) };
}

/**
 * Redistributes a pre-flop range into buckets for a specific board.
 * @param {Set<string>} preflopRange - The initial range as a set of hand types.
 * @param {Array} board - The current board cards.
 * @returns {Object} - An object containing buckets { A: Set, B: Set, ... }
 */
export function redistributeRange(preflopRange, board) {
  const buckets = {
    [BUCKETS.A]: new Set(),
    [BUCKETS.B]: new Set(),
    [BUCKETS.C]: new Set(),
    [BUCKETS.D]: new Set(),
  };

  // We need to iterate over every possible combo in the pre-flop range 
  // to classify it against the current board.
  // For simplicity in this engine, we iterate over the hand types (e.g., 'AA', 'AKs').
  
  for (const handType of preflopRange) {
    // In a real high-fidelity engine, we'd check every specific combo of the hand type.
    // Here, we represent the hand type by a representative combo.
    const representativeCombo = getRepresentativeCombo(handType);
    const classification = classifyHand(representativeCombo, board);
    // Range redistribution stays class-only: representative combos cannot
    // count outs reliably (fixed suits break flush detection). Draw upgrades
    // live in bucketFor/bucketForHand, the real-hand brain path.
    const bucket = BUCKET_CONFIG.classMap[classification] || BUCKETS.D;
    
    buckets[bucket].add(handType);
  }

  return buckets;
}

/**
 * Helper to convert hand type (e.g., 'AKs') to a representative pair of cards.
 * Since classification is rank-based for the most part, we can use a fixed suit for
 * non-flushy boards.
 */
function getRepresentativeCombo(handType) {
  const ranks = handType.substring(0, 2).split('');
  const isSuited = handType.endsWith('s');
  const isOffsuit = handType.endsWith('o');

  // For the purpose of classification, we use 's' for spades.
  // Note: This simplifies flush checks. A real engine would check if the 
  // hand could potentially make a flush with the board.
  if (isSuited) {
    return [
      { rank: ranks[0], suit: 's' },
      { rank: ranks[1], suit: 's' },
    ];
  } else {
    return [
      { rank: ranks[0], suit: 's' },
      { rank: ranks[1], suit: 'h' },
    ];
  }
}
