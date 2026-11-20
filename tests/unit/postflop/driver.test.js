import { describe, it, expect, vi } from 'vitest';
import { createTable, postBlinds, potTotal, showdownSeats, bankBlindsAsDeadMoney } from '../../../src/engine/table.js';
import { runPreflop } from '../../../src/engine/preflop.js';
import {
  decidePostflop, normalizeHeroDecision, raiseToChips, runPostflop,
} from '../../../src/engine/postflop.js';
import { BUCKETS } from '../../../src/engine/buckets.js';

// Runout determinístico: turn/river sempre blanks (não pareiam nada,
// não completam flush de ninguém) para os testes multi-way não dependerem
// de sorte. Flop (n===3) e resto delegam ao original.
vi.mock('../../../src/engine/board.js', async (importOriginal) => {
  const orig = await importOriginal();
  const blanks = [
    { rank: 'T', suit: 'd' }, { rank: 'J', suit: 'h' },
    { rank: 'T', suit: 'c' }, { rank: 'J', suit: 'd' },
  ];
  let i = 0;
  return {
    ...orig,
    generateBoardCards: (n, exclude = []) => {
      if (n === 1) {
        const pick = blanks[i++ % blanks.length];
        const dupe = exclude.some((c) => c.rank === pick.rank && c.suit === pick.suit);
        if (!dupe) return [{ ...pick }];
      }
      return orig.generateBoardCards(n, exclude);
    },
  };
});

const C = (rank, suit) => ({ rank, suit });
const FLOP_DRY = [C('K', 's'), C('9', 'h'), C('4', 'c')];
const FLOP_MONO = [C('K', 's'), C('9', 's'), C('4', 's')];
const PROFILE = { RFI: 0.20, CALL: 0.08, BLUFF: 0.30 };

describe('decidePostflop (one seat, own hole + own profile only)', () => {
  it('monster first to act bets: flopped set on dry flop → RAISE with a pot fraction', () => {
    const d = decidePostflop({
      hole: [C('K', 'h'), C('K', 'd')],
      board: FLOP_DRY,
      pot: 100, risk: 0, stack: 1000, profile: PROFILE, street: 'flop',
    });
    expect(d.bucket).toBe(BUCKETS.A);
    expect(d.action).toBe('RAISE');
    expect(d.fraction).toBeGreaterThan(0);
    expect(d.fraction).toBeLessThanOrEqual(1);
  });

  it('overpair alone checks through when the score cannot reach RAISE', () => {
    const d = decidePostflop({
      hole: [C('A', 'h'), C('A', 'd')],
      board: FLOP_DRY,
      pot: 100, risk: 0, stack: 1000, profile: PROFILE, street: 'flop',
    });
    expect(d.bucket).toBe(BUCKETS.B);
    expect(d.action).toBe('CHECK');
  });

  it('free action never folds: pure air with no draw → CHECK, not FOLD', () => {
    const d = decidePostflop({
      hole: [C('2', 'c'), C('7', 'd')],
      board: FLOP_DRY,
      pot: 100, risk: 0, stack: 1000, profile: PROFILE, street: 'flop',
    });
    expect(d.bucket).toBe(BUCKETS.D);
    expect(d.outs).toBe(0);
    expect(d.action).toBe('CHECK');
  });

  it('river value bets two-pair: solver bets ~37% (probe), engine nunca checava', () => {
    // BUCKET_B (~63) nunca alcançava RAISE (70) com risk=0 —
    // two-pair HU checava 3 streets. Sonda DCFR river OOP:
    // KQ two-pair beta 33 ~37%, TP checa ~100%, overpair beta ~67%.
    const d = decidePostflop({
      hole: [C('K', 'h'), C('Q', 'h')],
      board: [C('K', 's'), C('Q', 's'), C('2', 'd'), C('9', 'h'), C('3', 'c')],
      pot: 100, risk: 0, stack: 200, profile: PROFILE, street: 'river',
    });
    expect(d.handClass).toBe('TWO_PAIR');
    expect(d.action).toBe('RAISE');
    expect(d.fraction).toBeGreaterThan(0);
  });

  it('river value bets overpair: solver bets ~67% (probe)', () => {
    const d = decidePostflop({
      hole: [C('A', 'h'), C('A', 'd')],
      board: [C('K', 's'), C('Q', 's'), C('2', 'd'), C('9', 'h'), C('3', 'c')],
      pot: 100, risk: 0, stack: 200, profile: PROFILE, street: 'river',
    });
    expect(d.handClass).toBe('OVERPAIR');
    expect(d.action).toBe('RAISE');
  });

  it('river top pair still checks: solver checks ~100% (probe) — sem overbet', () => {
    const d = decidePostflop({
      hole: [C('K', 'h'), C('7', 'h')],
      board: [C('K', 's'), C('Q', 's'), C('2', 'd'), C('9', 'h'), C('3', 'c')],
      pot: 100, risk: 0, stack: 200, profile: PROFILE, street: 'river',
    });
    expect(d.handClass).toBe('TOP_PAIR');
    expect(d.action).toBe('CHECK');
  });

  it('missed draws are air on the river: 4-flush air grades D, not B', () => {
    const hole = [C('A', 's'), C('5', 'h')]; // no pair, 4 spades → 9 outs, still AIR
    const river = [C('K', 's'), C('Q', 's'), C('2', 's'), C('7', 'd'), C('9', 'c')];
    const onRiver = decidePostflop({
      hole, board: river, pot: 200, risk: 0, stack: 900, profile: PROFILE, street: 'river',
    });
    expect(onRiver.outs).toBe(0);
    expect(onRiver.bucket).toBe(BUCKETS.D);
    const ifFlop = decidePostflop({
      hole, board: river, pot: 200, risk: 0, stack: 900, profile: PROFILE, street: 'flop',
    });
    expect(ifFlop.outs).toBe(9);
    expect(ifFlop.bucket).toBe(BUCKETS.B);
  });
});

describe('normalizeHeroDecision (free actions never fold)', () => {
  it('FOLD/CALL/CHECK-button with nothing to call → CHECK', () => {
    expect(normalizeHeroDecision({ token: 'FOLD', size: null }, 0)).toEqual({ op: 'CHECK' });
    expect(normalizeHeroDecision({ token: 'CALL', size: null }, 0)).toEqual({ op: 'CHECK' });
    expect(normalizeHeroDecision({ token: 'CHECK', size: null }, 0)).toEqual({ op: 'CHECK' });
    expect(normalizeHeroDecision({ token: null, size: null }, 0)).toEqual({ op: 'CHECK' });
  });

  it('facing a bet, CHECK-button and FOLD fold, CALL calls, raises pass size through', () => {
    expect(normalizeHeroDecision({ token: null, size: null }, 50)).toEqual({ op: 'FOLD' });
    expect(normalizeHeroDecision({ token: 'FOLD', size: null }, 50)).toEqual({ op: 'FOLD' });
    expect(normalizeHeroDecision({ token: 'CALL', size: null }, 50)).toEqual({ op: 'CALL' });
    expect(normalizeHeroDecision({ token: 'OR', size: 300 }, 50)).toEqual({ op: 'RAISE', size: 300 });
    expect(normalizeHeroDecision({ token: 'ALL-IN', size: null }, 50)).toEqual({ op: 'ALL-IN' });
  });
});

describe('raiseToChips (fraction → clamped raise-to)', () => {
  it('floors at min-raise and caps at the stack', () => {
    const t = createTable({ numSeats: 2, stackChips: 2000, sb: 10, bb: 20 });
    postBlinds(t, 0, 1);
    const tiny = raiseToChips(t, 0, 0.01);
    expect(tiny).toBeGreaterThanOrEqual(40); // min-raise: 20 + 20
    const huge = raiseToChips(t, 0, 100);
    expect(huge).toBe(2000); // whole stack, not more
  });
});

// A postflop table with committed preflop stakes (what keepStakes hands over).
function stakedTable(n, committedEach = 100) {
  const t = createTable({ numSeats: n, stackChips: 2000, sb: 10, bb: 20 });
  t.seats.forEach((s) => {
    s.stack = 2000 - committedEach;
    s.committed = committedEach;
  });
  t.currentBet = committedEach;
  return t;
}

const HERO_FLUSH = ['A♠', 'Q♠']; // nut flush on FLOP_MONO — unbeatable without a pocket pair
const VILLAIN_TRASH = ['2♣', '7♦'];

const hooksFor = (over = {}) => ({
  heroSeat: 0,
  board: FLOP_MONO,
  holeCards: [HERO_FLUSH, VILLAIN_TRASH],
  profileFor: () => ({ ...PROFILE }),
  waitHero: async () => ({ token: 'CALL', size: null }), // hero never folds in tests
  sleep: async () => {},
  villainDelayMs: 0,
  ...over,
});

describe('runPostflop (flop → turn → river → showdown)', () => {
  it('checks through every street HU and pays the nut flush (chips conserved)', async () => {
    const t = stakedTable(2);
    const events = [];
    const res = await runPostflop(t, hooksFor({ onEvent: (e) => events.push(e) }));
    expect(res.reason).toBe('postflop-showdown');
    expect(res.board.length).toBe(5);
    expect(res.winners).toEqual([0]);
    expect(t.seats[0].stack).toBe(2100); // 1900 + banked 200
    expect(t.seats[1].stack).toBe(1900);
    expect(t.seats[0].stack + t.seats[1].stack).toBe(4000);
    const streets = events.filter((e) => e.type === 'street');
    expect(streets.map((s) => s.board.length)).toEqual([4, 5]);
  });

  it('plays 3-way without voiding: side pots banked, winner paid, chips conserved', async () => {
    const t = stakedTable(3);
    const res = await runPostflop(t, hooksFor({
      holeCards: [HERO_FLUSH, VILLAIN_TRASH, ['3♥', '8♣']],
    }));
    expect(res.reason).toBe('postflop-showdown');
    expect(res.winners).toEqual([0]);
    expect(res.pots.length).toBeGreaterThanOrEqual(1);
    expect(t.seats[0].stack).toBe(2200);
    expect(t.seats.reduce((n, s) => n + s.stack, 0)).toBe(6000);
  });

  it('pós-flop começa pelo SB, não pelo menor índice de assento (herói no botão age por último)', async () => {
    // Assentos 0..2 em ordem de mesa: SB=1, BB=2, botão=0. A ordem postflop é SB → BB → botão.
    const t = stakedTable(3);
    postBlinds(t, 1, 2);
    t.seats.forEach((s) => { s.stack = 1900; s.committed = 100; });
    t.currentBet = 100;
    const order = [];
    await runPostflop(t, hooksFor({
      holeCards: [HERO_FLUSH, VILLAIN_TRASH, ['3♥', '8♣']],
      onEvent: (e) => { if (e.type === 'turn' && order.length < 3) order.push(e.seat); },
    }));
    expect(order).toEqual([1, 2, 0]);
  });

  it('drill só pós-flop: blinds são dinheiro morto, o pote é de quem vence entre TODOS os vivos', async () => {
    // Herói (assento 0) nem é SB nem BB, mas tem o nut flush: leva o pote de 1.5 e as fichas se conservam.
    const t = createTable({ numSeats: 3, stackChips: 100, sb: 0.5, bb: 1 });
    postBlinds(t, 1, 2);
    bankBlindsAsDeadMoney(t);
    const res = await runPostflop(t, hooksFor({
      holeCards: [HERO_FLUSH, VILLAIN_TRASH, ['3♥', '8♣']],
    }));
    expect(res.reason).toBe('postflop-showdown');
    expect(res.winners).toEqual([0]);
    expect(t.seats[0].stack).toBe(101.5);
    expect(t.seats[1].stack).toBe(99.5);
    expect(t.seats[2].stack).toBe(99);
    expect(t.seats.reduce((n, s) => n + s.stack, 0)).toBe(300);
  });

  it('display reads the full pot mid-hand: banked preflop + live street, never 0', async () => {
    const t = stakedTable(2); // 100 each committed
    const seen = [];
    await runPostflop(t, hooksFor({
      onEvent: (e) => { if (e.type === 'turn') seen.push(potTotal(t)); },
    }));
    // o display quebrou mostrando 0 no postflop — collectPots zera o
    // committed e o pot tem que somar o bankado. Primeira decisão já enxerga 200.
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toBe(200);
    expect(seen.every((v) => v > 0)).toBe(true);
  });

  it('hero shove folds out trash → everyone-folded with banked + current pots', async () => {
    const t = stakedTable(2);
    const res = await runPostflop(t, hooksFor({
      board: FLOP_DRY,
      holeCards: [['A♥', 'A♦'], VILLAIN_TRASH],
      waitHero: async () => ({ token: 'ALL-IN', size: null }),
    }));
    expect(res.reason).toBe('everyone-folded');
    expect(res.winner).toBe(0);
    expect(t.seats[0].stack + t.seats[1].stack).toBe(4000);
    expect(t.seats[0].stack).toBeGreaterThan(2000); // banked 200 + villain dead money
  });

  it('all-in vs chipped hero: corre o board sem pedir ação (showdown automático)', async () => {
    // herói pagou o shove no pré-flop — não há adversário p/ apostar
    // contra no pós-flop. Pedir Check/Call rua a rua é ação fantasma.
    const t = createTable({ numSeats: 2, stackChips: 2000, sb: 10, bb: 20 });
    t.seats[0].stack = 1000; t.seats[0].committed = 1000; // herói pagou, tem fichas
    t.seats[1].stack = 0; t.seats[1].committed = 1000; t.seats[1].allIn = true; // vilão shovou
    t.currentBet = 1000;
    const events = [];
    const res = await runPostflop(t, hooksFor({
      onEvent: (e) => events.push(e),
      waitHero: async () => { throw new Error('runPostflop pediu ação do herói contra all-in'); },
    }));
    expect(res.reason).toBe('postflop-runout');
    expect(res.board.length).toBe(5);
    expect(events.filter((e) => e.type === 'turn')).toEqual([]);
    expect(t.seats[0].stack + t.seats[1].stack).toBe(3000);
  });

  it('all-in + dois com fichas: side pot segue apostando (sem runout precoce)', async () => {
    // o runout automático só vale sem adversário. Com dois com fichas
    // há side pot — o herói tem que agir e a mão termina em showdown normal.
    const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
    t.seats[0].stack = 1000; t.seats[0].committed = 1000;
    t.seats[1].stack = 1000; t.seats[1].committed = 1000;
    t.seats[2].stack = 0; t.seats[2].committed = 1000; t.seats[2].allIn = true;
    t.currentBet = 1000;
    let heroPrompted = 0;
    const res = await runPostflop(t, hooksFor({
      holeCards: [HERO_FLUSH, VILLAIN_TRASH, ['3♥', '8♣']],
      waitHero: async () => { heroPrompted++; return { token: 'CALL', size: null }; },
    }));
    expect(heroPrompted).toBeGreaterThan(0);
    expect(res.reason).toBe('postflop-showdown');
    expect(res.winners).toEqual([0]);
    expect(t.seats.reduce((n, s) => n + s.stack, 0)).toBe(5000);
  });
});

describe('preflop keepStakes (hands the live pot to runPostflop)', () => {
  const instant = (over = {}) => ({
    heroSeat: 2,
    villainRange: () => ({ rfi: new Map(), xrfi: new Map([['72o', ['CALL']]]) }),
    seatRole: () => 'UTG',
    holeLabel: () => '72o',
    holeCards: [[], [], []],
    waitHero: async () => ({ token: 'OR', size: null }),
    sleep: async () => {},
    villainDelayMs: 0,
    ...over,
  });

  it('keeps committed chips live instead of refunding (default path unchanged)', async () => {
    const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
    postBlinds(t, 0, 1);
    const res = await runPreflop(t, instant({ keepStakes: true }));
    expect(res.reason).toBe('to-postflop');
    expect(res.board.length).toBe(3);
    expect(t.seats.map((s) => s.stack)).toEqual([1950, 1950, 1950]); // 50 each stays in
    expect(t.seats.reduce((n, s) => n + s.committed, 0)).toBe(150);
  });
});

describe('evento de CALL carrega o valor efetivamente pago ("calls $56.20" com stack 19.78)', () => {
  it('vilão de stack curto paga o shove: size do CALL = o que ele tinha, não o to-call bruto', async () => {
    // a HH sai do evento `action`. O motor já limitava o pagamento ao stack
    // (pote certo), mas o evento anunciava o to-call cheio → HH mentia o valor.
    const t = createTable({ numSeats: 2, stackChips: 2000, sb: 10, bb: 20 });
    t.seats[0].stack = 1900; t.seats[0].committed = 100;
    t.seats[1].stack = 300; t.seats[1].committed = 100;
    t.currentBet = 100;
    const events = [];
    const res = await runPostflop(t, hooksFor({
      board: FLOP_DRY,
      holeCards: [['A♥', 'A♦'], ['K♥', 'J♦']], // top pair: paga o shove (set de reis dá raise)
      waitHero: async () => ({ token: 'ALL-IN', size: null }),
      onEvent: (e) => events.push(e),
    }));
    const call = events.find((e) => e.type === 'action' && e.seat === 1);
    expect(call.token).toBe('CALL');
    expect(call.size).toBe(300);
    expect(res.pots.reduce((n, p) => n + p.amount, 0)).toBe(800);
  });
});

describe('showdownSeats (quem mostra no showdown)', () => {
  it('perdedor que pagou sem all-in mostra; só fold esconde (herói "mucked")', () => {
    // o reveal era winners + all-in. O herói apostou, foi pago e perdeu sem
    // estar all-in → ficava fora de shownCards e a HH dizia "mucked" (impossível).
    const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
    t.seats[2].folded = true;
    t.seats[1].allIn = true;
    expect(showdownSeats(t)).toEqual([0, 1]);
  });
});

describe('evento de RAISE carrega o raise-to efetivo, sem poeira de float', () => {
  it('raise com fração suja vira o valor que a mesa de fato aplicou (0.9750000000000001 → 0.98)', async () => {
    // o histórico gravava o size cru do cálculo (0.9750000000000001) enquanto a
    // mesa quantiza para centavos — a linha da HH e o pote divergiam em 1 centavo.
    const t = createTable({ numSeats: 2, stackChips: 20, sb: 0.1, bb: 0.2 });
    t.seats.forEach((s) => { s.stack = 19.5; s.committed = 0.5; });
    t.currentBet = 0.5;
    const events = [];
    await runPostflop(t, hooksFor({
      board: FLOP_DRY,
      holeCards: [['A♥', 'A♦'], ['K♥', 'J♦']],
      waitHero: async () => ({ token: 'RAISE', size: 0.9750000000000001 }),
      onEvent: (e) => events.push(e),
    }));
    const raise = events.find((e) => e.type === 'action' && e.token === 'RAISE' && e.seat === 0);
    expect(raise.size).toBe(0.98);
  });
});
