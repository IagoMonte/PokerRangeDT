// decisão boa + repetição, nunca resultado nem login vazio. Puro (sem
// Vue/storage): entra hands[] + predicts.history, sai números p/ a UI.
// Sem amostra = vazio honesto (nulls), nunca zero fantasiado.

export const ENGAGEMENT_CONFIG = {
  milestones: [100, 500, 1000],
};

export function dayKey(d) {
  const t = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function shiftDay(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(y, m - 1, d);
  t.setDate(t.getDate() + delta);
  return dayKey(t);
}

// Streak diário com tolerância de 1 dia (não gerar ansiedade): volta de
// hoje/ontem; UM único furo de 1 dia é perdoado, o segundo quebra.
export function computeStreak(hands, now = new Date()) {
  const days = new Set();
  for (const h of hands || []) {
    const k = h?.date ? dayKey(h.date) : null;
    if (k) days.add(k);
  }
  if (days.size === 0) return { streak: 0, today: false };
  let cursor = dayKey(now);
  if (!days.has(cursor)) cursor = shiftDay(cursor, -1);
  if (!days.has(cursor)) return { streak: 0, today: false };
  const today = days.has(dayKey(now));
  let streak = 0;
  let skipped = false;
  for (;;) {
    if (days.has(cursor)) {
      streak++;
    } else if (!skipped) {
      skipped = true; // furo único perdoado (não conta dia)
    } else {
      break;
    }
    cursor = shiftDay(cursor, -1);
  }
  return { streak, today };
}

// Vereditos ordenados da sessão (mãos com date ≥ since): pré (1ª decisão)
// + pós na ordem jogada. Combo = plus seguidos no rabo; minus reseta.
export function sessionVerdicts(hands, sinceISO) {
  const out = [];
  const since = sinceISO ? new Date(sinceISO).getTime() : 0;
  for (const h of hands || []) {
    if (!h || !h.date || new Date(h.date).getTime() < since) continue;
    if (h.preflop?.verdict) out.push(h.preflop.verdict);
    for (const a of h.postflop || []) {
      if (a?.verdict) out.push(a.verdict);
    }
  }
  return out;
}

export function comboFromVerdicts(verdicts) {
  let combo = 0;
  let best = 0;
  for (const v of verdicts || []) {
    if (v === 'plus') {
      combo++;
      if (combo > best) best = combo;
    } else {
      combo = 0;
    }
  }
  return { combo, best };
}

export function plusEvOf(verdicts) {
  const n = (verdicts || []).length;
  if (n === 0) return null;
  return (verdicts.filter((v) => v === 'plus').length / n) * 100;
}

function sumDelta(hands) {
  return (hands || []).reduce((s, h) => s + (Number(h?.result?.heroDelta) || 0), 0);
}

// Recordes pessoais: melhor predict, melhor dia (PnL), marcos de mãos.
export function personalBests(hands, predictsHistory) {
  const total = (hands || []).length;
  let bestPredict = null;
  for (const p of predictsHistory || []) {
    if (Number.isFinite(p?.score) && (bestPredict === null || p.score > bestPredict)) {
      bestPredict = p.score;
    }
  }
  const byDay = new Map();
  for (const h of hands || []) {
    const k = h?.date ? dayKey(h.date) : null;
    if (!k) continue;
    byDay.set(k, (byDay.get(k) || 0) + (Number(h?.result?.heroDelta) || 0));
  }
  let bestDay = null;
  for (const [day, pnl] of byDay) {
    if (!bestDay || pnl > bestDay.pnl) bestDay = { day, pnl };
  }
  const nextMilestone = ENGAGEMENT_CONFIG.milestones.find((m) => m > total) ?? null;
  return { total, bestPredict, bestDay, nextMilestone };
}

function avg(nums) {
  if (!nums || nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// Resumo de sessão comparativo: sessão (desde sinceISO) vs médias
// all-time (PnL/mão, +EV%, predict). Sem sessão = nulls honestos.
export function sessionSummary(hands, predictsHistory, sinceISO) {
  const since = sinceISO ? new Date(sinceISO).getTime() : 0;
  const sess = (hands || []).filter((h) => h?.date && new Date(h.date).getTime() >= since);
  if (sess.length === 0) return null;
  const allV = sessionVerdicts(hands, null);
  const sessV = sessionVerdicts(hands, sinceISO);
  const sessPred = (predictsHistory || []).filter(
    (p) => p?.timestamp && new Date(p.timestamp).getTime() >= since && Number.isFinite(p.score)
  );
  const allPred = (predictsHistory || []).filter((p) => Number.isFinite(p?.score));
  return {
    hands: sess.length,
    pnl: sumDelta(sess),
    pnlPerHandAvg: avg((hands || []).map((h) => Number(h?.result?.heroDelta) || 0)),
    plusEv: plusEvOf(sessV),
    plusEvAvg: plusEvOf(allV),
    predictAvg: avg(sessPred.map((p) => p.score)),
    predictAvgAll: avg(allPred.map((p) => p.score)),
    maxCombo: comboFromVerdicts(sessV).best,
  };
}

// Recordes batidos nesta sessão vs o resto do histórico (exclui a sessão:
// recorde tem que superar o passado, não a si mesmo).
export function newRecords(hands, predictsHistory, sinceISO) {
  const since = sinceISO ? new Date(sinceISO).getTime() : 0;
  const prior = (hands || []).filter((h) => !(h?.date && new Date(h.date).getTime() >= since));
  const sess = (hands || []).filter((h) => h?.date && new Date(h.date).getTime() >= since);
  const out = { pnlDay: false, predict: false };
  if (sess.length === 0) return out;
  const priorBest = personalBests(prior, (predictsHistory || []).filter(
    (p) => !(p?.timestamp && new Date(p.timestamp).getTime() >= since)
  ));
  const sessBest = personalBests(sess, (predictsHistory || []).filter(
    (p) => p?.timestamp && new Date(p.timestamp).getTime() >= since
  ));
  if (sessBest.bestPredict !== null && (priorBest.bestPredict === null || sessBest.bestPredict > priorBest.bestPredict)) {
    out.predict = true;
  }
  const sessDayPnl = sumDelta(sess);
  if (sess.length > 0 && sessDayPnl > 0 && (priorBest.bestDay === null || sessDayPnl > priorBest.bestDay.pnl)) {
    out.pnlDay = true;
  }
  return out;
}
