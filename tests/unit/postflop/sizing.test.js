import { describe, it, expect } from 'vitest';
import { calculateBetSize, SIZING_TABLE } from '../../../src/engine/sizing.js';
import { BOARD_TEXTURES } from '../../../src/engine/board.js';

describe('Bet Sizing Logic', () => {
  it('should return 100% pot for high score (>85) on a wet board', () => {
    const size = calculateBetSize(90, BOARD_TEXTURES.WET);
    expect(size).toBe(1.0);
  });

  it('should return 50% pot for high score (>85) on a dry board', () => {
    const size = calculateBetSize(90, BOARD_TEXTURES.DRY);
    expect(size).toBe(0.5);
  });

  it('should return 75% pot for strong score (60-85) on a wet board', () => {
    const size = calculateBetSize(70, BOARD_TEXTURES.WET);
    expect(size).toBe(0.75);
  });

  it('should return 33% pot for strong score (60-85) on a dry board', () => {
    const size = calculateBetSize(70, BOARD_TEXTURES.DRY);
    expect(size).toBe(0.33);
  });

  it('should return 25% pot for medium score (30-60) on a dry board', () => {
    const size = calculateBetSize(45, BOARD_TEXTURES.DRY);
    expect(size).toBe(0.25);
  });

  it('should return 33% pot for air score (<=30) on a wet board', () => {
    const size = calculateBetSize(20, BOARD_TEXTURES.WET);
    expect(size).toBe(0.33);
  });
});

describe('SIZING_TABLE (tunable without touching the formula)', () => {
  it('a custom table reshapes sizes for the same score', () => {
    const smallBall = [
      { minScore: 85, wet: 0.5, dry: 0.25 },
      { minScore: 0, wet: 0.25, dry: 0.2 },
    ];
    expect(calculateBetSize(90, BOARD_TEXTURES.WET, smallBall)).toBe(0.5);
    expect(calculateBetSize(90, BOARD_TEXTURES.WET)).toBe(1.0); // default untouched
  });

  it('boundary scores fall to the lower row, exactly like the old thresholds', () => {
    expect(calculateBetSize(85, BOARD_TEXTURES.WET)).toBe(0.75);
    expect(calculateBetSize(60, BOARD_TEXTURES.DRY)).toBe(0.25);
  });

  it('the default table covers every score band', () => {
    expect(SIZING_TABLE[0].minScore).toBe(85);
    expect(SIZING_TABLE[SIZING_TABLE.length - 1].minScore).toBe(0);
  });
});
