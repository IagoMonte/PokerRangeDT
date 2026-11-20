import { describe, it, expect } from 'vitest';
import { runCoach, COACH_CONFIG } from '../../../src/engine/coach.js';
import { computeMetrics } from '../../../src/engine/profileStats.js';

// coach é sessão de insights sobre decisões, não palpite por mão —
// regra só fala com amostra mínima (2 folds em 3 mãos não é leak) e cada
// insight carrega as mãos onde aconteceu (clicáveis, recentes primeiro).

const H = (over) => ({
  date: '2026-09-20T10:00:00.000Z',
  drill: 'fulldrill 20s',
  role: 'BUTTON',
  preflop: null,
  postflop: [],
  result: null,
  ...over,
});

const pre3bFold = (i) => H({
  date: `2026-09-20T10:${String(i).padStart(2, '0')}:00.000Z`,
  preflop: { facing: '3b', token: 'FOLD', verdict: 'minus' },
  result: { heroDelta: -20, pot: 60, showdown: false, won: false },
});

describe('runCoach (insights sobre decisões)', () => {
  it('fold-3b dispara com amostra + texto + 3 mãos recentes primeiro', () => {
    const hands = Array.from({ length: 10 }, (_, i) => (i < 2
      ? H({
        date: `2026-09-20T10:${String(i).padStart(2, '0')}:00.000Z`,
        preflop: { facing: '3b', token: 'CALL', verdict: 'plus' },
        result: { heroDelta: -40, pot: 140, showdown: false, won: false },
      })
      : pre3bFold(i)));
    const insights = runCoach(computeMetrics(hands), hands);
    const hit = insights.find((x) => x.code === 'fold-3b');
    expect(hit).toBeTruthy();
    expect(hit.text).toContain('80.0%');
    expect(hit.handRefs.length).toBe(3);
    // Recentes primeiro: última mão do array abre a lista.
    expect(hit.handRefs[0].date).toBe('2026-09-20T10:09:00.000Z');
  });

  it('limp-gap por cold calls (sem limp) ainda aponta as mãos que geraram o gap', () => {
    const hands = Array.from({ length: 20 }, (_, i) => H({
      date: `2026-09-20T10:${String(i).padStart(2, '0')}:00.000Z`,
      preflop: { facing: 'open', token: i < 10 ? 'CALL' : 'FOLD', verdict: 'plus' },
      result: { heroDelta: -20, pot: 60, showdown: false, won: false },
    }));
    const hit = runCoach(computeMetrics(hands), hands).find((x) => x.code === 'limp-gap');
    expect(hit).toBeTruthy();
    expect(hit.handRefs.length).toBeGreaterThan(0);
    expect(hit.handRefs.every((h) => h.preflop.token === 'CALL')).toBe(true);
  });

  it('sem amostra mínima → silêncio (não é leak ainda)', () => {
    const hands = Array.from({ length: 5 }, (_, i) => pre3bFold(i));
    const insights = runCoach(computeMetrics(hands), hands);
    expect(insights.find((x) => x.code === 'fold-3b')).toBeUndefined();
  });

  it('miss-value dispara em checks grátis com A punidos', () => {
    const mk = (i) => H({
      date: `2026-09-20T11:${String(i).padStart(2, '0')}:00.000Z`,
      postflop: [{
        street: 'flop', op: 'CHECK', toCall: 0, bucket: 'BUCKET_A',
        outs: 0, equity: 0.85, chosenEV: 100, bestEV: 160, delta: -60, verdict: 'minus',
      }],
      result: { heroDelta: 0, pot: 120, showdown: false, won: false },
    });
    const hands = Array.from({ length: 8 }, (_, i) => mk(i));
    const hit = runCoach(computeMetrics(hands), hands).find((x) => x.code === 'miss-value');
    expect(hit).toBeTruthy();
    expect(hit.handRefs.length).toBe(3);
  });

  it('vazio honesto: sem mãos, sem métricas, sem insights', () => {
    expect(runCoach(computeMetrics([]), [])).toEqual([]);
    expect(runCoach(null, [])).toEqual([]);
    expect(runCoach(computeMetrics([]), null)).toEqual([]);
  });

  it('config calibra sem tocar fórmula', () => {
    expect(COACH_CONFIG.rules['fold-3b'].minN).toBeGreaterThan(0);
    expect(COACH_CONFIG.maxHands).toBe(3);
  });
});
