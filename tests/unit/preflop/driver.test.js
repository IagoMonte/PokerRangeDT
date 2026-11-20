import { describe, it, expect } from 'vitest';
import {
  decideVillainAction,
  defaultSize,
  pctToChips,
  runPreflop,
} from '../../../src/engine/preflop.js';
import { createTable, postBlinds } from '../../../src/engine/table.js';
import { fmtChips } from '../../../src/infra/format.js';

describe('decideVillainAction (deterministic: range in, token out)', () => {
  it('opens its OR hands, limps only explicit LIMP lines, folds the rest', () => {
    expect(decideVillainAction('AKs', ['OR', '4B'], undefined, 'none')).toBe('OR');
    expect(decideVillainAction('72o', ['LIMP'], undefined, 'none')).toBe('LIMP');
    expect(decideVillainAction('72o', ['OR'], undefined, 'none')).toBe('OR');
    expect(decideVillainAction('72o', undefined, undefined, 'none')).toBe('FOLD');
  });

  it('first-in joga o abridor: OR/LIMP antes de ALL-IN (linha é sequência)', () => {
    // ALL-IN vencia OR first-in e a linha ["OR","4B","ALL-IN"] virava
    // open-shove direto (KK first-in shovava em vez de abrir OR → 4B vs
    // 3-bet → ALL-IN vs 4-bet). Abridor manda first-in; ALL-IN puro
    // (sem OR/LIMP) segue open-shovando.
    expect(decideVillainAction('AA', ['ALL-IN'], undefined, 'none')).toBe('ALL-IN');
    expect(decideVillainAction('KK', ['OR', '4B', 'ALL-IN'], undefined, 'none')).toBe('OR');
    expect(decideVillainAction('AA', ['OR', 'ALL-IN'], undefined, 'none')).toBe('OR');
    expect(decideVillainAction('72o', ['LIMP', 'ALL-IN'], undefined, 'none')).toBe('LIMP');
    expect(decideVillainAction('AKs', ['OR', '4B'], undefined, 'none')).toBe('OR');
  });

  it('facing an open: XRFI decides alone — RFI-only folds, 3B beats ALL-IN, CALL honors cap', () => {
    // RFI presente não é instrução de defesa (era o call
    // fantasma) e "3B ALL-IN" 3-beta em vez de jamar 100bb over 1 open.
    expect(decideVillainAction('AA', undefined, ['ALL-IN'], 'open')).toBe('ALL-IN');
    expect(decideVillainAction('KK', undefined, ['3B', 'ALL-IN'], 'open')).toBe('3B');
    expect(decideVillainAction('AKs', undefined, ['3B'], 'open')).toBe('3B');
    expect(decideVillainAction('A5s', undefined, ['CALL'], 'open')).toBe('CALL');
    expect(decideVillainAction('A2s', undefined, ['CALL'], 'open', { toCallBb: 2.5, callCapBb: 2 })).toBe('FOLD');
    expect(decideVillainAction('QQ', ['OR'], undefined, 'open')).toBe('FOLD');
    expect(decideVillainAction('72o', undefined, undefined, 'open')).toBe('FOLD');
  });

  it('facing a 3-bet: 4B jams, ALL-IN shoves, CALL flats, rest fold', () => {
    expect(decideVillainAction('AKs', ['OR', '4B'], undefined, '3b')).toBe('4B');
    expect(decideVillainAction('AA', ['OR', 'ALL-IN'], undefined, '3b')).toBe('ALL-IN');
    expect(decideVillainAction('99', ['OR', 'CALL'], undefined, '3b')).toBe('CALL');
    expect(decideVillainAction('AKs', ['OR', '4B', 'CALL'], undefined, '3b')).toBe('4B');
    expect(decideVillainAction('AKs', ['OR', 'ALL-IN', 'CALL'], undefined, '3b')).toBe('ALL-IN');
    expect(decideVillainAction('QQ', ['OR'], undefined, '3b')).toBe('FOLD');
    expect(decideVillainAction('A5s', undefined, ['CALL'], '3b')).toBe('FOLD');
  });

  it('facing a 4-bet: ALL-IN shoves, CALL precisa de instrução ', () => {
    // união antiga pagava 4-bet frio com "OR CALL" (98s/66 viam flop
    // 3-way em 4b-pot). Posicional como o resto da SPEC: XRFI-CALL sustenta
    // ("3B CALL"), RFI-CALL só com 4B junto ("OR 4B CALL"); sem → FOLD.
    expect(decideVillainAction('AA', ['OR', '4B', 'ALL-IN'], undefined, '4b')).toBe('ALL-IN');
    expect(decideVillainAction('AKs', ['OR', '4B'], undefined, '4b')).toBe('FOLD');
    expect(decideVillainAction('99', ['OR', 'CALL'], undefined, '4b')).toBe('FOLD');
    expect(decideVillainAction('KK', ['OR', '4B', 'CALL'], undefined, '4b')).toBe('CALL');
    expect(decideVillainAction('A5s', undefined, ['CALL'], '4b')).toBe('CALL');
  });
});

describe('sizings', () => {
  it('villain defaults: 2.5bb open, 3x/2.5x re-raises floored at min-raise', () => {
    const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
    postBlinds(t, 0, 1);
    expect(defaultSize(t, 'OR')).toBe(50);
    expect(defaultSize(t, '3B')).toBe(60); // 3x20=60 ≥ min 40
  });

  it('hero slider pct converts to clamped raise-to chips', () => {
    const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
    postBlinds(t, 0, 1); // pot 30, currentBet 20
    const chips = pctToChips(t, 2, 100); // call 20 + 100% of 30
    expect(chips).toBe(20 + 20 + 30);
  });
});

const instantHooks = (over = {}) => ({
  heroSeat: 2,
  villainRange: () => ({ rfi: new Map(), xrfi: new Map() }),
  seatRole: () => 'UTG',
  holeLabel: () => null,
  holeCards: [[], [], []],
  waitHero: async () => ({ token: 'FOLD', size: null }),
  sleep: async () => {},
  villainDelayMs: 0,
  ...over,
});

describe('runPreflop (coordinates hero + villains to a terminal reason)', () => {
  it('everyone folds around the hero → everyone-folded with a winner', async () => {
    const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
    postBlinds(t, 0, 1); // actor = seat 2 = hero
    const res = await runPreflop(t, instantHooks());
    expect(res.reason).toBe('everyone-folded');
    expect(res.winner).toBe(1);
    expect(res.pots.length).toBe(1);
    // pot = SB 10 + BB 20 + hero 0 (folded free) = 30 → BB: 2000-20+30
    expect(t.seats[1].stack).toBe(2010);
  });

  it('open + calls all around → to-postflop, stakes refunded (notify-only v1)', async () => {
    const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
    postBlinds(t, 0, 1);
    const callers = {
      villainRange: () => ({ rfi: new Map(), xrfi: new Map([['72o', ['CALL']]]) }),
      holeLabel: () => '72o',
      waitHero: async () => ({ token: 'OR', size: null }), // 2.5bb = 50
    };
    const res = await runPreflop(t, instantHooks(callers));
    expect(res.reason).toBe('to-postflop');
    expect(res.live).toEqual([0, 1, 2]);
    expect(t.seats.map(s => s.stack)).toEqual([2000, 2000, 2000]);
  });

  it('to-postflop still deals a cosmetic 3-card flop (no hole-card dupes)', async () => {
    const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
    postBlinds(t, 0, 1);
    const callers = {
      villainRange: () => ({ rfi: new Map(), xrfi: new Map([['72o', ['CALL']]]) }),
      holeLabel: () => '72o',
      holeCards: [['7♥', '2♣'], ['A♠', 'A♦'], ['K♥', 'Q♥']],
      waitHero: async () => ({ token: 'OR', size: null }),
    };
    const res = await runPreflop(t, instantHooks(callers));
    expect(res.reason).toBe('to-postflop');
    // The flop is display-only (stakes were refunded) but must be a real
    // deck-consistent flop: 3 unique cards, none in anyone's hand.
    expect(res.board.length).toBe(3);
    const flop = res.board.map(c => c.rank + c.suit);
    expect(new Set(flop).size).toBe(3);
    for (const exact of ['7h', '2c', 'As', 'Ad', 'Kh', 'Qh']) {
      expect(flop.includes(exact)).toBe(false);
    }
  });

  it('hero shove + villain re-shove → allin-runout conserves every chip', async () => {
    const t = createTable({ numSeats: 2, stackChips: 2000, sb: 10, bb: 20 });
    postBlinds(t, 0, 1); // actor = seat 0
    const hooks = instantHooks({
      heroSeat: 0,
      // : defesa precisa de XRFI — RFI puro folda até p/ AA.
      villainRange: () => ({ rfi: new Map([['AA', ['OR']]]), xrfi: new Map([['AA', ['CALL']]]) }),
      holeLabel: (seat) => (seat === 1 ? 'AA' : '72o'),
      holeCards: [['7♥', '2♣'], ['A♠', 'A♦']],
      waitHero: async () => ({ token: 'ALL-IN', size: null }),
    });
    const res = await runPreflop(t, hooks);
    expect(res.reason).toBe('allin-runout');
    expect(res.board.length).toBe(5);
    const boardSet = new Set(res.board.map(c => c.rank + c.suit));
    // Exact hole cards (rank+suit) never reappear on the runout.
    for (const exact of ['7h', '2c', 'As', 'Ad']) {
      expect(boardSet.has(exact)).toBe(false);
    }
    const total = t.seats.reduce((n, s) => n + s.stack, 0);
    expect(total).toBe(4000);
  });

  it('painted LIMP lines complete through the blinds (explicit token only)', async () => {
    const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
    postBlinds(t, 0, 1); // actor = seat 2 = hero, folds
    const hooks = instantHooks({
      villainRange: () => ({ rfi: new Map([['72o', ['LIMP', 'FOLD']]]), xrfi: new Map() }),
      holeLabel: () => '72o',
    });
    const res = await runPreflop(t, hooks);
    expect(res.reason).toBe('to-postflop');
    expect(t.seats[0].stack).toBe(2000); // refunded after void (SB had completed to 20)
    expect(t.seats[1].stack).toBe(2000);
  });

  it('tied runout splits odd cents exactly, stacks stay cent-clean', async () => {
    // Identical hole cards force a tie; uneven stacks force an odd pot.
    const t = createTable({ numSeats: 2, stackChips: 10, sb: 0.1, bb: 0.2 });
    t.seats[1].stack = 9.99;
    postBlinds(t, 0, 1); // actor = seat 0 = hero
    const hooks = instantHooks({
      heroSeat: 0,
      // : defesa precisa de XRFI — RFI puro folda até p/ KQs.
      villainRange: () => ({ rfi: new Map([['KQs', ['OR']]]), xrfi: new Map([['KQs', ['CALL']]]) }),
      holeLabel: () => 'KQs',
      holeCards: [['K♥', 'Q♣'], ['K♥', 'Q♣']],
      waitHero: async () => ({ token: 'ALL-IN', size: null }),
    });
    const res = await runPreflop(t, hooks);
    expect(res.reason).toBe('allin-runout');
    expect(res.winners).toEqual([0, 1]);
    // Pot 19.99 = 1999 cents → 1000 + 999, first contender gets the odd cent.
    expect(t.seats[0].stack).toBe(10);
    expect(t.seats[1].stack).toBe(9.99);
    for (const s of t.seats) expect(Number.isInteger(s.stack * 100)).toBe(true);
    // Display-side sums can still show binary dust — the display path trims it.
    expect(fmtChips(t.seats[0].stack + t.seats[1].stack)).toBe('19.99');
  });

  it('emits turn/action events with seats, tokens and sizes (read-only feed)', async () => {
    const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
    postBlinds(t, 0, 1); // actor = seat 2 = hero
    const events = [];
    const hooks = instantHooks({
      villainRange: () => ({ rfi: new Map(), xrfi: new Map([['72o', ['CALL']]]) }),
      holeLabel: () => '72o',
      waitHero: async () => ({ token: 'OR', size: null }), // 2.5bb = 50
      onEvent: (e) => events.push(e),
    });
    const res = await runPreflop(t, hooks);
    expect(res.reason).toBe('to-postflop');
    expect(events[0]).toEqual({ type: 'turn', seat: 2 });
    expect(events[1]).toEqual({ type: 'action', seat: 2, token: 'OR', size: 50, allIn: false });
    const calls = events.filter(e => e.type === 'action' && e.token === 'CALL');
    expect(calls.map(c => [c.seat, c.size])).toEqual([[0, 40], [1, 30]]);
  });
});
