import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeMetrics } from '../../../src/engine/profileStats.js';

const play = readFileSync(new URL('../../../src/components/pages/play.vue', import.meta.url), 'utf8');

const hand = (showdown) => ({
  date: '2026-09-20T10:00:00.000Z',
  drill: 'd',
  role: 'BUTTON',
  preflop: null,
  postflop: [],
  result: { heroDelta: -10, pot: 40, showdown, won: false },
});

// WTSD mede quantas mãos o herói levou ao showdown. Fold do herói com os
// vilões decidindo no showdown não pode contar, senão o número infla.
describe('WTSD só conta showdown do herói', () => {
  it('o registro da mão exige o herói entre os seats vivos no showdown', () => {
    expect(play).toMatch(/showdown:\s*isShowdown && showdownSeats\(engineTable\.value\)\.includes\(HERO_SEAT\)/);
  });

  it('WTSD = mãos com showdown do herói / mãos jogadas', () => {
    const hands = [hand(true), hand(false), hand(false), hand(false)];
    expect(computeMetrics(hands).results.wtsd).toBeCloseTo(25, 1);
  });
});
