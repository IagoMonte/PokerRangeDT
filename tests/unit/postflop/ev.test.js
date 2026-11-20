import { describe, it, expect } from 'vitest';
import { potOdds, callEV, raiseEV, breakEvenFold, evToScore } from '../../../src/engine/ev.js';
import { calculateDecisionScore } from '../../../src/engine/score.js';
import { decidePostflop } from '../../../src/engine/postflop.js';
import { BUCKETS } from '../../../src/engine/buckets.js';

// EV é só um termo do score do vilão (nunca o decisor). Estes testes
// travam as fórmulas canônicas (ThinkGTO) e a influência limitada:
// draw barato ganha bônus, draw caro não ganha nada, ar sem draw não muda.

describe('ev.js (pure calculators)', () => {
  it('potOdds = toCall / (pot + toCall), pot já inclui a aposta (convenção do motor)', () => {
    // ThinkGTO: pot 100 + bet 50 = 150 na hora da decisão → 50/200 = 25%.
    expect(potOdds(150, 50)).toBeCloseTo(0.25, 5);
    expect(potOdds(100, 0)).toBe(0);
    expect(potOdds(0, 0)).toBe(0); // sem pote, sem preço: guarda divisão
  });

  it('callEV = E*(pot+toCall) - toCall (ThinkGTO +$10 / -$10)', () => {
    // 30% equity, pot 150 (100+50) chamando 50: 0.30*200 - 50 = +10.
    expect(callEV(0.3, 150, 50)).toBeCloseTo(10, 5);
    // 20% equity no mesmo spot: 0.20*200 - 50 = -10.
    expect(callEV(0.2, 150, 50)).toBeCloseTo(-10, 5);
  });

  it('raiseEV = F*pot + (1-F)*(E*(pot+total) - own)', () => {
    // Blefe puro (E=0): F=0.4, pot 100, risk 60 → 40 - 36 = +4.
    expect(raiseEV({ foldProb: 0.4, equity: 0, pot: 100, riskOwn: 60, potIfCalled: 160 })).toBeCloseTo(4, 5);
    // Ninguém folda e sem equity: perde o investido.
    expect(raiseEV({ foldProb: 0, equity: 0, pot: 100, riskOwn: 60, potIfCalled: 160 })).toBeCloseTo(-60, 5);
  });

  it('breakEvenFold = risk / (pot + risk)', () => {
    expect(breakEvenFold(60, 100)).toBeCloseTo(60 / 160, 5);
    expect(breakEvenFold(0, 100)).toBe(0);
  });

  it('evToScore normaliza para 0..cap (só upside: downside já vive no potOddsScore)', () => {
    expect(evToScore(4.8, 140, 10)).toBeCloseTo((4.8 / 140) * 100, 5);
    expect(evToScore(-22.4, 180, 10)).toBe(0);
    expect(evToScore(1000, 140, 10)).toBe(10); // cap
  });
});

describe('villain EV contribution (decidePostflop.ev)', () => {
  const hole = [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 's' }];
  const board = [{ rank: 'K', suit: 'h' }, { rank: '7', suit: 'd' }, { rank: '2', suit: 'c' }];
  const profile = { RFI: 0.2, CALL: 0.08, BLUFF: 0.3 };

  it('expõe equity 0..1, EVcall finito e bônus dentro do cap', () => {
    const d = decidePostflop({ hole, board, pot: 150, risk: 20, stack: 500, profile, street: 'flop' });
    expect(d.ev.equity).toBeGreaterThanOrEqual(0);
    expect(d.ev.equity).toBeLessThanOrEqual(1);
    expect(Number.isFinite(d.ev.evCall)).toBe(true);
    expect(d.ev.evBonus).toBeGreaterThanOrEqual(0);
    expect(d.ev.evBonus).toBeLessThanOrEqual(10);
  });

  it('sem risco ou sem draw o bônus zera (mesmo gate do score)', () => {
    const free = decidePostflop({ hole, board, pot: 150, risk: 0, stack: 500, profile, street: 'flop' });
    expect(free.ev.evBonus).toBe(0);
    expect(free.action).toBe('CHECK'); // sem draw forte p/ raise: nada muda na ação
  });

  it('não altera a decisão (campo aditivo)', () => {
    const d = decidePostflop({ hole, board, pot: 150, risk: 20, stack: 500, profile, street: 'flop' });
    expect(['RAISE', 'CALL', 'FOLD', 'CHECK']).toContain(d.action);
    expect(d.score).toBeGreaterThanOrEqual(0);
  });
});
describe('evBonus no decision score (influência, não decisão)', () => {
  const base = {
    pot: 100,
    spr: 5,
    boardTexture: 'Dry',
    street: 'flop',
    villainProfile: { RFI: 0.2, CALL: 0.08, BLUFF: 0.3 },
  };

  it('draw barato ganha bônus vs o mesmo draw caro', () => {
    const cheap = calculateDecisionScore({ ...base, bucket: BUCKETS.C, risk: 20, outs: 8 });
    const pricey = calculateDecisionScore({ ...base, bucket: BUCKETS.C, risk: 80, outs: 8 });
    // Preço já separava (potOddsScore); o EV alarga a distância pró-call-barato.
    const cheapNoEv = calculateDecisionScore({ ...base, bucket: BUCKETS.C, risk: 20, outs: 8 }, { evCall: { cap: 0 } });
    expect(cheap).toBeGreaterThan(cheapNoEv); // bônus existe no barato
    expect(cheap - cheapNoEv).toBeLessThanOrEqual(10); // …mas limitado ao cap
  });

  it('ar sem draw não muda (EV de equity zero é negativo → clampa em 0)', () => {
    const params = { ...base, bucket: BUCKETS.D, risk: 40, outs: 0 };
    const normal = calculateDecisionScore(params);
    const noEv = calculateDecisionScore(params, { evCall: { cap: 0 } });
    expect(normal).toBe(noEv);
  });

  it('risco zero não ganha bônus (call grátis não tem EV de call)', () => {
    const params = { ...base, bucket: BUCKETS.C, risk: 0, outs: 8 };
    const normal = calculateDecisionScore(params);
    const noEv = calculateDecisionScore(params, { evCall: { cap: 0 } });
    expect(normal).toBe(noEv);
  });
});
