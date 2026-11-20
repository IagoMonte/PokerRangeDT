import { describe, it, expect } from 'vitest';
import { presetToChips, RAISE_PRESETS, fromButtons } from '../../../src/composables/useActions.js';

// Minimal live-table double: only the fields presetToChips reads.
function table({ bb = 20, currentBet = 20, lastIncrement = 20, seats }) {
  return { bb, currentBet, lastIncrement, seats };
}
const seat = (committed, stack) => ({ committed, stack });
const byLabel = (l) => RAISE_PRESETS.find((p) => p.label === l);

describe('presets use real chips off the live table', () => {
  // Blinds 10/20 posted, hero UTG with 2000 behind.
  const open = table({
    currentBet: 20, lastIncrement: 20,
    seats: [seat(10, 1990), seat(20, 1980), seat(0, 2000)],
  });

  it('2.5x/3x are BB multiples, not pot percent', () => {
    expect(presetToChips(open, 2, byLabel('2.5x'))).toBe(50);
    expect(presetToChips(open, 2, byLabel('3x'))).toBe(60);
  });

  it('pot fractions build on currentBet + toCall + frac×pot', () => {
    // pot = 30, toCall = 20 → 1/2 pot = 20 + 20 + 15 = 55
    expect(presetToChips(open, 2, byLabel('1/2 pot'))).toBe(55);
    expect(presetToChips(open, 2, byLabel('pot'))).toBe(70);
  });

  it('2.5x/3x facing a raise multiply the open (3-bet sizing), not the big blind', () => {
    // BB 20, open to 50: 3x the open = 150 (a bb-based 60 would be below min-raise).
    const vsOpen = table({
      currentBet: 50, lastIncrement: 30,
      seats: [seat(10, 1990), seat(50, 1950), seat(20, 1980)],
    });
    expect(presetToChips(vsOpen, 2, byLabel('3x'))).toBe(150);
    expect(presetToChips(vsOpen, 2, byLabel('2.5x'))).toBe(125);
  });

  it('clamps up to min-raise facing aggression (engine throws below min)', () => {
    // Pot pequeno: 1/3 pot cai abaixo do min-raise-to (200 + 200 = 400).
    const small = table({
      currentBet: 200, lastIncrement: 200,
      seats: [seat(190, 1810), seat(200, 1800), seat(0, 0)],
    });
    expect(presetToChips(small, 0, byLabel('1/3 pot'))).toBe(400);
  });

  it('fração do pote cai na grade de fichas (sem 113.33)', () => {
    // pote 110, to-call 20: 2/3 pote = 20 + 20 + 73.33 → 113 fichas.
    const t = table({
      currentBet: 20, lastIncrement: 20,
      seats: [seat(60, 1940), seat(50, 1950), seat(0, 2000)],
    });
    const v = presetToChips(t, 2, byLabel('2/3 pot'));
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBe(113);
  });

  it('clamps down to the stack (short stack becomes short all-in)', () => {
    const short = table({
      currentBet: 20, lastIncrement: 20,
      seats: [seat(10, 1990), seat(20, 1980), seat(0, 40)],
    });
    expect(presetToChips(short, 2, byLabel('1/2 pot'))).toBe(40);
  });

  it('throws without the live table (no guessing)', () => {
    expect(() => presetToChips(null, 0, byLabel('2.5x'))).toThrow(/live table/);
  });
});

describe('fromButtons raise-confirm with chips unit', () => {
  it('passes absolute chips through with the aggression token', () => {
    expect(fromButtons('raise-confirm', { value: 50, facing: 'none', unit: 'chips' }))
      .toEqual({ token: 'OR', size: { value: 50, unit: 'chips' } });
    expect(fromButtons('raise-confirm', { value: 380, facing: 'open', unit: 'chips' }).token).toBe('3B');
  });

  it('rejects non-positive chip values', () => {
    for (const bad of [0, -50, Number.NaN, 'abc']) {
      expect(() => fromButtons('raise-confirm', { value: bad, unit: 'chips' })).toThrow();
    }
  });

  it('pct path unchanged (100 = shove)', () => {
    expect(fromButtons('raise-confirm', { value: 100 })).toEqual({ token: 'ALL-IN', size: null });
  });
});
