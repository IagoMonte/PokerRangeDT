import { describe, it, expect } from 'vitest';
import { gradeHeroEv, heroEquity, HERO_EV_CONFIG } from '../../../src/engine/heroEv.js';
import { BUCKETS } from '../../../src/engine/buckets.js';

// pós-flop o herói é cobrado por conta de EV em chips, não por linha.
// Fold grátis pune (EV_check = E×pot > 0). Tolerância ε evita punir
// diferença mínima. Tom "coach": aproximação documentada (E por bucket).

const base = {
  bucket: BUCKETS.C,
  outs: 8,
  street: 'flop',
  pot: 150,
  stack: 500,
  foldProb: 0.4,
};

describe('gradeHeroEv (conta real pós-flop)', () => {
  it('fold grátis com equity pune (CHECK era +EV)', () => {
    const g = gradeHeroEv({ ...base, heroOp: 'FOLD', toCall: 0 });
    expect(g.verdict).toBe('minus');
    expect(g.bestAction).toBe('CHECK');
  });

  it('call barato com draw → plus', () => {
    const g = gradeHeroEv({ ...base, heroOp: 'CALL', toCall: 20 });
    expect(g.verdict).toBe('plus');
  });

  it('call caro com draw fraco vs station → minus com coach FOLD', () => {
    const g = gradeHeroEv({ ...base, outs: 4, foldProb: 0.1, heroOp: 'CALL', toCall: 120 });
    expect(g.verdict).toBe('minus');
    expect(g.bestAction).toBe('FOLD');
  });

  it('ar sem draw enfrentando aposta → fold é plus', () => {
    const g = gradeHeroEv({
      ...base, bucket: BUCKETS.D, outs: 0, heroOp: 'FOLD', toCall: 50,
    });
    expect(g.verdict).toBe('plus');
  });

  it('tolerância ε: diferença mínima não pune', () => {
    const g = gradeHeroEv({ ...base, heroOp: 'CALL', toCall: 20 });
    // Mesmo que o raise estimado empatasse, o call dentro de ε é plus.
    expect(g.delta).toBeLessThanOrEqual(0);
    expect(g.verdict).toBe('plus');
  });

  it('raise bem dimensionado com fold equity → plus; informa EVs', () => {
    const g = gradeHeroEv({
      ...base, bucket: BUCKETS.D, outs: 9, heroOp: 'RAISE', toCall: 0, raiseExtra: 100,
    });
    expect(g.verdict).toBe('plus');
    expect(Number.isFinite(g.chosenEV)).toBe(true);
    expect(Number.isFinite(g.bestEV)).toBe(true);
  });

  it('config expõe tolerância e sizing padrão do coach', () => {
    expect(HERO_EV_CONFIG.epsPotFrac).toBeGreaterThan(0);
    expect(HERO_EV_CONFIG.coachRaiseFrac).toBeGreaterThan(0);
  });

  it('outs zero → base pura em qualquer street (sem o +1 da regra no turn)', () => {
    expect(heroEquity({ bucket: BUCKETS.C, outs: 0, street: 'turn' })).toBe(
      heroEquity({ bucket: BUCKETS.C, outs: 0, street: 'flop' }),
    );
  });

  it('miss-value: check grátis com mão feita (A) → minus, coach RAISE', () => {
    // deixar de ganhar é perder — raise claro com A que o coach
    // estimava melhor além do blunder vira leak. Draws ficam de fora.
    const g = gradeHeroEv({ ...base, bucket: BUCKETS.A, outs: 0, heroOp: 'CHECK', toCall: 0 });
    expect(g.verdict).toBe('minus');
    expect(g.bestAction).toBe('RAISE');
  });

  it('check grátis com draw continua plus (coach não inventa agressão)', () => {
    const g = gradeHeroEv({ ...base, heroOp: 'CHECK', toCall: 0 });
    expect(g.verdict).toBe('plus');
  });

  it('miss-value desliga por config (valueBetBuckets vazio)', () => {
    const cfg = { ...HERO_EV_CONFIG, valueBetBuckets: [] };
    const g = gradeHeroEv({ ...base, bucket: BUCKETS.A, outs: 0, heroOp: 'CHECK', toCall: 0 }, cfg);
    expect(g.verdict).toBe('plus');
  });
});
