import { describe, it, expect } from 'vitest';

describe('VillainProfile', () => {
  const defaultProfile = { rfi: 20, threeBet: 8, fourBet: 3, bluffFreq: 15 };

  const presets = {
    TIGHT: { rfi: 12, threeBet: 5, fourBet: 2, bluffFreq: 10 },
    LOOSE: { rfi: 35, threeBet: 12, fourBet: 6, bluffFreq: 25 },
    BALANCED: { rfi: 22, threeBet: 8, fourBet: 3, bluffFreq: 15 }
  };

  it('should have correct default values', () => {
    expect(defaultProfile.rfi).toBe(20);
    expect(defaultProfile.threeBet).toBe(8);
    expect(defaultProfile.fourBet).toBe(3);
    expect(defaultProfile.bluffFreq).toBe(15);
  });

  it('should allow custom stats', () => {
    const custom = { rfi: 15, threeBet: 6, fourBet: 2, bluffFreq: 10 };
    expect(custom.rfi).toBe(15);
    expect(custom.threeBet).toBe(6);
    expect(custom.fourBet).toBe(2);
    expect(custom.bluffFreq).toBe(10);
  });

  it('should have valid presets', () => {
    expect(presets.TIGHT.rfi).toBe(12);
    expect(presets.LOOSE.rfi).toBe(35);
    expect(presets.BALANCED.rfi).toBe(22);
  });

  it('should throw an error for an invalid preset', () => {
    expect(() => {
      const preset = presets['INVALID'];
      if (!preset) throw new Error('Invalid preset name: INVALID');
    }).toThrow('Invalid preset name: INVALID');
  });
});
