/**
 * Board Mask & Texture Logic
 * Handles board generation and coordination analysis (Wet vs Dry).
 */

export const BOARD_TEXTURES = {
  WET: 'Wet',
  DRY: 'Dry',
};

/**
 * Generates a random board of N cards from a deck.
 * @param {number} numCards - Number of cards to generate (3 for flop, 1 for turn, 1 for river).
 * @param {Array} excludeCards - Cards already in hand or on board.
 * @returns {Array} Array of card objects { rank, suit }.
 */
export function generateBoardCards(numCards, excludeCards = []) {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const suits = ['s', 'h', 'd', 'c'];
  const deck = [];

  for (const rank of ranks) {
    for (const suit of suits) {
      const card = { rank, suit };
      if (!excludeCards.some(c => c.rank === card.rank && c.suit === card.suit)) {
        deck.push(card);
      }
    }
  }

  const board = [];
  for (let i = 0; i < numCards; i++) {
    const randomIndex = Math.floor(Math.random() * deck.length);
    board.push(deck.splice(randomIndex, 1)[0]);
  }

  return board;
}

/**
 * Analyzes board texture to determine if it is 'Wet' or 'Dry'.
 * A board is 'Wet' if:
 * 1. It has 3 cards of the same suit (flush draw/made).
 * 2. It has 3 cards that can form a straight (connectedness).
 * 3. It has a pair (though often considered dry, in this simplified engine we'll focus on coordination).
 * 
 * @param {Array} board - Array of card objects.
 * @returns {string} BOARD_TEXTURES.WET or BOARD_TEXTURES.DRY.
 */
export function analyzeTexture(board) {
  if (board.length < 3) return BOARD_TEXTURES.DRY;

  // 1. Check for Flush Coordination (3+ of same suit)
  const suitCounts = {};
  board.forEach(card => {
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  });
  if (Object.values(suitCounts).some(count => count >= 3)) {
    return BOARD_TEXTURES.WET;
  }

  // 2. Check for Straight Coordination (Connectedness)
  // Map ranks to numeric values
  const rankMap = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
  const values = board.map(card => rankMap[card.rank]).sort((a, b) => a - b);

  // Check if any 3 cards are "connected" (within a 5-card span)
  // For a 3-card board (flop), they just need to be within a span of 5.
  // For 4 or 5 cards, we check if any subset of 3 is connected.
  let isConnected = false;
  for (let i = 0; i <= values.length - 3; i++) {
    if (values[i + 2] - values[i] <= 4) {
      isConnected = true;
      break;
    }
  }
  
  // Special case for A-2-3-4-5 (Ace low straight)
  if (values.includes(14) && values.includes(2) && values.includes(3)) {
    isConnected = true;
  }

  if (isConnected) {
    return BOARD_TEXTURES.WET;
  }

  return BOARD_TEXTURES.DRY;
}
