import { describe, it, expect } from 'vitest';
import { formatHandHistory, formatHandMTT, dealerToSolver, syncHistoryBoard } from '../../../src/engine/handHistory.js';

// GTO Wizard só aceita upload em formato de site suportado —
// "Something went wrong: Please use currently supported formats and
// sites" rejeita qualquer outro texto. Por isso o formato é PokerStars
// puro (keyword, USD, ET, SHOW DOWN + SUMMARY com Total pot/Board/seats)
// e a fixture abaixo trava o texto exato rua a rua.

const HAND = {
  date: '2026-09-20T10:00:00.000Z', drill: 'fulldrill 20s', handNo: 4,
  sb: 10, bb: 20, heroSeat: 0,
  seats: [
    { seat: 0, name: 'VOCÊ', role: 'BUTTON', stack: 2000 },
    { seat: 1, name: 'VILLAIN-1', role: 'SMALL_BLIND', stack: 2000 },
    { seat: 2, name: 'VILLAIN-2', role: 'BIG_BLIND', stack: 2000 },
  ],
  blinds: { sbSeat: 1, bbSeat: 2 },
  heroCards: ['A♥', 'K♠'],
  lines: {
    preflop: [[0, 'OR', 60], [1, 'FOLD', null], [2, 'CALL', 40]],
    flop: [[2, 'CHECK', null], [0, 'CHECK', null]],
    turn: [[2, 'RAISE', 80], [0, 'CALL', 80]],
    river: [[2, 'CHECK', null], [0, 'CHECK', null]],
  },
  board: ['K♠', '7♥', '2♣', 'Q♦', '2♠'],
  winners: [0], handName: 'Two pair, Kings and Deuces',
  shownCards: { 0: ['A♥', 'K♠'], 2: ['9♣', '8♣'] },
  result: { heroDelta: 140, pot: 300, showdown: true, won: true },
};

// Fixture 9-max (sample real que abre nos solvers; reuso cash + MTT).
const HAND9 = {
  date: '2026-09-26T16:27:14.000Z', drill: 'Full predict 20s', handNo: 247856123456,
  sb: 1, bb: 2, heroSeat: 0,
  seats: [
    { seat: 0, name: 'VOCÊ', role: '', stack: 100 },
    { seat: 1, name: 'VILLAIN-4', role: '', stack: 100 },
    { seat: 2, name: 'VILLAIN-2', role: '', stack: 100 },
    { seat: 3, name: 'VILLAIN-1', role: '', stack: 99 },
    { seat: 4, name: 'VILLAIN-8', role: '', stack: 98 },
    { seat: 5, name: 'VILLAIN-7', role: 'BUTTON', stack: 100 },
    { seat: 6, name: 'VILLAIN-3', role: 'SMALL_BLIND', stack: 100 },
    { seat: 7, name: 'VILLAIN-6', role: 'BIG_BLIND', stack: 103 },
    { seat: 8, name: 'VILLAIN-5', role: '', stack: 100 },
  ],
  blinds: { sbSeat: 6, bbSeat: 7 },
  heroCards: ['K♠', '5♥'],
  lines: {
    preflop: [[8, 'OR', 5], [0, 'ALL-IN', 100], [1, 'FOLD', null], [2, 'FOLD', null], [3, 'FOLD', null], [4, 'FOLD', null], [5, 'CALL', 100], [6, 'FOLD', null], [7, 'FOLD', null], [8, 'CALL', 95]],
    flop: [], turn: [], river: [],
  },
  board: ['A♥', '7♠', 'T♦', '5♦', 'Q♠'],
  winners: [5], handName: 'Three of a kind, Aces',
  shownCards: { 0: ['K♠', '5♥'], 5: ['A♠', 'A♦'], 8: ['9♣', '9♦'] },
  result: { heroDelta: -100, pot: 303, showdown: true, won: false },
};

const EXPECTED = `PokerStars Hand #4: Hold'em No Limit ($10.00/$20.00 USD) - 2026/09/20 10:00:00 ET
Table 'fulldrill 20s' 3-max Seat #1 is the button
Seat 1: VOCÊ ($2000.00 in chips)
Seat 2: VILLAIN-1 ($2000.00 in chips)
Seat 3: VILLAIN-2 ($2000.00 in chips)
VILLAIN-1: posts small blind $10.00
VILLAIN-2: posts big blind $20.00
*** HOLE CARDS ***
Dealt to VOCÊ [Ah Ks]
VOCÊ: raises $40.00 to $60.00
VILLAIN-1: folds
VILLAIN-2: calls $40.00
*** FLOP *** [Ks 7h 2c]
VILLAIN-2: checks
VOCÊ: checks
*** TURN *** [Ks 7h 2c] [Qd]
VILLAIN-2: bets $80.00
VOCÊ: calls $80.00
*** RIVER *** [Ks 7h 2c Qd] [2s]
VILLAIN-2: checks
VOCÊ: checks
*** SHOW DOWN ***
VOCÊ: shows [Ah Ks]
VILLAIN-2: shows [9c 8c]
VOCÊ collected $300.00 from pot
*** SUMMARY ***
Total pot $300.00 | Rake $0
Board [Ks 7h 2c Qd 2s]
Seat 1: VOCÊ (button) showed [Ah Ks] and won ($300.00)
Seat 2: VILLAIN-1 (small blind) folded before Flop (didn't bet)
Seat 3: VILLAIN-2 (big blind) showed [9c 8c]`;

describe('formatHandHistory (PokerStars puro)', () => {
  it('gera o texto exato rua a rua + summary', () => {
    expect(formatHandHistory(HAND)).toBe(EXPECTED);
  });

  it('mão sem contestação: sem flop/showdown, collected + summary', () => {
    const txt = formatHandHistory({
      ...HAND,
      lines: { preflop: [[0, 'OR', 60], [1, 'FOLD', null], [2, 'FOLD', null]], flop: [], turn: [], river: [] },
      board: [], winners: [0], shownCards: {},
      result: { heroDelta: 30, pot: 90, showdown: false, won: true },
    });
    expect(txt).toContain('Dealt to VOCÊ [Ah Ks]');
    expect(txt).not.toContain('*** FLOP ***');
    expect(txt).not.toContain('SHOW DOWN');
    expect(txt).toContain('VOCÊ collected $90.00 from pot');
    expect(txt).toContain('*** SUMMARY ***');
    expect(txt).toContain('Total pot $90.00 | Rake $0');
    expect(txt).not.toContain('Board');
    expect(txt).toContain('Seat 1: VOCÊ (button) collected ($90.00)');
  });

  it('sample 9-max real (o que abre nos solvers): byte a byte', () => {
    // nosso texto era "quase-PS" (stack sem decimais + nome da mão
    // entre parênteses) e nenhum solver abria. O sample abaixo é o formato
    // que funciona — o formatter tem que cuspi-lo idêntico.
    expect(formatHandHistory(HAND9)).toBe(`PokerStars Hand #247856123456: Hold'em No Limit ($1.00/$2.00 USD) - 2026/09/26 16:27:14 ET
Table 'Full predict 20s' 9-max Seat #6 is the button
Seat 1: VOCÊ ($100.00 in chips)
Seat 2: VILLAIN-4 ($100.00 in chips)
Seat 3: VILLAIN-2 ($100.00 in chips)
Seat 4: VILLAIN-1 ($99.00 in chips)
Seat 5: VILLAIN-8 ($98.00 in chips)
Seat 6: VILLAIN-7 ($100.00 in chips)
Seat 7: VILLAIN-3 ($100.00 in chips)
Seat 8: VILLAIN-6 ($103.00 in chips)
Seat 9: VILLAIN-5 ($100.00 in chips)
VILLAIN-3: posts small blind $1.00
VILLAIN-6: posts big blind $2.00
*** HOLE CARDS ***
Dealt to VOCÊ [Ks 5h]
VILLAIN-5: raises $3.00 to $5.00
VOCÊ: raises $95.00 to $100.00 and is all-in
VILLAIN-4: folds
VILLAIN-2: folds
VILLAIN-1: folds
VILLAIN-8: folds
VILLAIN-7: calls $100.00
VILLAIN-3: folds
VILLAIN-6: folds
VILLAIN-5: calls $95.00
*** FLOP *** [Ah 7s Td]
*** TURN *** [Ah 7s Td] [5d]
*** RIVER *** [Ah 7s Td 5d] [Qs]
*** SHOW DOWN ***
VOCÊ: shows [Ks 5h]
VILLAIN-7: shows [As Ad]
VILLAIN-5: shows [9c 9d]
VILLAIN-7 collected $303.00 from pot
*** SUMMARY ***
Total pot $303.00 | Rake $0
Board [Ah 7s Td 5d Qs]
Seat 1: VOCÊ showed [Ks 5h]
Seat 2: VILLAIN-4 folded before Flop (didn't bet)
Seat 3: VILLAIN-2 folded before Flop (didn't bet)
Seat 4: VILLAIN-1 folded before Flop (didn't bet)
Seat 5: VILLAIN-8 folded before Flop (didn't bet)
Seat 6: VILLAIN-7 (button) showed [As Ad] and won ($303.00)
Seat 7: VILLAIN-3 (small blind) folded before Flop (didn't bet)
Seat 8: VILLAIN-6 (big blind) folded before Flop (didn't bet)
Seat 9: VILLAIN-5 showed [9c 9d]`);
  });

  it('MTT 9-max (botão Copy MTT): mesmo corpo sem $, header de torneio', () => {
    // GTOW não tem solução cash 9-max e rejeita; MTT 9-max passa
    // (bissecção real na API). Texto travado byte a byte contra upload válido.
    expect(formatHandMTT(HAND9)).toBe(`PokerStars Hand #247856123456: Tournament #247856123456, $10+$1 USD Hold'em No Limit - Level I (1/2) - 2026/09/26 16:27:14 ET
Table 'Full predict 20s' 9-max Seat #6 is the button
Seat 1: VOCÊ (100 in chips)
Seat 2: VILLAIN-4 (100 in chips)
Seat 3: VILLAIN-2 (100 in chips)
Seat 4: VILLAIN-1 (99 in chips)
Seat 5: VILLAIN-8 (98 in chips)
Seat 6: VILLAIN-7 (100 in chips)
Seat 7: VILLAIN-3 (100 in chips)
Seat 8: VILLAIN-6 (103 in chips)
Seat 9: VILLAIN-5 (100 in chips)
VILLAIN-3: posts small blind 1
VILLAIN-6: posts big blind 2
*** HOLE CARDS ***
Dealt to VOCÊ [Ks 5h]
VILLAIN-5: raises 3 to 5
VOCÊ: raises 95 to 100 and is all-in
VILLAIN-4: folds
VILLAIN-2: folds
VILLAIN-1: folds
VILLAIN-8: folds
VILLAIN-7: calls 100
VILLAIN-3: folds
VILLAIN-6: folds
VILLAIN-5: calls 95
*** FLOP *** [Ah 7s Td]
*** TURN *** [Ah 7s Td] [5d]
*** RIVER *** [Ah 7s Td 5d] [Qs]
*** SHOW DOWN ***
VOCÊ: shows [Ks 5h]
VILLAIN-7: shows [As Ad]
VILLAIN-5: shows [9c 9d]
VILLAIN-7 collected 303 from pot
*** SUMMARY ***
Total pot 303 | Rake 0
Board [Ah 7s Td 5d Qs]
Seat 1: VOCÊ showed [Ks 5h]
Seat 2: VILLAIN-4 folded before Flop (didn't bet)
Seat 3: VILLAIN-2 folded before Flop (didn't bet)
Seat 4: VILLAIN-1 folded before Flop (didn't bet)
Seat 5: VILLAIN-8 folded before Flop (didn't bet)
Seat 6: VILLAIN-7 (button) showed [As Ad] and won (303)
Seat 7: VILLAIN-3 (small blind) folded before Flop (didn't bet)
Seat 8: VILLAIN-6 (big blind) folded before Flop (didn't bet)
Seat 9: VILLAIN-5 showed [9c 9d]`);
  });

  it('registro antigo (sem lines) retorna null — UI cai na linha-resumo', () => {
    expect(formatHandHistory(null)).toBeNull();
    expect(formatHandHistory({})).toBeNull();
    // grading + resultado, sem sequência de ações.
    expect(formatHandHistory({
      date: '2026-09-19T10:02:00.000Z', drill: 'fulldrill 20s', role: 'BUTTON',
      preflop: { facing: 'none', token: 'OR', verdict: 'plus' },
      postflop: [{ street: 'flop', op: 'CALL' }],
      result: { heroDelta: 120, pot: 240, showdown: true, won: true },
    })).toBeNull();
  });

  it('dealerToSolver converte naipe e tolera lixo', () => {
    expect(dealerToSolver('A♥')).toBe('Ah');
    expect(dealerToSolver('T♠')).toBe('Ts');
    expect(dealerToSolver(null)).toBe('?');
  });
});

// runout corre o board sem eventos de street — all-in pré-flop gera
// 5 cartas de uma vez, pós-flop sem aposta possível pula as ruas. O board
// vivo do log ficava vazio/parcial e o solver recebia showdown sem Board
// (ou com Board parcial) e rejeitava o upload. syncHistoryBoard copia o
// board final do settle p/ o log, só em showdown.
describe('syncHistoryBoard (runout → log)', () => {
  const RUNOUT5 = [
    { rank: 'K', suit: 's' }, { rank: '7', suit: 'h' }, { rank: '2', suit: 'c' },
    { rank: 'Q', suit: 'd' }, { rank: '2', suit: 's' },
  ];
  const baseLog = () => ({
    lines: { preflop: [[0, 'ALL-IN', 2000]], flop: [], turn: [], river: [] },
    board: [],
    winners: [0], shownCards: { 0: ['A♥', 'K♠'] },
    result: { heroDelta: 100, pot: 300, showdown: true, won: true },
  });

  it('allin-runout com board vazio: sincroniza as 5 e o texto ganha FLOP+TURN+RIVER+Board', () => {
    const log = baseLog();
    syncHistoryBoard(log, { reason: 'allin-runout', board: RUNOUT5 });
    expect(log.board).toEqual(['K♠', '7♥', '2♣', 'Q♦', '2♠']);
    const txt = formatHandHistory({ ...HAND, lines: log.lines, board: log.board, winners: [0], shownCards: { 0: ['A♥', 'K♠'], 2: ['9♣', '8♣'] } });
    expect(txt).toContain('*** FLOP *** [Ks 7h 2c]');
    expect(txt).toContain('*** TURN *** [Ks 7h 2c] [Qd]');
    expect(txt).toContain('*** RIVER *** [Ks 7h 2c Qd] [2s]');
    expect(txt).toContain('Board [Ks 7h 2c Qd 2s]');
  });

  it('postflop-runout com board parcial (só flop): completa até 5', () => {
    const log = { ...baseLog(), board: ['K♠', '7♥', '2♣'] };
    syncHistoryBoard(log, { reason: 'postflop-runout', board: RUNOUT5 });
    expect(log.board).toEqual(['K♠', '7♥', '2♣', 'Q♦', '2♠']);
  });

  it('mão seca nunca sincroniza: everyone-folded e to-postflop (pré-only) intactos', () => {
    const fold = baseLog();
    syncHistoryBoard(fold, { reason: 'everyone-folded' });
    expect(fold.board).toEqual([]);
    const dry = baseLog();
    syncHistoryBoard(dry, { reason: 'to-postflop', board: RUNOUT5.slice(0, 3) });
    expect(dry.board).toEqual([]);
  });

  it('board vivo já completo nunca regride', () => {
    const log = { ...baseLog(), board: ['K♠', '7♥', '2♣', 'Q♦', '2♠'] };
    syncHistoryBoard(log, { reason: 'postflop-showdown', board: RUNOUT5.slice(0, 3) });
    expect(log.board).toEqual(['K♠', '7♥', '2♣', 'Q♦', '2♠']);
  });
});
