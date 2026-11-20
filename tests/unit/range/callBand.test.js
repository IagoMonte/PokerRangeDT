import { describe, it, expect } from 'vitest';
import { rangeGame } from '../../../src/composables/useRangeGame.js';
import { getComboCount } from '../../../src/infra/handRankings.js';

// The station fix: a CALL band extends the xrfi set below the 3B core with
// call-only ['CALL'] lines, so stations call opens instead of folding them.
// Core (sized by threeBet) is 3B-only; flats live in the call band (disjoint).

const { getModRange } = rangeGame();

function xrfiCombos(xrfi) {
  let n = 0;
  for (const hand of xrfi.keys()) n += getComboCount(hand);
  return n;
}

describe('getModRange call band', () => {
  it('defaults to threeBet: no extension, core is 3B-only', () => {
    const { xrfi } = getModRange({ POS: 'BTN', RFI: 0.2, threeBet: 0.08, fourBet: 0, bluff: 0.3 });
    expect(xrfi.size).toBeGreaterThan(0);
    for (const line of xrfi.values()) {
      expect(line).toEqual(['3B']);
    }
  });

  it('explicit bigger call extends the set with call-only lines', () => {
    const base = getModRange({ POS: 'BTN', RFI: 0.08, threeBet: 0.03, fourBet: 0, bluff: 0.1 });
    const wide = getModRange({ POS: 'BTN', RFI: 0.08, threeBet: 0.03, fourBet: 0, bluff: 0.1, call: 0.40 });
    expect(xrfiCombos(wide.xrfi)).toBeGreaterThanOrEqual(Math.round(0.40 * 1326) - 12);
    expect(wide.xrfi.size).toBeGreaterThan(base.xrfi.size);
    const callOnly = [...wide.xrfi.entries()].filter(([, line]) => !line.includes('3B'));
    expect(callOnly.length).toBeGreaterThan(0);
    for (const [, line] of callOnly) expect(line).toEqual(['CALL']);
    // The 3B core survives intact on top.
    for (const [hand, line] of base.xrfi) {
      expect(wide.xrfi.get(hand)).toEqual(line);
    }
  });

  it('call below threeBet never shrinks the core', () => {
    const { xrfi } = getModRange({ POS: 'BTN', RFI: 0.2, threeBet: 0.08, fourBet: 0, bluff: 0, call: 0.01 });
    for (const line of xrfi.values()) expect(line).toContain('3B');
  });
});
