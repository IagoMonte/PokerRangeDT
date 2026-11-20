/**
 * Coach Engine: sessão de insights sobre DECISÕES agregadas (nunca por mão).
 * Motor puro: métricas (computeMetrics) + registros → [{ code, title, text,
 * handRefs }]. A página apresenta; o notify do /play fica só com veredito.
 *
 * Cada regra tem limiar + amostra mínima — sem amostra o insight não existe
 * (vazio honesto, mesmo princípio do aviso <20 do profile). Calibrar = editar
 * COACH_CONFIG, nunca a fórmula.
 */

// Limiares iniciais: leaks clássicos de cash NLHE (regs 6max dobram ~50%
// vs 3-bet; micros com 60-70%+ de fold são exploráveis; agressão saudável
// ≥30% por street; WTSD vencedor 21-32%).
export const COACH_CONFIG = {
  maxHands: 3, // mãos de exemplo por insight (clicáveis, recentes primeiro)
  rules: {
    'fold-3b': { minN: 10, high: 65 },
    'call-open-line': { minN: 10, high: 40 }, // % dos vs-open fora da linha
    'miss-value': { minN: 8, high: 50 }, // % dos checks grátis c/ A punidos
    'pricey-call': { minN: 10, high: 40 }, // % dos calls contestados punidos
    'overfold-post': { minN: 10, high: 65 },
    'limp-gap': { minN: 20, limpHigh: 15, gapPp: 12 }, // limp% ou VPIP−PFR em pp
    'wtsd-wsd': { minShowdowns: 8, wtsdHigh: 32, wsdLow: 45 },
    'low-aggro': { minN: 20, low: 30 },
  },
};

const pct1 = (v) => `${Number(v || 0).toFixed(1)}%`;
const last = (hands, n) => [...hands].reverse().slice(0, n);

function refs(hands, pred, n) {
  return last(hands.filter(pred), n);
}

const RULES = [
  {
    code: 'fold-3b',
    run(m, hands, cfg) {
      const n = m.preflop.vs3b;
      if (n < cfg.minN || m.preflop.foldVs3b <= cfg.high) return null;
      return {
        title: 'Foldando demais p/ 3-bet',
        text: `Fold ${pct1(m.preflop.foldVs3b)} vs 3-bet (${m.preflop.vs3b} opp) — cada fold além da conta entrega o pote sem luta.`,
        handRefs: refs(hands, (h) => h.preflop?.facing === '3b' && h.preflop?.token === 'FOLD', cfg._max),
      };
    },
  },
  {
    code: 'call-open-line',
    run(m, hands, cfg) {
      const bad = hands.filter((h) => h.preflop?.facing === 'open' && h.preflop?.verdict === 'minus');
      const n = m.preflop.vsOpen;
      if (n < cfg.minN || (bad.length / n) * 100 <= cfg.high) return null;
      return {
        title: 'Vs open fora da linha',
        text: `${pct1((bad.length / n) * 100)} dos vs-open (${bad.length}/${n}) fora da linha pintada — ou a linha está errada ou a disciplina.`,
        handRefs: last(bad, cfg._max),
      };
    },
  },
  {
    code: 'miss-value',
    run(m, hands, cfg) {
      const free = [];
      for (const h of hands || []) {
        for (const a of h.postflop || []) {
          if (a.op === 'CHECK' && (a.toCall ?? 0) === 0 && a.bucket === 'BUCKET_A') free.push(h);
        }
      }
      const missed = free.filter((h) => (h.postflop || []).some(
        (a) => a.op === 'CHECK' && (a.toCall ?? 0) === 0 && a.bucket === 'BUCKET_A' && a.verdict === 'minus',
      ));
      if (free.length < cfg.minN || (missed.length / free.length) * 100 <= cfg.high) return null;
      return {
        title: 'Deixando valor na mesa',
        text: `${pct1((missed.length / free.length) * 100)} dos checks grátis com mão feita (${missed.length}/${free.length}) eram raise claro — deixar de ganhar é perder.`,
        handRefs: last(missed, cfg._max),
      };
    },
  },
  {
    code: 'pricey-call',
    run(m, hands, cfg) {
      const calls = [];
      for (const h of hands || []) {
        for (const a of h.postflop || []) {
          if (a.op === 'CALL' && (a.toCall ?? 0) > 0) calls.push({ h, bad: a.verdict === 'minus' });
        }
      }
      const bad = calls.filter((c) => c.bad);
      if (calls.length < cfg.minN || (bad.length / calls.length) * 100 <= cfg.high) return null;
      return {
        title: 'Calls caros recorrentes',
        text: `${pct1((bad.length / calls.length) * 100)} dos calls contestados (${bad.length}/${calls.length}) com preço ruim — equity não pagava.`,
        handRefs: last(bad.map((c) => c.h), cfg._max),
      };
    },
  },
  {
    code: 'overfold-post',
    run(m, hands, cfg) {
      const n = m.postflop.facedBet;
      if (n < cfg.minN || m.postflop.foldToBet <= cfg.high) return null;
      return {
        title: 'Overfold pós-flop',
        text: `Fold ${pct1(m.postflop.foldToBet)} diante de aposta (${n} faced) — inelástico demais, vilão betando imprime.`,
        handRefs: refs(hands, (h) => (h.postflop || []).some((a) => a.op === 'FOLD' && (a.toCall ?? 0) > 0), cfg._max),
      };
    },
  },
  {
    code: 'limp-gap',
    run(m, hands, cfg) {
      const n = m.preflop.n;
      const gap = m.preflop.vpip - m.preflop.pfr;
      if (n < cfg.minN || (m.preflop.limp <= cfg.limpHigh && gap <= cfg.gapPp)) return null;
      return {
        title: 'Passivo pré-flop',
        text: `Limp ${pct1(m.preflop.limp)} + gap VPIP–PFR de ${gap.toFixed(1)}pp — vencedores jogam raise-ou-fold.`,
        handRefs: refs(hands, (h) => h.preflop?.token === 'LIMP' || h.preflop?.token === 'CALL', cfg._max),
      };
    },
  },
  {
    code: 'wtsd-wsd',
    run(m, hands, cfg) {
      const r = m.results;
      if (r.showdowns < cfg.minShowdowns || r.wtsd <= cfg.wtsdHigh || r.wsd >= cfg.wsdLow) return null;
      return {
        title: 'Paga demais até o fim',
        text: `WTSD ${pct1(r.wtsd)} com W$SD ${pct1(r.wsd)} (${r.showdowns} SD) — chega muito com range fraco e perde no fim.`,
        handRefs: refs(hands, (h) => h.result?.showdown && !h.result?.won, cfg._max),
      };
    },
  },
  {
    code: 'low-aggro',
    run(m, hands, cfg) {
      const n = m.postflop.n;
      if (n < cfg.minN || m.postflop.aggFreq >= cfg.low) return null;
      return {
        title: 'Agressão pós-flop baixa',
        text: `Agg ${pct1(m.postflop.aggFreq)} em ${n} decisões — abaixo de 30% o valor some em check/call.`,
        handRefs: refs(hands, (h) => (h.postflop || []).length > 0
          && !(h.postflop || []).some((a) => a.op === 'RAISE' || a.op === 'ALL-IN'), cfg._max),
      };
    },
  },
];

/**
 * @param {Object} metrics - saída de computeMetrics (já filtrado ou total)
 * @param {Array} hands - registros usados nas métricas (p/ as mãos-exemplo)
 * @param {Object} cfg - COACH_CONFIG
 * @returns {Array} [{ code, title, text, handRefs[] }] (vazio = sem insights)
 */
export function runCoach(metrics, hands = [], cfg = COACH_CONFIG) {
  if (!metrics || typeof metrics !== 'object') return [];
  const out = [];
  for (const r of RULES) {
    try {
      const ruleCfg = { ...(cfg.rules?.[r.code] || {}), _max: cfg.maxHands ?? 3 };
      const hit = r.run(metrics, hands || [], ruleCfg);
      if (hit) out.push({ code: r.code, ...hit });
    } catch {
      // Regra quebrou → pula a regra, nunca a sessão (mesma regra do grade).
    }
  }
  return out;
}
