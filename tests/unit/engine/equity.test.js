import { describe, it, expect } from 'vitest';
import { calculateEquity } from '../../../src/engine/equity';

describe('calculateEquity', () => {
  it('should calculate flop equity using Rule of 4', () => {
    // 9 outs on flop: 9 * 4 = 36%
    expect(calculateEquity(9, 'flop')).toBe(36);
  });

  it('should calculate turn equity using Rule of 2 + 1', () => {
    // 9 outs on turn: 9 * 2 + 1 = 19%
    expect(calculateEquity(9, 'turn')).toBe(19);
  });

  it('should return 0 for unknown street', () => {
    expect(calculateEquity(9, 'river')).toBe(0);
  });

  it('should handle 0 outs', () => {
    expect(calculateEquity(0, 'flop')).toBe(0);
    expect(calculateEquity(0, 'turn')).toBe(1);
  });

  it('should handle high number of outs', () => {
    // 15 outs on flop: 15 * 4 = 60%
    expect(calculateEquity(15, 'flop')).toBe(60);
  });
});
