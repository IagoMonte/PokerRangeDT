/**
 * Decision Score Engine (postflop brain core).
 * Score 0-100 → RAISE / CALL / FOLD. Every number lives in SCORE_CONFIG so
 * the engine is tuned without touching the formula; per-call `overrides`
 * merge over the config for experiments.
 *
 * Inputs per decision (one acting villain, their own hand only):
 *   bucket (from bucketForHand: class + outs), pot, risk (= toCall),
 *   spr (= stack/pot), villainProfile (OWN stats), boardTexture,
 *   villainFoldProb (explicit) or derived from profile CALL,
 *   outs + street (equity via rule-of-4 / 2+1).
 */
import { BUCKETS } from './buckets.js';
import { calculateEquity } from './equity.js';
import { callEV, evToScore } from './ev.js';

export const SCORE_CONFIG = {
  bucketScores: {
    [BUCKETS.A]: 90, // Monster
    [BUCKETS.B]: 60, // Strong
    [BUCKETS.C]: 30, // Medium / draws
    [BUCKETS.D]: 10, // Air
  },
  // Base formula weights (kept stable: old readings reproduce exactly).
  weights: { base: 0.6, potOdds: 0.2, foldEquity: 0.15, spr: 0.05, profile: 0.05 },
  foldEquity: { cap: 50 },
  thresholds: { RAISE: 70, CALL: 40, FOLD: 0 },
  sprRules: [
    { maxSpr: 3, bucket: BUCKETS.B, bonus: 15 }, // committed → strong hands go
    { minSpr: 10, bucket: BUCKETS.A, bonus: 10 }, // deep → monsters want a pot
  ],
  profileRules: { looseRfi: 30, tightRfi: 15, looseBonus: 10, tightBonus: 5 },
  // Derived fold prob when the caller passes none: Stations (high CALL)
  // rarely fold, Nits fold everything.
  foldProb: { min: 0.05, max: 0.95 },
  // Draw equity: additive bonus, capped — strong draws pay to continue,
  // never single-handedly turn air into a raise.
  equityBonus: { weight: 0.25, cap: 12 },
  // Bluff: the villain's own BLUFF% only pushes weak buckets WITH live outs
  // (minOuts). Deliberately conservative: capped, small, needs a draw.
  bluff: { minOuts: 4, weight: 0.15, cap: 8 },
  // EV influence (NOT a decider): normalized call-EV of the live draw adds
  // a capped bonus — cheap draws outscore the same draw facing a big bet.
  // Downside stays at 0: price punishment already lives in potOddsScore.
  // Gated on risk > 0: a free call has no call-EV.
  evCall: { cap: 10 },
  // Wet boards hit calling ranges harder → shave fold equity a little.
  textureFoldMod: { Wet: 0.9, Dry: 1.0 },
};

// Back-compat alias (tests + older callers import this name).
export const ACTION_THRESHOLDS = SCORE_CONFIG.thresholds;

function mergeConfig(overrides = {}) {
  const out = { ...SCORE_CONFIG, ...overrides };
  for (const k of Object.keys(SCORE_CONFIG)) {
    if (
      SCORE_CONFIG[k] && typeof SCORE_CONFIG[k] === 'object' && !Array.isArray(SCORE_CONFIG[k]) &&
      overrides[k] && typeof overrides[k] === 'object' && !Array.isArray(overrides[k])
    ) {
      out[k] = { ...SCORE_CONFIG[k], ...overrides[k] };
    }
  }
  return out;
}

// Profiles arrive in two shapes: engine stats (RFI/CALL/BLUFF in 0-1) and
// test fixtures (rfi/bluffFreq in 0-100). Normalize to percent + 0-1.
function normProfile(p = {}) {
  const raw = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  let rfi = raw(p.rfi ?? p.RFI, 20);
  if (rfi > 0 && rfi <= 1) rfi *= 100;
  let call = raw(p.CALL ?? p.call, 0);
  if (call > 1) call /= 100;
  let bluff = raw(p.BLUFF ?? p.bluff ?? p.bluffFreq, 0);
  if (bluff > 1) bluff /= 100;
  return { rfi, call, bluff };
}

export function resolveFoldProb(villainProfile, explicit, cfg = SCORE_CONFIG) {
  if (Number.isFinite(Number(explicit))) return Number(explicit);
  const { call } = normProfile(villainProfile);
  const { min, max } = cfg.foldProb || SCORE_CONFIG.foldProb;
  return Math.min(max, Math.max(min, 1 - call));
}

/**
 * @param {Object} params - { bucket, pot, risk, spr, villainProfile,
 *   boardTexture, villainFoldProb?, outs?, street? }
 * @param {Object} overrides - partial SCORE_CONFIG for fine-tuning
 * @returns {number} 0-100
 */
export function calculateDecisionScore(
  {
    bucket,
    pot,
    risk,
    spr,
    villainProfile,
    boardTexture,
    villainFoldProb,
    outs = 0,
    street = 'flop',
  },
  overrides = {},
) {
  const cfg = mergeConfig(overrides);
  const { bucketScores, weights, sprRules, profileRules } = cfg;
  const { rfi, bluff } = normProfile(villainProfile);
  const fp = resolveFoldProb(villainProfile, villainFoldProb, cfg);

  // 1. Base: what the hand (+draws, via the bucket) is worth.
  const baseScore = bucketScores[bucket] ?? bucketScores[BUCKETS.D];

  // 2. Pot odds: cheap calls score higher.
  const potOddsScore = (pot / (pot + risk)) * 100;

  // 3. SPR: commitment shifts value between strong hands and monsters.
  let sprAdjustment = 0;
  for (const rule of sprRules || []) {
    if (rule.bucket !== bucket) continue;
    if (rule.maxSpr !== undefined && spr < rule.maxSpr) sprAdjustment += rule.bonus;
    if (rule.minSpr !== undefined && spr > rule.minSpr) sprAdjustment += rule.bonus;
  }

  // 4. Profile: loose villains pay our value; tights let our air breathe.
  let profileAdjustment = 0;
  if (rfi > (profileRules?.looseRfi ?? 30) && (bucket === BUCKETS.A || bucket === BUCKETS.B)) {
    profileAdjustment = profileRules?.looseBonus ?? 10;
  } else if (rfi < (profileRules?.tightRfi ?? 15) && bucket === BUCKETS.D) {
    profileAdjustment = profileRules?.tightBonus ?? 5;
  }

  // 5. Fold equity: EV_bluff = Fp*pot - (1-Fp)*risk, normalized and capped.
  // The cap sits above routine edges so real fold-prob differences (Nit vs
  // Station) still move the score instead of saturating.
  const foldEquityEV = fp * pot - (1 - fp) * risk;
  const texMod = cfg.textureFoldMod?.[boardTexture] ?? 1;
  const feCap = cfg.foldEquity?.cap ?? 50;
  const foldEquityScore = Math.max(0, Math.min(feCap, (foldEquityEV / (pot + risk)) * 100)) * texMod;

  const base =
    baseScore * weights.base +
    potOddsScore * weights.potOdds +
    foldEquityScore * weights.foldEquity +
    sprAdjustment * weights.spr +
    profileAdjustment * weights.profile;

  // 6. Draw equity bonus: live outs are worth something right now.
  const eb = cfg.equityBonus || {};
  const equityBonus = outs > 0
    ? Math.min(eb.cap ?? 12, calculateEquity(outs, street) * (eb.weight ?? 0.25))
    : 0;

  // 7. Bluff bonus: own BLUFF% pushes weak-with-draw hands toward aggression.
  // Capped and gated — air without outs never bluffs on score alone.
  const bl = cfg.bluff || {};
  const bluffBonus =
    (bucket === BUCKETS.D || bucket === BUCKETS.C) && outs >= (bl.minOuts ?? 4)
      ? Math.min(bl.cap ?? 8, Math.max(0, Math.min(1, bluff)) * 100 * (bl.weight ?? 0.15))
      : 0;

  // 8. EV influence: call-EV of the live draw, normalized to 0..cap.
  // Same draw, cheap price → bonus; same draw, steep price → 0.
  let evBonus = 0;
  if (risk > 0 && outs > 0) {
    const eq = calculateEquity(outs, street) / 100;
    evBonus = evToScore(callEV(eq, pot, risk), pot + risk, cfg.evCall?.cap ?? 10);
  }

  return Math.max(0, Math.min(100, base + equityBonus + bluffBonus + evBonus));
}

/**
 * @param {number} score
 * @param {Object} thresholds - override, default SCORE_CONFIG.thresholds
 * @returns {'RAISE' | 'CALL' | 'FOLD'}
 */
export function mapScoreToAction(score, thresholds = SCORE_CONFIG.thresholds) {
  if (score >= thresholds.RAISE) return 'RAISE';
  if (score >= thresholds.CALL) return 'CALL';
  return 'FOLD';
}
