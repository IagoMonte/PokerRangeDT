import { describe, it, expect } from 'vitest';
import { displayUnit, setDisplayUnit, fmtMoney } from '../../../src/composables/useDisplayUnit.js';

describe('display unit (BB x chips)', () => {
  it('defaults to chips (today look) outside a browser', () => {
    setDisplayUnit('chips');
    expect(displayUnit.value).toBe('chips');
    expect(fmtMoney(2000, 20)).toBe('2000');
    expect(fmtMoney(80, 20)).toBe('80');
  });

  it('bb mode divides by the big blind and trims', () => {
    setDisplayUnit('bb');
    expect(fmtMoney(2000, 20)).toBe('100bb');
    expect(fmtMoney(30, 20)).toBe('1.5bb');
    expect(fmtMoney(10, 20)).toBe('0.5bb');
    expect(fmtMoney(0, 20)).toBe('0bb');
    setDisplayUnit('chips');
  });

  it('falls back to chips without a usable bb', () => {
    setDisplayUnit('bb');
    expect(fmtMoney(2000, 0)).toBe('2000');
    expect(fmtMoney(2000, undefined)).toBe('2000');
    setDisplayUnit('chips');
  });

  it('falls back to chips for non-numeric input (never blank)', () => {
    setDisplayUnit('bb');
    expect(fmtMoney('x', 20)).toBe('–');
    expect(fmtMoney(NaN, 20)).toBe('–');
    setDisplayUnit('chips');
  });

  it('rejects unknown units', () => {
    setDisplayUnit('zzz');
    expect(displayUnit.value).toBe('chips');
  });
});
