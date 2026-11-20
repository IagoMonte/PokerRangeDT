/**
 * Hand Classifier Logic
 * Assigns a hand to a Hand Class based on hole cards and the board.
 */

export const HAND_CLASSES = {
  FLUSH: 'FLUSH',
  STRAIGHT: 'STRAIGHT',
  SET: 'SET',
  TRIPS: 'TRIPS',
  TWO_PAIR: 'TWO_PAIR',
  OVERPAIR: 'OVERPAIR',
  TOP_PAIR: 'TOP_PAIR',
  PAIR: 'PAIR',
  AIR: 'AIR',
};

const RANK_MAP = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

/**
 * Classifies a hand based on hole cards and board.
 * @param {Array} holeCards - [{rank, suit}, {rank, suit}]
 * @param {Array} board - [{rank, suit}, ...]
 * @returns {string} One of HAND_CLASSES
 */
export function classifyHand(holeCards, board) {
  const allCards = [...holeCards, ...board];
  const ranks = allCards.map(c => RANK_MAP[c.rank]).sort((a, b) => a - b);
  const suits = allCards.map(c => c.suit);

  // 1. Flush check
  const suitCounts = {};
  suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
  if (Object.values(suitCounts).some(count => count >= 5)) {
    return HAND_CLASSES.FLUSH;
  }

  // 2. Straight check
  const uniqueRanks = [...new Set(ranks)];
  let hasStraight = false;
  if (uniqueRanks.length >= 5) {
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) {
        hasStraight = true;
        break;
      }
    }
    // Special case: A-2-3-4-5
    if (uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
      hasStraight = true;
    }
  }
  if (hasStraight) return HAND_CLASSES.STRAIGHT;

  // 3. Sets/Trips/Four of a Kind
  const rankCounts = {};
  ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
  
  const sortedRankCounts = Object.entries(rankCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = sortedRankCounts[0][1];
  const maxRank = parseInt(sortedRankCounts[0][0]);

  if (maxCount >= 3) {
    // Set: Hole cards were a pair
    const holeRanks = holeCards.map(c => RANK_MAP[c.rank]);
    if (holeRanks[0] === holeRanks[1]) {
      return HAND_CLASSES.SET;
    }
    return HAND_CLASSES.TRIPS;
  }

  // 4. Two Pair
  const pairs = sortedRankCounts.filter(entry => entry[1] >= 2);
  if (pairs.length >= 2) {
    return HAND_CLASSES.TWO_PAIR;
  }

  // 5. Top Pair vs Overpair vs Pair
  if (pairs.length === 1) {
    const pairRank = parseInt(pairs[0][0]);
    const boardRanks = board.map(c => RANK_MAP[c.rank]);
    const topBoardRank = Math.max(...boardRanks);
    
    if (pairRank > topBoardRank) {
      return HAND_CLASSES.OVERPAIR;
    }
    if (pairRank === topBoardRank) {
      return HAND_CLASSES.TOP_PAIR;
    }
    return HAND_CLASSES.PAIR;
  }

  return HAND_CLASSES.AIR;
}
