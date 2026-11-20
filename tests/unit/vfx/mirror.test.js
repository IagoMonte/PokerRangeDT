import { describe, it, expect } from 'vitest';
import { VFX, createVfxMirror, reduceVfxEvent, plaqueLabel } from '../../../src/vfx.js';

describe('reduceVfxEvent (event → seat state)', () => {
  it('turn lights the actor ring', () => {
    const m = reduceVfxEvent(createVfxMirror(), { type: 'turn', seat: 4 });
    expect(m.actor).toBe(4);
    expect(m.key).toBe(0); // turns don't consume action keys
  });

  it('actions key, tag tokens, and track folds/all-ins', () => {
    let m = createVfxMirror();
    m = reduceVfxEvent(m, { type: 'action', seat: 4, token: 'OR', size: 50, allIn: false });
    expect(m.key).toBe(1);
    expect(m.lastAction).toEqual({ seat: 4, token: 'OR', size: 50, key: 1 });
    expect(m.folded).toEqual([]);
    m = reduceVfxEvent(m, { type: 'action', seat: 5, token: 'FOLD', size: null, allIn: false });
    expect(m.key).toBe(2);
    expect(m.folded).toEqual([5]);
    m = reduceVfxEvent(m, { type: 'action', seat: 6, token: 'ALL-IN', size: 2000, allIn: true });
    expect(m.allIn).toEqual([6]);
    // Same seat folding twice (or re-emit) never duplicates.
    m = reduceVfxEvent(m, { type: 'action', seat: 5, token: 'FOLD', size: null, allIn: false });
    expect(m.folded).toEqual([5]);
  });

  it('ignores junk without moving', () => {
    const m = createVfxMirror();
    reduceVfxEvent(m, null);
    reduceVfxEvent(m, { type: 'action' });
    reduceVfxEvent(m, { type: 'unknown', seat: 1 });
    expect(m).toEqual(createVfxMirror());
  });

  it('plaques track the latest action per seat until hand reset', () => {
    let m = createVfxMirror();
    expect(m.plaques).toEqual({});
    m = reduceVfxEvent(m, { type: 'action', seat: 2, token: 'OR', size: 50, allIn: false });
    expect(m.plaques[2]).toEqual({ token: 'OR', size: 50 });
    // Same seat acts again → plaque updates, other seats untouched.
    m = reduceVfxEvent(m, { type: 'action', seat: 0, token: 'CALL', size: 40, allIn: false });
    m = reduceVfxEvent(m, { type: 'action', seat: 2, token: 'CALL', size: 150, allIn: false });
    expect(m.plaques[2]).toEqual({ token: 'CALL', size: 150 });
    expect(m.plaques[0]).toEqual({ token: 'CALL', size: 40 });
    // Size-less actions (folds) still plaque.
    m = reduceVfxEvent(m, { type: 'action', seat: 5, token: 'FOLD', size: null, allIn: false });
    expect(m.plaques[5]).toEqual({ token: 'FOLD', size: null });
    // Only a fresh mirror (hand reset) clears plaques.
    expect(createVfxMirror().plaques).toEqual({});
  });

  it('back-to-back flights carry distinct keys (overlap-safe)', () => {
    let m = createVfxMirror();
    m = reduceVfxEvent(m, { type: 'action', seat: 1, token: 'OR', size: 50, allIn: false });
    m = reduceVfxEvent(m, { type: 'action', seat: 2, token: 'CALL', size: 50, allIn: false });
    expect(m.key).toBe(2);
    expect(m.lastAction.key).toBe(2);
  });

  it('flying token ships enabled (kill-switch lives in VFX)', () => {
    expect(VFX.flyingToken).toBe(true);
  });

  it('pins the doubled rhythm (regression guard on calibration)', () => {
    // street/linger joined with the board choreography: same doubled
    // calibration as the action rhythm, pinned here so drift is explicit.
    expect(VFX.dur).toEqual({ pulse: 400, flight: 900, countUp: 600, deal: 500, street: 600, linger: 1200 });
  });

  it('plaqueLabel speaks dry verbs (RAISE covers OR/3B/4B, LIMP is CALL)', () => {
    expect(plaqueLabel('FOLD')).toBe('FOLD');
    expect(plaqueLabel('CALL')).toBe('CALL');
    expect(plaqueLabel('LIMP')).toBe('CALL');
    expect(plaqueLabel('CHECK')).toBe('CHECK');
    expect(plaqueLabel('OR')).toBe('RAISE');
    expect(plaqueLabel('3B')).toBe('RAISE');
    expect(plaqueLabel('4B')).toBe('RAISE');
    expect(plaqueLabel('ALL-IN')).toBe('ALL-IN');
  });
});
