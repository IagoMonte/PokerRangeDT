import { describe, it, expect } from 'vitest';
import { calculateRangeFromPercentage } from '../../../src/composables/useRangeGame.js';

describe('Villain Range Manipulator', () => {
  it('should return an empty set for 0% frequency', () => {
    const range = calculateRangeFromPercentage(0);
    expect(range.size).toBe(0);
  });

  it('should return all hands for 100% frequency', () => {
    const range = calculateRangeFromPercentage(1.0);
    expect(range.size).toBe(169);
  });

  it('should select roughly the correct number of combos for a given %', () => {
    const range = calculateRangeFromPercentage(0.10);

    let totalCombos = 0;
    range.forEach(hand => {
      if (hand.endsWith('s')) totalCombos += 4;
      else if (hand.endsWith('o')) totalCombos += 12;
      else totalCombos += 6;
    });

    // boolean rounding bounds deviation to ±12 combos.
    expect(totalCombos).toBeGreaterThanOrEqual(121);
    expect(totalCombos).toBeLessThanOrEqual(145);
  });

  it('should use RFI_BLUFF_RANKING deterministically, without random fallback', () => {
    const range = calculateRangeFromPercentage(0.10, 1.0);

    const rfiBluffHands = ['A5s','A4s','A3s','A2s','K9s','Q9s','J9s','T9s','98s','87s','76s','65s','54s'];
    const hasPreferredBluff = rfiBluffHands.some(hand => range.has(hand));

    expect(hasPreferredBluff).toBe(true);

    let totalCombos = 0;
    range.forEach(hand => {
      if (hand.endsWith('s')) totalCombos += 4;
      else if (hand.endsWith('o')) totalCombos += 12;
      else totalCombos += 6;
    });

    const targetCombos = Math.round(0.10 * 1326);
    expect(totalCombos).toBeGreaterThanOrEqual(targetCombos - 12);
    expect(totalCombos).toBeLessThanOrEqual(targetCombos + 12);

    // Deterministic: same inputs always produce the same set.
    const again = calculateRangeFromPercentage(0.10, 1.0);
    expect([...again].sort()).toEqual([...range].sort());
  });

  it('should correctly prioritize top hands for the value portion', () => {
    const range = calculateRangeFromPercentage(0.05, 0); // 5% = ~66 combos
    expect(range.has('AA')).toBe(true);
    expect(range.has('KK')).toBe(true);
    expect(range.has('TT')).toBe(true);
    expect(range.has('32o')).toBe(false);
  });

  it('should handle high bluffFreq with low total %', () => {
    const range = calculateRangeFromPercentage(0.01, 1.0);
    expect(range.size).toBeGreaterThan(0);
  });
});
