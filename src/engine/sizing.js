/**
 * Bet Sizing Logic (% of pot).
 * The whole table lives in SIZING_TABLE: first row whose minScore the
 * decision score clears wins. Tune numbers here, never in the formula.
 */
import { BOARD_TEXTURES } from './board.js';

// Wet boards charge more (draws must pay); dry boards go small (bluffs cheap,
// value still gets called by worse).
export const SIZING_TABLE = [
  { minScore: 85, wet: 1.0, dry: 0.5 },
  { minScore: 60, wet: 0.75, dry: 0.33 },
  { minScore: 30, wet: 0.5, dry: 0.25 },
  { minScore: 0, wet: 0.33, dry: 0.25 },
];

/**
 * @param {number} score - decision score 0-100
 * @param {string} texture - BOARD_TEXTURES.WET or DRY
 * @param {Array} table - override SIZING_TABLE for fine-tuning
 * @returns {number} pot fraction (e.g. 0.33)
 */
export function calculateBetSize(score, texture, table = SIZING_TABLE) {
  const isWet = texture === BOARD_TEXTURES.WET;
  for (const row of table) {
    if (score > row.minScore) return isWet ? row.wet : row.dry;
  }
  const last = table[table.length - 1];
  return isWet ? last.wet : last.dry;
}
