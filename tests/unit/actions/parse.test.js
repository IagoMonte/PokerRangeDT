import { describe, it, expect } from 'vitest';
import {
  parseActionLine,
  parseSize,
  assertLegalTokens,
} from '../../../src/composables/useActions.js';
import { useActions } from '../../../src/composables/useActions.js';

const { isValidQuickAction } = useActions();

describe('parseSize', () => {
  it('parses bb, x and raw numbers', () => {
    expect(parseSize('3bb')).toEqual({ value: 3, unit: 'bb' });
    expect(parseSize('3BB')).toEqual({ value: 3, unit: 'bb' });
    expect(parseSize('2.5x')).toEqual({ value: 2.5, unit: 'x' });
    expect(parseSize('4')).toEqual({ value: 4, unit: 'raw' });
  });

  it('rejects zero, negative, non-numeric and empty', () => {
    for (const bad of ['0bb', '0', '-3bb', 'abc', 'bb', '']) {
      expect(() => parseSize(bad)).toThrow();
    }
  });
});

describe('parseActionLine', () => {
  it('parses a single token and attaches sizes to the preceding token', () => {
    expect(parseActionLine('OR')).toEqual([{ token: 'OR', size: null }]);
    expect(parseActionLine('or 3bb')).toEqual([
      { token: 'OR', size: { value: 3, unit: 'bb' } },
    ]);
  });

  it('parses multi-token progressions', () => {
    expect(parseActionLine('OR 3B FOLD').map(s => s.token)).toEqual(['OR', '3B', 'FOLD']);
    expect(parseActionLine('OR 3bb 3B 10bb 4B FOLD').map(s => s.token)).toEqual(
      ['OR', '3B', '4B', 'FOLD'],
    );
  });

  it('accepts atomic labels and free CALL lines', () => {
    for (const line of ['FOLD', 'ALL-IN', '3B', 'CALL', 'CALL CALL', '3B FOLD', 'OR CALL', 'OR ALL-IN']) {
      expect(() => parseActionLine(line)).not.toThrow(line);
    }
  });

  it('rejects anything after FOLD or ALL-IN', () => {
    for (const line of ['OR FOLD CALL', 'FOLD OR', 'OR ALL-IN 3B', 'ALL-IN CALL']) {
      expect(() => parseActionLine(line)).toThrow(line);
    }
  });

  it('rejects broken aggression order', () => {
    // OR can only open; 3B needs nothing (XRFI, aggression implicit);
    // 4B needs an earlier OR or opening LIMP.
    for (const line of ['3B OR', 'OR OR', '4B 3B', 'CALL 4B', '4B FOLD', '3B 4B']) {
      expect(() => parseActionLine(line)).toThrow(line);
    }
  });

  it('accepts implicit-aggression plans (OR 4B FOLD is valid)', () => {
    for (const line of ['OR 4B', 'OR 4B FOLD', 'CALL 3B', 'OR 3B FOLD']) {
      expect(() => parseActionLine(line)).not.toThrow(line);
    }
  });

  it('LIMP only opens; after it FOLD/CALL/3B/4B/ALL-IN hold, OR never', () => {
    for (const line of ['LIMP', 'LIMP FOLD', 'LIMP CALL', 'LIMP 3B', 'LIMP 4B', 'LIMP 3B FOLD']) {
      expect(() => parseActionLine(line)).not.toThrow(line);
    }
    for (const line of ['OR LIMP', 'CALL LIMP', 'LIMP LIMP', 'LIMP OR', 'LIMP FOLD CALL']) {
      expect(() => parseActionLine(line)).toThrow(line);
    }
  });

  it('rejects same-level repeats', () => {
    expect(() => parseActionLine('OR 3B 3B')).toThrow();
    expect(() => parseActionLine('OR 3B 4B 4B')).toThrow();
  });

  it('rejects non-tokens, sizes first, and empty input', () => {
    for (const line of ['foo', '3bb OR', '', '   ']) {
      expect(() => parseActionLine(line)).toThrow();
    }
  });
});

describe('assertLegalTokens', () => {
  it('accepts the user example: 3bet then fold vs 4bet', () => {
    expect(assertLegalTokens(['OR', '3B', 'FOLD'])).toBe(true);
    expect(assertLegalTokens(['OR', '3B', '4B', 'FOLD'])).toBe(true);
  });

  it('accepts 4B over implicit aggression (needs OR, not 3B)', () => {
    expect(assertLegalTokens(['OR', '4B', 'FOLD'])).toBe(true);
    expect(assertLegalTokens(['CALL', '3B'])).toBe(true);
    expect(() => assertLegalTokens(['CALL', '4B'])).toThrow();
    expect(() => assertLegalTokens(['3B', '4B'])).toThrow();
  });

  it('rejects empty sequences', () => {
    expect(() => assertLegalTokens([])).toThrow();
  });
});

describe('isValidQuickAction (boolean wrapper, RangeLegend API)', () => {
  it('matches the parser', () => {
    expect(isValidQuickAction('OR 3bb')).toBe(true);
    expect(isValidQuickAction('OR 3B FOLD')).toBe(true);
    expect(isValidQuickAction('OR FOLD CALL')).toBe(false);
    expect(isValidQuickAction('nonsense')).toBe(false);
    expect(isValidQuickAction('')).toBe(false);
  });
});
