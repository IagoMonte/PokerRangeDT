import { describe, it, expect } from 'vitest';
import { computeMetrics, filterHands } from '../../../src/engine/profileStats.js';

// o dashboard mede o jogado — VPIP só conta ação voluntária
// (blind postado nunca entra), RFI/3B/4B têm denominador por facing,
// e vazio nunca gera NaN (página divide por zero sem quebrar).

const H = (over) => ({
  date: '2026-09-19T10:00:00.000Z',
  drill: 'fulldrill 20s',
  role: 'BUTTON',
  preflop: null,
  postflop: [],
  result: null,
  ...over,
});
const PRE = (facing, token, verdict = 'plus') => ({ facing, token, verdict });
const POST = (over) => ({
  street: 'flop', op: 'CALL', toCall: 20, bucket: 'BUCKET_C',
  outs: 8, equity: 0.36, chosenEV: 10, bestEV: 12, delta: -2, verdict: 'plus',
  ...over,
});

describe('computeMetrics (vazio)', () => {
  it('zeros sem NaN', () => {
    const m = computeMetrics([]);
    expect(m.hands).toBe(0);
    expect(m.preflop.vpip).toBe(0);
    expect(m.preflop.rfi).toBe(0);
    expect(m.postflop.plusEv).toBe(0);
    expect(m.postflop.deltaAvg).toBe(0);
    expect(m.results.pnl).toBe(0);
    expect(m.results.wsd).toBe(0);
  });
});

describe('pré-flop (ação voluntária)', () => {
  const hands = [
    H({ preflop: PRE('none', 'OR') }), // vpip + pfr + rfi opp/conv
    H({ preflop: PRE('open', 'CALL') }), // vpip, vsOpen, callVsOpen
    H({ preflop: PRE('open', 'FOLD', 'minus') }), // vsOpen, foldVsOpen
    H({ preflop: PRE('none', 'CHECK') }), // grátis: nem vpip nem pfr, mas conta no RFI opp? não — CHECK não é raise
    H({ preflop: PRE('3b', '4B') }), // pfr + 4b
  ];
  const m = computeMetrics(hands);
  it('vpip/pfr só com ação voluntária', () => {
    expect(m.preflop.n).toBe(5);
    expect(m.preflop.vpip).toBeCloseTo(60, 5); // OR + CALL + 4B
    expect(m.preflop.pfr).toBeCloseTo(40, 5); // OR + 4B
  });
  it('denominadores por facing', () => {
    expect(m.preflop.rfiOpp).toBe(2); // 2× facing none
    expect(m.preflop.rfi).toBeCloseTo(50, 5); // 1 OR em 2
    expect(m.preflop.vsOpen).toBe(2);
    expect(m.preflop.foldVsOpen).toBeCloseTo(50, 5);
    expect(m.preflop.callVsOpen).toBeCloseTo(50, 5);
    expect(m.preflop.vs3b).toBe(1);
    expect(m.preflop.fourB).toBeCloseTo(100, 5);
  });
  it('aderência = na-linha ÷ decisões', () => {
    expect(m.preflop.adherence).toBeCloseTo(80, 5); // 4 plus em 5
  });
});

describe('pós-flop', () => {
  const hands = [
    H({ postflop: [POST({ street: 'flop', op: 'CALL', verdict: 'plus', delta: -2 }), POST({ street: 'turn', op: 'FOLD', toCall: 40, verdict: 'minus', delta: -30 })] }),
    H({ postflop: [POST({ street: 'flop', op: 'CHECK', toCall: 0, verdict: 'plus', delta: 0 })] }),
    H({ postflop: [POST({ street: 'river', op: 'RAISE', toCall: 20, verdict: 'plus', delta: -1 })] }),
  ];
  const m = computeMetrics(hands);
  it('distribuição + agressão', () => {
    expect(m.postflop.n).toBe(4);
    expect(m.postflop.aggFreq).toBeCloseTo(25, 5); // 1 raise em 4
  });
  it('fold-to-bet só conta enfrentando aposta', () => {
    expect(m.postflop.facedBet).toBe(3); // CHECK grátis fora
    expect(m.postflop.foldToBet).toBeCloseTo(100 / 3, 5);
  });
  it('+EV% e delta médio', () => {
    expect(m.postflop.plusEv).toBeCloseTo(75, 5);
    expect(m.postflop.deltaAvg).toBeCloseTo(-33 / 4, 5);
  });
  it('+EV contestado só conta enfrentando aposta', () => {
    // CALL +EV e FOLD −EV com toCall>0; CHECK grátis +EV não entra.
    expect(m.postflop.contestedN).toBe(3);
    expect(m.postflop.contestedPlusEv).toBeCloseTo(200 / 3, 5);
  });
  it('por street', () => {
    expect(m.postflop.byStreet.flop.n).toBe(2);
    expect(m.postflop.byStreet.turn.n).toBe(1);
    expect(m.postflop.byStreet.river.plusEv).toBeCloseTo(100, 5);
  });
});

describe('resultados', () => {
  const hands = [
    H({ result: { heroDelta: 100, pot: 200, showdown: true, won: true } }),
    H({ result: { heroDelta: -50, pot: 100, showdown: true, won: false } }),
    H({ result: { heroDelta: 30, pot: 60, showdown: false, won: true } }),
  ];
  const m = computeMetrics(hands);
  it('pnl, wtsd, wsd, extremos, split showdown', () => {
    expect(m.results.pnl).toBe(80);
    expect(m.results.wtsd).toBeCloseTo(200 / 3, 5);
    expect(m.results.wsd).toBeCloseTo(50, 5);
    expect(m.results.maxWon).toBe(100);
    expect(m.results.maxLost).toBe(-50);
    expect(m.results.sdPnl).toBe(50);
    expect(m.results.nonSdPnl).toBe(30);
  });
});

describe('filtros', () => {
  const hands = [
    H({ date: '2026-09-18T10:00:00Z', role: 'BUTTON', drill: 'A' }),
    H({ date: '2026-09-19T10:00:00Z', role: 'BIG_BLIND', drill: 'B' }),
  ];
  it('dia / role / drill', () => {
    expect(filterHands(hands, { day: '2026-09-19' }).length).toBe(1);
    expect(filterHands(hands, { roles: ['BUTTON'] }).length).toBe(1);
    expect(filterHands(hands, { drill: 'A' }).length).toBe(1);
    expect(filterHands(hands, {}).length).toBe(2);
  });
});

describe('registros v2 (solver) não mudam as métricas', () => {
  it('lines/cards/board/winners são ignorados pelo computeMetrics', () => {
    // o registro enriquecido (sequência solver) alimenta o log da mão,
    // nunca o dashboard — métrica com ou sem os campos novos é idêntica.
    const base = H({
      preflop: { facing: 'none', token: 'OR', verdict: 'plus' },
      postflop: [{ street: 'flop', op: 'CHECK', toCall: 0, verdict: 'plus' }],
      result: { heroDelta: 50, pot: 100, showdown: false, won: true },
    });
    const rich = {
      ...base,
      handNo: 7, sb: 10, bb: 20, heroSeat: 0, heroCards: ['A♥', 'K♠'],
      seats: [{ seat: 0, name: 'VOCÊ', role: 'BUTTON', stack: 2000 }],
      blinds: { sbSeat: 1, bbSeat: 2 },
      lines: { preflop: [[0, 'OR', 60]], flop: [[0, 'CHECK', null]], turn: [], river: [] },
      board: ['K♠', '7♥', '2♣'], winners: [0], handName: 'Pair', shownCards: {},
    };
    expect(computeMetrics([rich])).toEqual(computeMetrics([base]));
  });
});
