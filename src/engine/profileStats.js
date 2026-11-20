/**
 * Profile stats engine (dashboard /profile): pure calculators over hero hand
 * records. The page presents, the drill loop records — this file owns every
 * denominator so VPIP/RFI/3B/4B reproduce exactly in tests.
 *
 * Hand record (v1):
 *   { date, drill, role,
 *     preflop: { facing, token, verdict } | null,
 *     postflop: [{ street, op, toCall, bucket, outs, equity,
 *                  chosenEV, bestEV, delta, verdict }],
 *     result: { heroDelta, pot, showdown, won } | null }
 *
 * Conventions: VPIP = voluntary action only (CHECK/FOLD never count —
 * posted blinds are not actions at all). Percentages are 0-100 numbers;
 * empty denominators yield 0 (never NaN). ALL-IN merges into raise for
 * street distribution but is also counted separately (variance signal).
 */
export const PREFLOP_VOLUNTARY = ['OR', 'LIMP', 'CALL', '3B', '4B', 'ALL-IN'];
export const PREFLOP_RAISE = ['OR', '3B', '4B', 'ALL-IN'];
export const POSTFLOP_OPS = ['CHECK', 'CALL', 'FOLD', 'RAISE', 'ALL-IN'];
export const STREETS = ['flop', 'turn', 'river'];
export const BUCKETS = ['BUCKET_A', 'BUCKET_B', 'BUCKET_C', 'BUCKET_D'];

const pct = (n, d) => (d > 0 ? (n / d) * 100 : 0);
const avg = (xs) => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function filterHands(hands = [], { day, roles, drill } = {}) {
  return (hands || []).filter((h) => {
    if (day && typeof h.date === 'string' && h.date.slice(0, 10) !== day) return false;
    if (Array.isArray(roles) && roles.length > 0 && !roles.includes(h.role)) return false;
    if (drill && drill !== 'all' && h.drill !== drill) return false;
    return true;
  });
}

function blankPreflop() {
  return {
    n: 0, vpip: 0, pfr: 0, rfi: 0, rfiOpp: 0,
    threeB: 0, vsOpen: 0, fourB: 0, vs3b: 0,
    foldVsOpen: 0, foldVs3b: 0, foldVs4b: 0, vs4b: 0,
    limp: 0, callVsOpen: 0, allin: 0, adherence: 0,
  };
}

function blankStreet() {
  return { n: 0, check: 0, call: 0, fold: 0, raise: 0, plusEv: 0, deltaAvg: 0, _deltaSum: 0, _plus: 0 };
}

function blankPostflop() {
  return {
    n: 0, check: 0, call: 0, fold: 0, raise: 0, allin: 0,
    aggFreq: 0, foldToBet: 0, facedBet: 0, plusEv: 0,
    contestedPlusEv: 0, contestedN: 0,
    evChosenAvg: 0, evBestAvg: 0, deltaAvg: 0,
    equityAvg: 0, outsAvg: 0,
    buckets: { BUCKET_A: 0, BUCKET_B: 0, BUCKET_C: 0, BUCKET_D: 0 },
    byStreet: { flop: blankStreet(), turn: blankStreet(), river: blankStreet() },
  };
}

export function computeMetrics(hands = []) {
  const list = hands || [];
  const pre = blankPreflop();
  const post = blankPostflop();
  const results = {
    pnl: 0, wtsd: 0, wtsdN: 0, wsd: 0, showdowns: 0,
    maxWon: 0, maxLost: 0, sdPnl: 0, nonSdPnl: 0, _wonSd: 0,
  };

  let vpipN = 0, pfrN = 0, rfiN = 0, b3N = 0, b4N = 0;
  let fOpen = 0, f3b = 0, f4b = 0, limpN = 0, callOpenN = 0, preAllinN = 0, adhN = 0;
  let checkN = 0, callN = 0, foldN = 0, raiseN = 0, postAllinN = 0;
  let facedBet = 0, foldBet = 0, plusN = 0;
  let contestedN = 0, contestedPlus = 0;
  const evC = [], evB = [], deltas = [], eqs = [], outs = [];

  for (const h of list) {
    const p = h.preflop;
    if (p) {
      pre.n++;
      const t = p.token;
      if (PREFLOP_VOLUNTARY.includes(t)) vpipN++;
      if (PREFLOP_RAISE.includes(t)) pfrN++;
      if (p.facing === 'none') {
        pre.rfiOpp++;
        if (t === 'OR' || t === 'ALL-IN') rfiN++;
      }
      if (p.facing === 'open') {
        pre.vsOpen++;
        if (t === '3B') b3N++;
        if (t === 'FOLD') fOpen++;
        if (t === 'CALL') callOpenN++;
      }
      if (p.facing === '3b') {
        pre.vs3b++;
        if (t === '4B') b4N++;
        if (t === 'FOLD') f3b++;
      }
      if (p.facing === '4b') {
        pre.vs4b++;
        if (t === 'FOLD') f4b++;
      }
      if (t === 'LIMP') limpN++;
      if (t === 'ALL-IN') preAllinN++;
      if (p.verdict === 'plus') adhN++;
    }
    for (const a of h.postflop || []) {
      post.n++;
      const op = a.op === 'ALL-IN' ? 'RAISE' : a.op;
      if (op === 'CHECK') checkN++;
      else if (op === 'CALL') callN++;
      else if (op === 'FOLD') foldN++;
      else if (op === 'RAISE') raiseN++;
      if (a.op === 'ALL-IN') postAllinN++;
      if ((a.toCall ?? 0) > 0) {
        facedBet++;
        contestedN++;
        if (a.verdict === 'plus') contestedPlus++;
        if (a.op === 'FOLD') foldBet++;
      }
      if (a.verdict === 'plus') plusN++;
      if (Number.isFinite(a.chosenEV)) evC.push(a.chosenEV);
      if (Number.isFinite(a.bestEV)) evB.push(a.bestEV);
      if (Number.isFinite(a.delta)) deltas.push(a.delta);
      if (Number.isFinite(a.equity)) eqs.push(a.equity);
      if (Number.isFinite(a.outs)) outs.push(a.outs);
      if (a.bucket && post.buckets[a.bucket] !== undefined) post.buckets[a.bucket]++;
      const st = post.byStreet[a.street];
      if (st) {
        st.n++;
        if (op === 'CHECK') st.check++;
        else if (op === 'CALL') st.call++;
        else if (op === 'FOLD') st.fold++;
        else if (op === 'RAISE') st.raise++;
        if (a.verdict === 'plus') st._plus++;
        if (Number.isFinite(a.delta)) st._deltaSum += a.delta;
      }
    }
    const r = h.result;
    if (r) {
      const d = Number(r.heroDelta) || 0;
      results.pnl += d;
      if (d > 0) results.maxWon = Math.max(results.maxWon, d);
      if (d < 0) results.maxLost = Math.min(results.maxLost, d);
      if (r.showdown) {
        results.showdowns++;
        results.sdPnl += d;
        if (r.won) results._wonSd++;
      } else {
        results.nonSdPnl += d;
      }
    }
  }

  pre.vpip = pct(vpipN, pre.n);
  pre.pfr = pct(pfrN, pre.n);
  pre.rfi = pct(rfiN, pre.rfiOpp);
  pre.threeB = pct(b3N, pre.vsOpen);
  pre.fourB = pct(b4N, pre.vs3b);
  pre.foldVsOpen = pct(fOpen, pre.vsOpen);
  pre.foldVs3b = pct(f3b, pre.vs3b);
  pre.foldVs4b = pct(f4b, pre.vs4b);
  pre.limp = pct(limpN, pre.n);
  pre.callVsOpen = pct(callOpenN, pre.vsOpen);
  pre.allin = pct(preAllinN, pre.n);
  pre.adherence = pct(adhN, pre.n);

  post.check = pct(checkN, post.n);
  post.call = pct(callN, post.n);
  post.fold = pct(foldN, post.n);
  post.raise = pct(raiseN, post.n);
  post.allin = postAllinN;
  post.aggFreq = pct(raiseN + postAllinN, post.n);
  post.facedBet = facedBet;
  post.foldToBet = pct(foldBet, facedBet);
  post.plusEv = pct(plusN, post.n);
  post.contestedN = contestedN;
  post.contestedPlusEv = pct(contestedPlus, contestedN);
  post.evChosenAvg = avg(evC);
  post.evBestAvg = avg(evB);
  post.deltaAvg = avg(deltas);
  post.equityAvg = avg(eqs);
  post.outsAvg = avg(outs);
  for (const s of STREETS) {
    const st = post.byStreet[s];
    st.check = pct(st.check, st.n);
    st.call = pct(st.call, st.n);
    st.fold = pct(st.fold, st.n);
    st.raise = pct(st.raise, st.n);
    st.plusEv = pct(st._plus, st.n);
    st.deltaAvg = st.n > 0 ? st._deltaSum / st.n : 0;
    delete st._deltaSum;
    delete st._plus;
  }

  results.wtsdN = list.length;
  results.wtsd = pct(results.showdowns, list.length);
  results.wsd = pct(results._wonSd, results.showdowns);
  delete results._wonSd;

  return { hands: list.length, preflop: pre, postflop: post, results };
}
