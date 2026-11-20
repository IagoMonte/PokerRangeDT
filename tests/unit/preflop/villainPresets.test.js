import { describe, it, expect } from 'vitest';
import { useVillains, VILLAIN_PRESETS } from '../../../src/composables/useVillains';

// Locks the researched preset values (PreflopTrainer archetypes + 2+2 reg
// baselines) and the "preset fills sliders, user saves" behavior.

describe('VILLAIN_PRESETS', () => {
  it('has all five presets with sane 0-1 stats', () => {
    expect(Object.keys(VILLAIN_PRESETS).sort()).toEqual(
      ['Balanced', 'Loose', 'Maniac', 'Station', 'Tight'].sort()
    );
    for (const stats of Object.values(VILLAIN_PRESETS)) {
      for (const v of Object.values(stats)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('orders aggression Tight < Balanced < Loose < Maniac', () => {
    expect(VILLAIN_PRESETS.Tight.RFI).toBeLessThan(VILLAIN_PRESETS.Balanced.RFI);
    expect(VILLAIN_PRESETS.Balanced.RFI).toBeLessThan(VILLAIN_PRESETS.Loose.RFI);
    expect(VILLAIN_PRESETS.Loose.RFI).toBeLessThan(VILLAIN_PRESETS.Maniac.RFI);
  });

  it('pins the researched values', () => {
    expect(VILLAIN_PRESETS.Tight).toEqual({ RFI: 0.12, '3BET': 0.05, '4BET': 0.02, BLUFF: 0.15, CALL: 0.05 });
    expect(VILLAIN_PRESETS.Balanced).toEqual({ RFI: 0.20, '3BET': 0.08, '4BET': 0.03, BLUFF: 0.30, CALL: 0.08 });
    expect(VILLAIN_PRESETS.Loose).toEqual({ RFI: 0.32, '3BET': 0.12, '4BET': 0.05, BLUFF: 0.50, CALL: 0.12 });
    expect(VILLAIN_PRESETS.Station).toEqual({ RFI: 0.08, '3BET': 0.03, '4BET': 0.01, BLUFF: 0.10, CALL: 0.40 });
    expect(VILLAIN_PRESETS.Maniac).toEqual({ RFI: 0.45, '3BET': 0.15, '4BET': 0.06, BLUFF: 0.60, CALL: 0.15 });
  });
});

describe('applyPreset (fills sliders, keeps the name)', () => {
  it('writes preset stats onto the villain and rejects unknown names', () => {
    const { villains, applyPreset } = useVillains();
    const before = { ...villains.value[0].stats };
    applyPreset(0, 'Maniac');
    expect(villains.value[0].stats.RFI).toBe(0.45);
    expect(villains.value[0].stats['3BET']).toBe(0.15);
    expect(villains.value[0].stats.NAME).toBe(before.NAME);
    expect(() => applyPreset(0, 'Fish')).toThrow(/unknown preset/);
    Object.assign(villains.value[0].stats, before);
  });
});
