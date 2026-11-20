import { describe, it, expect } from 'vitest';
import { fmtChips, boardToDealer } from '../../../src/infra/format.js';

describe('fmtChips (display only, never math)', () => {
  it('shows integers without decimals', () => {
    expect(fmtChips(20)).toBe('20');
    expect(fmtChips(2000)).toBe('2000');
    expect(fmtChips(0)).toBe('0');
  });

  it('trims float dust to real cents', () => {
    expect(fmtChips(0.1 + 0.2)).toBe('0.3'); // 0.30000000000000004
    expect(fmtChips(50 * 0.2)).toBe('10');
    expect(fmtChips(65.5)).toBe('65.5');
    expect(fmtChips(10.02)).toBe('10.02');
  });

  it('guards non-numbers', () => {
    expect(fmtChips(NaN)).toBe('–');
    expect(fmtChips(Infinity)).toBe('–');
    expect(fmtChips('20')).toBe('–');
    expect(fmtChips(undefined)).toBe('–');
  });
});

describe('boardToDealer (exact inverse of preflop toBoardCard)', () => {
  it('maps every suit letter to the dealer symbol', () => {
    expect(boardToDealer({ rank: 'A', suit: 'h' })).toBe('A♥');
    expect(boardToDealer({ rank: 'T', suit: 's' })).toBe('T♠');
    expect(boardToDealer({ rank: '7', suit: 'c' })).toBe('7♣');
    expect(boardToDealer({ rank: 'K', suit: 'd' })).toBe('K♦');
  });

  it('round-trips every real deck card through toBoardCard', async () => {
    const { toBoardCard } = await import('../../../src/engine/preflop.js');
    const { SUITS, RANKS } = await import('../../../src/constants/poker.js');
    for (const rank of RANKS) {
      for (const suit of SUITS) {
        const dealer = rank + suit;
        expect(boardToDealer(toBoardCard(dealer))).toBe(dealer);
      }
    }
  });
});
