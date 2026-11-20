/**
 * Poker Bitmask Engine
 * Handles bit-level representations of cards and combos for fast range operations.
 */

export const CARD_COUNT = 52;
export const COMBO_COUNT = (CARD_COUNT * (CARD_COUNT - 1)) / 2; // 1326

/**
 * Maps a card (rank, suit) to a unique ID from 0 to 51.
 * @param {number} rankIdx - Index of the rank in RANKS array
 * @param {number} suitIdx - Index of the suit in SUITS array
 * @returns {number}
 */
export function getCardId(rankIdx, suitIdx) {
    return rankIdx * 4 + suitIdx;
}

/**
 * Maps two card IDs to a unique combo ID from 0 to 1325.
 * Expects c1 < c2.
 * @param {number} c1 - Lower card ID
 * @param {number} c2 - Higher card ID
 * @returns {number}
 */
export function getComboId(c1, c2) {
    const low = Math.min(c1, c2);
    const high = Math.max(c1, c2);
    // Formula for index in a triangular matrix
    return (low * (103 - low)) / 2 + (high - low - 1);
}

/**
 * Reverses getComboId to get the two card IDs.
 * @param {number} comboId 
 * @returns {[number, number]} [c1, c2]
 */
export function getCardsFromComboId(comboId) {
    let low = 0;
    
    // Binary search for the 'low' card
    let left = 0, right = 50;
    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        let startIdx = (mid * (103 - mid)) / 2;
        if (startIdx <= comboId) {
            low = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    const startIdx = (low * (103 - low)) / 2;
    const highOffset = comboId - startIdx;
    const high = low + 1 + highOffset;
    
    return [low, high];
}

/**
 * Range Operations
 */

export const rangeOps = {
    union: (maskA, maskB) => maskA | maskB,
    intersect: (maskA, maskB) => maskA & maskB,
    difference: (maskA, maskB) => maskA & ~maskB,
    contains: (mask, comboId) => (mask >> BigInt(comboId)) & 1n,
    setCombo: (mask, comboId) => mask | (1n << BigInt(comboId)),
    clearCombo: (mask, comboId) => mask & ~(1n << BigInt(comboId)),
    countCombos: (mask) => {
        // Convert BigInt to binary string and count '1's
        // Note: For very large masks, this is slow, but for 1326 bits it's acceptable in JS.
        return mask.toString(2).split('1').length - 1;
    }
};
