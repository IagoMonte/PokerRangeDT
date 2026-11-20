/**
 * Hero postflop EV grader (real chip math, coach tone).
 * Compares the hero's chosen op against every legal action:
 *   EV_fold = 0
 *   EV_check = E * pot            (only when toCall == 0)
 *   EV_call  = E * (pot + toCall) - toCall
 *   EV_raise = F * pot + (1 - F) * (E * potIfCalled - riskOwn)
 * (Same formulas as ev.js; heroEv owns the candidate loop + verdict.)
 *
 * Equity E is an APPROXIMATION by bucket+outs (config below) — messages
 * say "coach:" on purpose. A/B/C keep a made-hand base; C adds live outs;
 * D is pure outs (0 on the river via calculateEquity).
 * A free fold punishes by construction (EV_check = E*pot > 0 with any
 * equity). A tiny edge the other way does NOT punish (eps); only a
 * clearly losing action or a blunder (margin) is minus.
 */
import { BUCKETS } from './buckets.js';
import { calculateEquity } from './equity.js';
import { callEV, raiseEV } from './ev.js';

export const HERO_EV_CONFIG = {
  bucketBase: { [BUCKETS.A]: 0.85, [BUCKETS.B]: 0.65, [BUCKETS.C]: 0.2 },
  drawCap: { [BUCKETS.C]: 0.45 },
  epsPotFrac: 0.05, // chosen within eps of best → plus (no nit-picking)
  blunderPotFrac: 0.25, // skipped action better by this → minus
  coachRaiseFrac: 0.66, // standard size when estimating "should have raised"
  // Miss-value: free CHECK with these buckets also competes against the
  // coach raise (raise claro). Draws stay out — checking them is often
  // right (pot control, realize equity). Calibrate by editing this list.
  valueBetBuckets: [BUCKETS.A],
};

const clampF = (f) => Math.min(0.95, Math.max(0.05, Number(f) || 0));

export function heroEquity({ bucket, outs = 0, street = 'flop' }, cfg = HERO_EV_CONFIG) {
  // outs == 0 → base pura: calculateEquity(0,'turn') devolve 1 pelo "+1" da
  // regra (0*2+1), o que fazia E oscilar 20%→21%→20% sem draw algum.
  const outsEq = outs > 0 ? calculateEquity(outs, street) / 100 : 0;
  if (bucket === BUCKETS.D) return outsEq;
  if (bucket === BUCKETS.C) {
    return Math.min(cfg.drawCap?.[BUCKETS.C] ?? 0.45, (cfg.bucketBase?.[BUCKETS.C] ?? 0.2) + outsEq);
  }
  return cfg.bucketBase?.[bucket] ?? 0.1;
}

/**
 * @param {Object} p - { bucket, outs, street, pot, toCall, stack, foldProb,
 *   heroOp: 'FOLD'|'CHECK'|'CALL'|'RAISE'|'ALL-IN', raiseExtra? }
 *   raiseExtra = chips beyond the call the hero's raise invests (caller
 *   computes from absolute raise-to minus committed minus toCall).
 * @returns { verdict:'plus'|'minus', chosenEV, bestEV, bestAction, delta }
 *   delta = chosenEV - bestEV (<= 0).
 */
export function gradeHeroEv(
  { bucket, outs = 0, street = 'flop', pot = 0, toCall = 0, stack = 0,
    foldProb = 0.5, heroOp = 'FOLD', raiseExtra = null },
  cfg = HERO_EV_CONFIG,
) {
  const E = heroEquity({ bucket, outs, street }, cfg);
  const F = clampF(foldProb);
  const P = Number(pot) || 0;
  const T = Number(toCall) || 0;
  const eps = (cfg.epsPotFrac ?? 0.05) * P;
  const margin = (cfg.blunderPotFrac ?? 0.25) * P;

  const evFold = 0;
  const evPassive = T <= 0 ? E * P : callEV(E, P, T);
  const passiveLabel = T <= 0 ? 'CHECK' : 'CALL';

  // Coach raise estimate (standard size). Facing a bet it always competes;
  // free it only competes for valueBetBuckets (miss-value) — other buckets
  // keep CHECK as the free-action answer (coach never invents aggression
  // for draws/air).
  const canCoachRaise = T > 0 || (cfg.valueBetBuckets || []).includes(bucket);
  let evRaiseCoach = -Infinity;
  if (canCoachRaise) {
    const x = Math.min((cfg.coachRaiseFrac ?? 0.66) * P, Math.max(0, stack - T));
    evRaiseCoach = raiseEV({ foldProb: F, equity: E, pot: P, riskOwn: T + x, potIfCalled: P + T + 2 * x });
  }

  let chosenEV;
  if (heroOp === 'FOLD') chosenEV = evFold;
  else if (heroOp === 'CHECK') chosenEV = T <= 0 ? E * P : 0;
  else if (heroOp === 'CALL') chosenEV = callEV(E, P, T);
  else {
    // RAISE / ALL-IN: evaluate the actual size when known, else the coach size.
    const x = raiseExtra ?? Math.min((cfg.coachRaiseFrac ?? 0.66) * P, Math.max(0, stack - T));
    chosenEV = raiseEV({ foldProb: F, equity: E, pot: P, riskOwn: T + x, potIfCalled: P + T + 2 * x });
  }

  const cands = [
    { action: 'FOLD', ev: evFold },
    { action: passiveLabel, ev: evPassive },
  ];
  if (T > 0 || canCoachRaise) cands.push({ action: 'RAISE', ev: evRaiseCoach });
  // Hero's own raise always competes (so a good sizing beats the estimate).
  if ((heroOp === 'RAISE' || heroOp === 'ALL-IN') && T <= 0) {
    cands.push({ action: 'RAISE', ev: chosenEV });
  }
  let best = cands[0];
  for (const c of cands) if (c.ev > best.ev) best = c;

  const verdict = (chosenEV >= best.ev - eps || (chosenEV >= -eps && best.ev - chosenEV <= margin))
    ? 'plus'
    : 'minus';
  return { verdict, chosenEV, bestEV: best.ev, bestAction: best.action, delta: chosenEV - best.ev };
}
