import { describe, it, expect, vi } from 'vitest';
import {
  fromButtons,
  resolveAggression,
  callIsLimp,
  checkStub,
} from '../../../src/composables/useActions.js';

describe('resolveAggression (context comes from the caller, never guessed)', () => {
  it('maps facing to the aggression token', () => {
    expect(resolveAggression()).toBe('OR');
    expect(resolveAggression('none')).toBe('OR');
    expect(resolveAggression('open')).toBe('3B');
    expect(resolveAggression('3b')).toBe('4B');
    // Facing a 4-bet, any non-fold aggression at these depths is a shove.
    expect(resolveAggression('4b')).toBe('ALL-IN');
  });

  it('rejects unknown facing instead of guessing', () => {
    expect(() => resolveAggression('limp')).toThrow();
  });
});

describe('fromButtons (actionButtons → valid tokens)', () => {
  it('maps fold and call to tokens without size', () => {
    expect(fromButtons('fold')).toEqual({ token: 'FOLD', size: null });
    expect(fromButtons('call')).toEqual({ token: 'CALL', size: null });
  });

  it('resolves raise-confirm by facing with the slider size attached', () => {
    expect(fromButtons('raise-confirm', { value: 30 })).toEqual({
      token: 'OR', size: { value: 30, unit: 'pct' },
    });
    expect(fromButtons('raise-confirm', { value: 30, facing: 'open' })).toEqual({
      token: '3B', size: { value: 30, unit: 'pct' },
    });
    expect(fromButtons('raise-confirm', { value: 30, facing: '3b' })).toEqual({
      token: '4B', size: { value: 30, unit: 'pct' },
    });
  });

  it('treats slider 100 as a shove, not a sized raise', () => {
    expect(fromButtons('raise-confirm', { value: 100 })).toEqual({ token: 'ALL-IN', size: null });
  });

  it('rejects unusable raise values', () => {
    for (const bad of [0, -5, 101, 'abc', null]) {
      expect(() => fromButtons('raise-confirm', { value: bad })).toThrow();
    }
  });

  it('rejects unknown button ids instead of console.logging them', () => {
    expect(() => fromButtons('raise-slider', { value: 30 })).toThrow();
    expect(() => fromButtons('bet')).toThrow();
  });
});

describe('callIsLimp (call for exactly the BB, no blinds)', () => {
  it('detects the open-limp and excludes blinds and aggression', () => {
    const open = { facing: 'none', toCallChips: 20, bbChips: 20, heroRole: 'UTG' };
    expect(callIsLimp(open)).toBe(true);
    expect(callIsLimp({ ...open, facing: 'open' })).toBe(false);
    expect(callIsLimp({ ...open, toCallChips: 60 })).toBe(false);
    expect(callIsLimp({ ...open, heroRole: 'SMALL_BLIND' })).toBe(false);
    expect(callIsLimp({ ...open, heroRole: 'BIG_BLIND' })).toBe(false);
  });
});

describe('check (postflop: no token, explicit no-op)', () => {
  it('returns no token and a run function that touches nothing', () => {
    const mapped = fromButtons('check');
    expect(mapped.token).toBeNull();
    expect(mapped.deferred).toBe('postflop');
    const table = { openRaise: vi.fn(), call: vi.fn(), fold: vi.fn() };
    expect(mapped.run(table)).toBeUndefined();
    for (const fn of Object.values(table)) expect(fn).not.toHaveBeenCalled();
    expect(checkStub()).toBeUndefined();
  });
});
