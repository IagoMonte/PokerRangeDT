import { describe, it, expect } from 'vitest';
import {
  computeStreak,
  sessionVerdicts,
  comboFromVerdicts,
  plusEvOf,
  personalBests,
  sessionSummary,
  newRecords,
  dayKey,
} from '../../../src/engine/engagement.js';

// engajamento = decisão + repetição, nunca carta nem login.
// Streak perdoa 1 furo (ansiedade mata hábito); combo reseta no minus
// (é disciplina, não sorte); recorde supera o PASSADO. Sem amostra,
// nulls honestos — zero fantasiado ensinaria leitura errada.
const H = (date, verdicts = [], delta = 0) => ({
  date,
  preflop: verdicts[0] ? { verdict: verdicts[0] } : null,
  postflop: verdicts.slice(1).map((v) => ({ verdict: v })),
  result: { heroDelta: delta },
});

describe('engagement calculations', () => {
  it('streak conta dias corridos, perdoa 1 furo, quebra no 2º', () => {
    expect(computeStreak([], '2026-09-24').streak).toBe(0);
    const run = (dates) => computeStreak(dates.map((d) => ({ date: d })), '2026-09-24').streak;
    expect(run(['2026-09-24', '2026-09-23', '2026-09-22'])).toBe(3);
    expect(run(['2026-09-24', '2026-09-22'])).toBe(2); // 1 furo perdoado
    expect(run(['2026-09-24', '2026-09-21'])).toBe(1); // 2 furos quebram
    expect(run(['2026-09-23'])).toBe(1); // ontem vale, hoje pendente
    expect(run(['2026-09-20']).streak ?? run(['2026-09-20'])).toBe(0);
  });

  it('combo: plus encadeia, minus reseta; melhor da sessão', () => {
    expect(comboFromVerdicts(['plus', 'plus', 'minus', 'plus'])).toEqual({ combo: 1, best: 2 });
    expect(comboFromVerdicts([])).toEqual({ combo: 0, best: 0 });
  });

  it('vereditos da sessão em ordem (pré + pós), fora dela fora', () => {
    const hands = [
      H('2026-09-20T10:00:00', ['plus', 'minus']),
      H('2026-09-24T10:00:00', ['plus', 'plus']),
    ];
    expect(sessionVerdicts(hands, '2026-09-24T00:00:00')).toEqual(['plus', 'plus']);
    expect(plusEvOf(['plus', 'plus', 'minus'])).toBeCloseTo(66.67, 1);
    expect(plusEvOf([])).toBeNull();
  });

  it('bests: predict, dia, marcos; vazio honesto', () => {
    expect(personalBests([], [])).toEqual({ total: 0, bestPredict: null, bestDay: null, nextMilestone: 100 });
    const hands = [H('2026-09-24T10:00:00', [], 50), H('2026-09-24T11:00:00', [], -10)];
    const b = personalBests(hands, [{ score: 80 }, { score: 95 }]);
    expect(b.total).toBe(2);
    expect(b.bestPredict).toBe(95);
    expect(b.bestDay).toEqual({ day: '2026-09-24', pnl: 40 });
    expect(b.nextMilestone).toBe(100);
  });

  it('resumo compara sessão vs média; sem sessão = null', () => {
    expect(sessionSummary([], [], '2026-09-24T00:00:00')).toBeNull();
    const hands = [
      H('2026-09-20T10:00:00', ['plus'], 10),
      H('2026-09-24T10:00:00', ['plus', 'plus'], 30),
    ];
    const s = sessionSummary(hands, [], '2026-09-24T00:00:00');
    expect(s.hands).toBe(1);
    expect(s.pnl).toBe(30);
    expect(s.plusEv).toBe(100);
    expect(s.plusEvAvg).toBeCloseTo(100, 1);
    expect(s.maxCombo).toBe(2);
  });

  it('recorde supera o passado, não a si mesmo', () => {
    const hands = [H('2026-09-20T10:00:00', [], 10)];
    const preds = [{ score: 80, timestamp: '2026-09-20T10:00:00' }];
    expect(newRecords(hands, preds, '2026-09-24T00:00:00')).toEqual({ pnlDay: false, predict: false });
    const hands2 = [...hands, H('2026-09-24T10:00:00', [], 50)];
    const preds2 = [...preds, { score: 90, timestamp: '2026-09-24T10:00:00' }];
    expect(newRecords(hands2, preds2, '2026-09-24T00:00:00')).toEqual({ pnlDay: true, predict: true });
  });

  it('perder dinheiro nunca é recorde de PnL (1ª sessão no vermelho)', () => {
    // sem histórico anterior, qualquer PnL batia "recorde" — o resumo do
    // bust mostrava ★ Novo recorde de PnL! com -100bb.
    const hands = [H('2026-09-24T10:00:00', [], -100)];
    expect(newRecords(hands, [], '2026-09-24T00:00:00').pnlDay).toBe(false);
  });

  it('dayKey canônico', () => {
    expect(dayKey('2026-09-24T23:59:59')).toBe('2026-09-24');
    expect(dayKey('lixo')).toBeNull();
  });
});
