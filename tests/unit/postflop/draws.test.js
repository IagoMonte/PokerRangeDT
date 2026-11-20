import { describe, it, expect } from 'vitest';
import { countOuts, DRAW_TYPES } from '../../../src/engine/draws.js';

const C = (rank, suit) => ({ rank, suit });

describe('countOuts (unique one-card outs to flush/straight)', () => {
  it('OESD: 6-7-8-9 needs 5 or T → 8 outs', () => {
    const { outs, draws } = countOuts(
      [C('6', 's'), C('7', 'h')],
      [C('8', 'd'), C('9', 'c'), C('K', 'd')],
    );
    expect(outs).toBe(8);
    expect(draws).toContain(DRAW_TYPES.OESD);
    expect(draws).not.toContain(DRAW_TYPES.FLUSH_DRAW);
  });

  it('gutshot: 6-7-8-T needs 9 → 4 outs', () => {
    const { outs, draws } = countOuts(
      [C('6', 's'), C('7', 'h')],
      [C('8', 'd'), C('T', 'c'), C('K', 'd')],
    );
    expect(outs).toBe(4);
    expect(draws).toContain(DRAW_TYPES.GUTSHOT);
  });

  it('flush draw: 4 spades → 9 outs', () => {
    const { outs, draws } = countOuts(
      [C('A', 's'), C('K', 's')],
      [C('2', 's'), C('7', 's'), C('K', 'd')],
    );
    expect(outs).toBe(9);
    expect(draws).toContain(DRAW_TYPES.FLUSH_DRAW);
  });

  it('double belly (river): 5-6-8-9-J-Q-K needs 7 or T, no 4-run → 8 outs', () => {
    const { outs, draws } = countOuts(
      [C('K', 's'), C('Q', 'd')],
      [C('5', 's'), C('6', 'h'), C('8', 'd'), C('J', 'c'), C('9', 'c')],
    );
    expect(outs).toBe(8);
    expect(draws).toContain(DRAW_TYPES.DOUBLE_BELLY);
    expect(draws).not.toContain(DRAW_TYPES.OESD);
  });

  it('combo draw: flush 9 + OESD 8 share Qs/7s → 15 unique outs', () => {
    const { outs, draws } = countOuts(
      [C('J', 's'), C('T', 's')],
      [C('9', 's'), C('8', 's'), C('2', 'd')],
    );
    expect(outs).toBe(15);
    expect(draws).toContain(DRAW_TYPES.FLUSH_DRAW);
    expect(draws).toContain(DRAW_TYPES.OESD);
    expect(draws).toContain(DRAW_TYPES.COMBO_DRAW);
  });

  it('backdoor flush on the flop: 3 spades → 1 out, never a bucket upgrade alone', () => {
    const { outs, draws } = countOuts(
      [C('A', 's'), C('K', 's')],
      [C('2', 'd'), C('7', 'c'), C('9', 's')],
    );
    expect(outs).toBe(1);
    expect(draws).toContain(DRAW_TYPES.BACKDOOR_FLUSH);
  });

  it('made flush needs no outs', () => {
    const { outs, draws } = countOuts(
      [C('A', 's'), C('K', 's')],
      [C('2', 's'), C('7', 's'), C('9', 's')],
    );
    expect(outs).toBe(0);
    expect(draws).toEqual([]);
  });

  it('redraws count on made pairs: pair + 4 flush → 9 outs', () => {
    const { outs, draws } = countOuts(
      [C('7', 's'), C('7', 'h')],
      [C('2', 's'), C('9', 's'), C('K', 's')],
    );
    expect(outs).toBe(9);
    expect(draws).toContain(DRAW_TYPES.FLUSH_DRAW);
  });

  it('rainbow disconnected flop: no draw, no backdoor → 0 outs', () => {
    const { outs, draws } = countOuts(
      [C('2', 'c'), C('7', 'd')],
      [C('K', 's'), C('9', 'h'), C('4', 'c')],
    );
    expect(outs).toBe(0);
    expect(draws).toEqual([]);
  });
});
