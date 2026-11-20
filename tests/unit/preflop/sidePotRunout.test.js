import { describe, it, expect, vi } from 'vitest';
import { createTable, postBlinds } from '../../../src/engine/table.js';
import { runPreflop } from '../../../src/engine/preflop.js';

// Board fixo: sem par/straight/flush p/ ninguém → AA > QQ > 72o, sem sorte.
vi.mock('../../../src/engine/board.js', async (importOriginal) => {
  const orig = await importOriginal();
  const fixed = [
    { rank: 'K', suit: 'c' }, { rank: '9', suit: 'd' }, { rank: '5', suit: 's' },
    { rank: '3', suit: 'h' }, { rank: '8', suit: 'c' },
  ];
  return {
    ...orig,
    generateBoardCards: (n, exclude = []) =>
      n === 5 ? fixed.map((c) => ({ ...c })) : orig.generateBoardCards(n, exclude),
  };
});

const hooks = (holeCards, over = {}) => ({
  heroSeat: 2,
  villainRange: () => ({ rfi: new Map([['AA', ['OR']]]), xrfi: new Map([['AA', ['CALL']]]) }),
  seatRole: () => 'UTG',
  holeLabel: () => 'AA',
  holeCards,
  waitHero: async () => ({ token: 'ALL-IN', size: null }),
  sleep: async () => {},
  villainDelayMs: 0,
  ...over,
});

const total = (t) => t.seats.reduce((n, s) => n + s.stack + s.committed, 0);

describe('all-in runout: fichas que ninguém cobriu nunca somem (bust da mão 76)', () => {
  it('stack maior perde para o curto → o excesso não coberto volta ao dono', async () => {
    // o herói (3000) jamou contra 1000 e perdeu. O pote de 2000 é do
    // vilão, mas os 2000 que ninguém pagou eram do herói — antes sumiam e o
    // herói levava bust com stack sobrando.
    const t = createTable({ numSeats: 2, stackChips: 3000, sb: 10, bb: 20 });
    t.seats[1].stack = 1000;
    postBlinds(t, 0, 1); // hero = seat 0 age primeiro
    const res = await runPreflop(t, hooks(
      [['7♥', '2♣'], ['A♠', 'A♦']],
      { heroSeat: 0 },
    ));
    expect(res.reason).toBe('allin-runout');
    expect(res.winners).toEqual([1]);
    expect(t.seats[0].stack).toBe(2000);
    expect(t.seats[1].stack).toBe(2000);
    expect(total(t)).toBe(4000);
  });

  it('3 stacks diferentes: o side pot vai ao melhor ENTRE os elegíveis', async () => {
    // AA (1000) ganha o pote principal; o side pot entre QQ (2000) e o
    // herói (3000) tem que ir ao QQ, e o que sobra do herói volta. Antes o
    // filtro "ganhou o showdown geral" deixava os dois potes sem dono.
    const t = createTable({ numSeats: 3, stackChips: 3000, sb: 10, bb: 20 });
    t.seats[0].stack = 1000; // SB, AA
    t.seats[1].stack = 2000; // BB, QQ
    postBlinds(t, 0, 1); // hero = seat 2 (UTG) age primeiro
    const res = await runPreflop(t, hooks(
      [['A♠', 'A♦'], ['Q♠', 'Q♦'], ['7♥', '2♣']],
    ));
    expect(res.reason).toBe('allin-runout');
    expect(t.seats.map((s) => s.stack)).toEqual([3000, 2000, 1000]);
    expect(total(t)).toBe(6000);
  });
});

describe('evento de CALL pré-flop carrega o valor efetivamente pago', () => {
  it('vilão curto paga o shove do herói: size = stack dele, não o to-call bruto', async () => {
    // a HH sai do evento `action`; to-call cheio (2980) num stack de 980
    // fazia o log pagar mais fichas do que o seat tinha.
    const t = createTable({ numSeats: 2, stackChips: 3000, sb: 10, bb: 20 });
    t.seats[1].stack = 1000;
    postBlinds(t, 0, 1);
    const events = [];
    await runPreflop(t, hooks(
      [['7♥', '2♣'], ['A♠', 'A♦']],
      { heroSeat: 0, onEvent: (e) => events.push(e) },
    ));
    const call = events.find((e) => e.type === 'action' && e.seat === 1);
    expect(call.token).toBe('CALL');
    expect(call.size).toBe(980);
  });
});
