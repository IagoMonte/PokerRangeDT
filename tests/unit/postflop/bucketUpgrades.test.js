import { describe, it, expect } from 'vitest';
import { BUCKETS, BUCKET_CONFIG, bucketFor, bucketForHand } from '../../../src/engine/buckets.js';
import { HAND_CLASSES } from '../../../src/engine/classifier.js';

const C = (rank, suit) => ({ rank, suit });

describe('bucketFor (class + draw upgrades, the brain path)', () => {
  it('made hands ignore outs: SET stays A, TOP_PAIR stays B', () => {
    expect(bucketFor(HAND_CLASSES.SET, 9)).toBe(BUCKETS.A);
    expect(bucketFor(HAND_CLASSES.TOP_PAIR, 9)).toBe(BUCKETS.B);
  });

  it('AIR without outs stays D', () => {
    expect(bucketFor(HAND_CLASSES.AIR, 0)).toBe(BUCKETS.D);
  });

  it('AIR + backdoor (~1 out) stays D — backdoors never upgrade alone', () => {
    expect(bucketFor(HAND_CLASSES.AIR, 1)).toBe(BUCKETS.D);
  });

  it('AIR + OESD/gutshot (4-8 outs) climbs to C', () => {
    expect(bucketFor(HAND_CLASSES.AIR, 4)).toBe(BUCKETS.C);
    expect(bucketFor(HAND_CLASSES.AIR, 8)).toBe(BUCKETS.C);
  });

  it('AIR + flush draw (9 outs) climbs to B', () => {
    expect(bucketFor(HAND_CLASSES.AIR, 9)).toBe(BUCKETS.B);
  });

  it('PAIR + strong redraw (8+ outs) climbs to B, weak redraw stays C', () => {
    expect(bucketFor(HAND_CLASSES.PAIR, 9)).toBe(BUCKETS.B);
    expect(bucketFor(HAND_CLASSES.PAIR, 4)).toBe(BUCKETS.C);
  });

  it('thresholds are tunable via config override without touching the motor', () => {
    const strict = {
      ...BUCKET_CONFIG,
      drawUpgrade: { airStrongOuts: 12, airMediumOuts: 8, pairStrongOuts: 12 },
    };
    expect(bucketFor(HAND_CLASSES.AIR, 9, strict)).toBe(BUCKETS.C);
    expect(bucketFor(HAND_CLASSES.AIR, 4, strict)).toBe(BUCKETS.D);
  });
});

describe('bucketForHand (real hand: classify + outs + bucket)', () => {
  it('OESD air on K-8-9 flop → C with 8 outs', () => {
    const r = bucketForHand(
      [C('6', 's'), C('7', 'h')],
      [C('8', 'd'), C('9', 'c'), C('K', 'd')],
    );
    expect(r.handClass).toBe(HAND_CLASSES.AIR);
    expect(r.outs).toBe(8);
    expect(r.bucket).toBe(BUCKETS.C);
  });

  it('top pair + nut flush redraw → B (made hand rules, redraws add equity later)', () => {
    const r = bucketForHand(
      [C('A', 's'), C('K', 's')],
      [C('2', 's'), C('7', 's'), C('K', 'd')],
    );
    expect(r.handClass).toBe(HAND_CLASSES.TOP_PAIR);
    expect(r.bucket).toBe(BUCKETS.B);
  });

  it('pure air, no draw → D', () => {
    const r = bucketForHand(
      [C('2', 'c'), C('7', 'd')],
      [C('K', 's'), C('9', 'h'), C('4', 'c')],
    );
    expect(r.handClass).toBe(HAND_CLASSES.AIR);
    expect(r.outs).toBe(0);
    expect(r.bucket).toBe(BUCKETS.D);
  });
});
