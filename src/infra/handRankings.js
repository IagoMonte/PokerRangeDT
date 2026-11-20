/**
 * Comprehensive Pre-flop Hand Type Rankings.
 * Ordered from strongest (index 0) to weakest (index 168).
 * Total: 13 pairs, 78 suited, 78 offsuit = 169 hand types.
 */
export function getHandLabel(cards) {
  if (!cards || cards.length !== 2) return null;

  const c1 = cards[0];
  const c2 = cards[1];
  const r1 = c1[0];
  const r2 = c2[0];
  const s1 = c1[1];
  const s2 = c2[1];

  const ranks = [r1, r2].sort((a, b) => {
    const rankMap = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    return rankMap[b] - rankMap[a];
  });

  const rankStr = ranks.join('');
  if (r1 === r2) return rankStr;
  if (s1 === s2) return rankStr + 's';
  return rankStr + 'o';
}

export const FOURBET_RANKING = [
  'AA', 'KK', 'QQ', 'AKs',
  'JJ', 'AKo',
  'A5s', 'A4s', 'A3s', 'A2s',
  'AQs', 'AJs', 'ATs',
  'KQs', 'KJs', 'KTs',
  'QJs', 'QTs',
  'AQo', 'AJo', 'KQo',
  'TT', '99',
]

export const HAND_RANKINGS = [
  'AA', 'KK', 'QQ', 'AKs', 'JJ', 'AQs', 'KQs', 'AKo',
  'TT', 'AJs', 'KJs', 'AQo', 'ATs', 'QJs', 'KTs', '99',
  'JTs', 'KQo', 'AJo', 'QTs', '88', 'K9s', 'T9s', 'A9s',
  'ATo', 'QJo', 'J9s', '77', 'K8s', 'Q9s', '98s', 'JTo',
  'A8s', 'K7s', 'T8s', '66', 'Q8s', '87s', 'KTo', 'A7s',
  '97s', 'J8s', 'QTo', '76s', 'K6s', 'A9o', '55', 'T7s',
  'Q7s', '86s', 'K5s', 'A6s', '65s', '96s', 'J7s', 'A8o',
  '75s', 'K9o', '54s', 'Q6s', '44', 'K4s', '85s', 'T9o',
  'A5s', '64s', '95s', 'J6s', 'K3s', 'Q5s', 'A7o', '74s',
  'K8o', '53s', '84s', 'T6s', '43s', 'A4s', 'Q9o', 'J5s',
  '63s', '33', 'K2s', 'Q4s', 'A6o', '94s', '73s', '52s',
  'T5s', 'J9o', 'K7o', 'A3s', '83s', '42s', 'Q8o', '62s',
  'J4s', '93s', 'A5o', '32s', 'K6o', '22', '72s', 'T4s',
  '82s', 'Q3s', 'J3s', 'A2s', 'K5o', 'Q7o', '92s', 'A4o',
  'T3s', 'K4o', 'J8o', 'KJo', 'J2s', 'Q2s', 'K3o', 'A3o',
  'T8o', 'K2o', 'Q6o', 'A2o', '98o',
  'T2s', 'J7o', 'Q5o', 'T7o', 'J6o', 'Q4o', 'T2o',
  '97o', 'J5o', '87o', 'Q3o', '76o', 'T6o', 'J4o', 'Q2o', '92o',
  '65o', '86o', '54o', '96o', '75o', 'J3o', 'T5o', '53o',
  '85o', '64o', '43o', 'J2o', '95o', '74o', 'T4o', '63o', '82o',
  '84o', '94o', '73o', 'T3o', '93o', '83o', '72o', '62o', '52o', '42o', '32o'
];

export const XRFI_BLUFF_RANKING = [
  'A5s', 'A4s', 'A3s', 'A2s',
  'K9s', 'Q9s', 'J9s',
  'K8s', 'Q8s', 'J8s',
  'A9o', 'A8o', 'A7o', 'A6o', 'A5o',
  'K9o', 'Q9o', 'J9o',
]

export const RFI_BLUFF_RANKING = [
  'A5s', 'A4s', 'A3s', 'A2s',
  'K9s', 'Q9s', 'J9s',
  'T9s', '98s', '87s', '76s', '65s', '54s',
  'K8s', 'Q8s', 'J8s',
  'T8s', '97s', '86s', '75s', '64s', '53s',
  'A9o', 'A8o', 'A7o', 'A6o', 'A5o',
  'K9o', 'Q9o', 'J9o', 'T9o',
]

export const COMBO_COUNTS = {
  pair: 6,
  suited: 4,
  offsuit: 12
};

/**
 * Returns the number of combinations for a hand type.
 * @param {string} handType 
 * @returns {number}
 */
export function getComboCount(handType) {
  if (handType.endsWith('s')) return COMBO_COUNTS.suited;
  if (handType.endsWith('o')) return COMBO_COUNTS.offsuit;
  return COMBO_COUNTS.pair;
}

/**
 * Returns the rank of a hand (0 is strongest, 168 is weakest).
 * @param {string} label 
 * @returns {number}
 */
export function getHandRank(label) {
  return HAND_RANKINGS.indexOf(label);
}

/**
 * Returns the hand label for a given rank index.
 * @param {number} index 
 * @returns {string|undefined}
 */
export function getHandAtRank(index) {
  return HAND_RANKINGS[index];
}

/**
 * Compares two hands based on their global rank.
 * @param {string} labelA 
 * @param {string} labelB 
 * @returns {number} -1 if A is stronger, 1 if B is stronger, 0 if equal.
 */
export function compareHands(labelA, labelB) {
  const rankA = getHandRank(labelA);
  const rankB = getHandRank(labelB);
  
  if (rankA === -1 || rankB === -1) throw new Error('Invalid hand label provided');
  
  if (rankA < rankB) return -1;
  if (rankA > rankB) return 1;
  return 0;
}
