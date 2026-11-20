import { describe, it, expect } from 'vitest';
import { resolveDrillMode, Drills } from '../../../src/composables/useDrillSettings.js';

// os modos únicos são só um roteador de flags — pré-only encerra
// seco no preflop (refund), pós-only pula direto p/ o flop, full faz os
// dois. Se o roteador inverter, o drill treina a rua errada sem ninguém
// perceber (a mão completa do mesmo jeito).
describe('resolveDrillMode (modos únicos)', () => {
  it('tabela-verdade das flags', () => {
    expect(resolveDrillMode({ preflop: true, posflop: false })).toBe('pre-only');
    expect(resolveDrillMode({ preflop: false, posflop: true })).toBe('post-only');
    expect(resolveDrillMode({ preflop: true, posflop: true })).toBe('full');
    expect(resolveDrillMode({ preflop: false, posflop: false })).toBe('invalid');
    expect(resolveDrillMode(null)).toBe('invalid');
  });

  it('drills cadastrados cobrem os 3 modos', () => {
    expect(resolveDrillMode(Drills['10s preflop'])).toBe('pre-only');
    expect(resolveDrillMode(Drills['postflop 10s'])).toBe('post-only');
    expect(resolveDrillMode(Drills['fulldrill 20s'])).toBe('full');
  });
});
