/**
 * EV calculators (pure, no decisions).
 * EV aqui é SÓ um termo do decision score do vilão (score.js) — influencia,
 * nunca decide. O decisor continua sendo mapScoreToAction por thresholds.
 * Fórmulas canônicas (ThinkGTO + PokerVIP).
 */

/** Fração do pote que o call precisa ganhar p/ empatar: toCall/(pot+toCall). */
export function potOdds(pot, toCall) {
  const p = Number(pot) || 0;
  const r = Number(toCall) || 0;
  if (p + r <= 0) return 0;
  return r / (p + r);
}

/** EV do call em chips: E*(pot+toCall) - toCall. */
export function callEV(equity, pot, toCall) {
  const e = Number(equity) || 0;
  return e * ((Number(pot) || 0) + (Number(toCall) || 0)) - (Number(toCall) || 0);
}

/**
 * EV do raise com fold equity: F*pot + (1-F)*(E*potIfCalled - own).
 * @param {Object} p - { foldProb, equity, pot, riskOwn, potIfCalled }
 */
export function raiseEV({ foldProb = 0, equity = 0, pot = 0, riskOwn = 0, potIfCalled = null } = {}) {
  const f = Number(foldProb) || 0;
  const e = Number(equity) || 0;
  const settled = potIfCalled ?? pot + riskOwn;
  return f * pot + (1 - f) * (e * settled - riskOwn);
}

/** Fold mínimo p/ o blefe empatar: risk/(pot+risk). */
export function breakEvenFold(risk, pot) {
  const r = Number(risk) || 0;
  const p = Number(pot) || 0;
  if (p + r <= 0) return 0;
  return r / (p + r);
}

/**
 * Normaliza um EV em chips p/ escala 0..cap do score.
 * Só upside (clamp em 0): o downside do preço já vive no potOddsScore.
 */
export function evToScore(evChips, potPlusRisk, cap = 10) {
  const denom = Number(potPlusRisk) || 0;
  if (denom <= 0) return 0;
  const raw = (Number(evChips) || 0) / denom * 100;
  return Math.max(0, Math.min(cap, raw));
}
