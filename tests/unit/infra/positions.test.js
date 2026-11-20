import { describe, it, expect } from 'vitest';
import { getPositionGroup, POSITIONS, getPositionsInGroup } from '../../../src/infra/positions.js';

describe('Position Grouping Logic', () => {
  it('should return UTG for early positions', () => {
    expect(getPositionGroup(POSITIONS.UTG)).toBe('UTG');
    expect(getPositionGroup(POSITIONS.UTG1)).toBe('UTG');
    expect(getPositionGroup(POSITIONS.UTG2)).toBe('UTG');
  });

  it('should return MP for middle positions', () => {
    expect(getPositionGroup(POSITIONS.LOJACK)).toBe('MP');
    expect(getPositionGroup(POSITIONS.HIJACK)).toBe('MP');
  });

  it('should return the position itself for unique positions', () => {
    expect(getPositionGroup(POSITIONS.BUTTON)).toBe('BTN');
    expect(getPositionGroup(POSITIONS.CUTOFF)).toBe('CO');
    expect(getPositionGroup(POSITIONS.SMALL_BLIND)).toBe('SB');
    expect(getPositionGroup(POSITIONS.BIG_BLIND)).toBe('BB');
  });

  it('should throw an error for invalid positions', () => {
    expect(() => getPositionGroup('INVALID_POS')).toThrow('Invalid position provided: INVALID_POS');
  });

  it('should return all positions in a group', () => {
    expect(getPositionsInGroup('UTG')).toContain(POSITIONS.UTG);
    expect(getPositionsInGroup('UTG')).toContain(POSITIONS.UTG1);
    expect(getPositionsInGroup('UTG')).toContain(POSITIONS.UTG2);
    expect(getPositionsInGroup('UTG').length).toBe(3);
  });
});
