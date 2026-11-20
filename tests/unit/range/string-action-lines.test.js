import { describe, it, expect, beforeEach } from 'vitest';
import { rangeGame, Ranges } from '../../../src/composables/useRangeGame';

const { getModRange } = rangeGame();

// Stored action lines are normalized to arrays before updates.
describe('string action lines are normalized before updates', () => {
  beforeEach(() => {
    for (const pos in Ranges.RFI) Ranges.RFI[pos].clear();
    for (const pos in Ranges.XRFI) Ranges.XRFI[pos].clear();
  });

  it('não crasha com range legado em string quando fourBet > 0', () => {
    Ranges.RFI['UTG'].set('AA', 'OR');

    let result;
    expect(() => {
      result = getModRange({ POS: 'UTG', RFI: 0.2, threeBet: 0.08, fourBet: 0.05, bluff: 0.3 });
    }).not.toThrow();

    const line = result.rfi.get('AA');
    expect(Array.isArray(line)).toBe(true);
    expect(line).toContain('OR');
    expect(line).toContain('4B');
  });

  it('não crasha com xrfi legado em string', () => {
    Ranges.XRFI['UTG'].set('KK', 'CALL');

    let result;
    expect(() => {
      result = getModRange({ POS: 'UTG', RFI: 0, threeBet: 0.08, fourBet: 0, bluff: 0 });
    }).not.toThrow();

    expect(result.xrfi.has('KK')).toBe(true);
  });
});
