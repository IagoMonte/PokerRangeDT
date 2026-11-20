/**
 * Table engine (pure, no Vue): the table EXECUTES. The preflop driver
 * coordinates, the drill configures. All money is cent-quantized
 * (integers for chip blinds, 2 decimals for micro blinds like 0.1/0.2):
 * every entry point rounds to cents, so float dust (0.1+0.2) never
 * accumulates and committed === currentBet comparisons always close.
 *
 * Seats: { stack, committed, folded, allIn, acted }
 * Aggression: null | { level: 'OR' | '3B' | '4B', seat }
 */

// Money precision: cents. Single choke point for float dust.
export const CENT = 100;
export function quantize(n) {
    return Math.round(n * CENT) / CENT;
}

export function createTable({ numSeats, stackChips, sb, bb }) {
    if (!Number.isInteger(numSeats) || numSeats < 2) {
        throw new Error(`table: need at least 2 seats (got ${numSeats})`);
    }
    return {
        sb,
        bb,
        seats: Array.from({ length: numSeats }, () => ({
            stack: quantize(stackChips),
            committed: 0,
            folded: false,
            allIn: false,
            acted: false,
        })),
        // Pots banked at street closes (postflop): { amount, eligible }.
        // The display and sizings always read committed + banked together.
        banked: [],
        currentBet: 0,
        lastIncrement: bb,
        aggression: null,
        actor: 0,
    };
}

export function liveSeats(table) {
    const out = [];
    for (let i = 0; i < table.seats.length; i++) {
        if (!table.seats[i].folded) out.push(i);
    }
    return out;
}

// Quem mostra no showdown: todo seat que não foldou. Perdedor sem all-in
// também mostra — "mucked" no HH de quem foi pago é estado impossível (mão 17).
export function showdownSeats(table) {
    return liveSeats(table);
}

export function activeSeats(table) {
    return liveSeats(table).filter(i => !table.seats[i].allIn);
}

function commit(table, seat, amount) {
    const s = table.seats[seat];
    const take = quantize(Math.min(amount, s.stack));
    s.stack = quantize(s.stack - take);
    s.committed = quantize(s.committed + take);
    if (s.stack <= 0) {
        s.stack = 0;
        s.allIn = true;
    }
    return take;
}

// Blinds go in before any action: SB/BB marked not-acted, action starts UTG
// (seat after BB). currentBet = biggest blind actually posted.
export function postBlinds(table, sbSeat, bbSeat) {
    // Pós-flop começa no SB e segue em ordem de mesa; o índice do assento não é a posição.
    table.sbSeat = sbSeat;
    commit(table, sbSeat, table.sb);
    commit(table, bbSeat, table.bb);
    table.currentBet = Math.max(table.seats[sbSeat].committed, table.seats[bbSeat].committed);
    table.lastIncrement = table.bb;
    table.aggression = null;
    table.actor = (bbSeat + 1) % table.seats.length;
    return table.actor;
}

// Drill só pós-flop: ninguém age no pré, então os blinds viram dinheiro morto no
// pote, disputável por todos os vivos (como committed, só SB e BB seriam elegíveis).
export function bankBlindsAsDeadMoney(table) {
    const amount = quantize(table.seats.reduce((n, s) => n + s.committed, 0));
    for (const s of table.seats) s.committed = 0;
    table.currentBet = 0;
    if (amount > 0) table.banked.push({ amount, eligible: liveSeats(table) });
}

export function toCall(table, seat) {
    return Math.max(0, table.currentBet - table.seats[seat].committed);
}

// Full pot: live street stakes + every banked street. Display and sizings
// read this — committed alone goes to 0 at every street close.
export function potTotal(table) {
    const live = table.seats.reduce((n, s) => n + s.committed, 0);
    const banked = (table.banked || []).reduce((n, p) => n + p.amount, 0);
    return quantize(live + banked);
}

export function minRaiseTo(table) {
    return table.currentBet + table.lastIncrement;
}

// Facing for the actions vocabulary: which aggression level is in front.
export function facing(table) {
    if (!table.aggression) return 'none';
    if (table.aggression.level === 'OR') return 'open';
    if (table.aggression.level === '3B') return '3b';
    return '4b';
}

export function applyFold(table, seat) {
    table.seats[seat].folded = true;
    table.seats[seat].acted = true;
}

// CHECK = dry pass: only legal with nothing to call. Postflop action that
// costs nothing; also the preflop BB option when it gets through untouched.
export function applyCheck(table, seat) {
    if (toCall(table, seat) !== 0) {
        throw new Error(`table: CHECK with ${toCall(table, seat)} to call (seat ${seat})`);
    }
    table.seats[seat].acted = true;
}

export function applyCall(table, seat) {
    commit(table, seat, toCall(table, seat));
    table.seats[seat].acted = true;
}

// LIMP = dry BB call: only legal with no aggression and currentBet == bb
// (SB completes, BB checks through, anyone open-limps). Anything else throws.
export function applyLimp(table, seat) {
    if (table.aggression || table.currentBet !== table.bb) {
        throw new Error(`table: LIMP is a dry BB call (current bet ${table.currentBet}, bb ${table.bb})`);
    }
    commit(table, seat, toCall(table, seat));
    table.seats[seat].acted = true;
}

// target = TOTAL chips the seat wants committed. Short all-ins commit what
// they have without reopening the betting (currentBet/aggression untouched).
export function applyRaiseTo(table, seat, target) {
    const s = table.seats[seat];
    const maxReachable = s.committed + s.stack;
    const goal = quantize(Math.min(target, maxReachable));
    const prevBet = table.currentBet;
    const increment = goal - prevBet;
    commit(table, seat, goal - s.committed);
    s.acted = true;
    if (s.allIn && increment < table.lastIncrement) {
        // All-in curto que passa da aposta: a maior aposta sobe (pagar é igualar o shove),
        // mas o min-raise não muda e não conta como raise cheio.
        if (goal > prevBet) {
            table.currentBet = goal;
            for (let i = 0; i < table.seats.length; i++) {
                const o = table.seats[i];
                if (i !== seat && !o.folded && !o.allIn && o.committed < goal) o.acted = false;
            }
        }
        return { fullRaise: false, to: s.committed };
    }
    if (increment < table.lastIncrement) {
        throw new Error(`table: raise to ${goal} below min ${minRaiseTo(table)} (current bet ${prevBet})`);
    }
    table.currentBet = goal;
    table.lastIncrement = increment;
    table.aggression = {
        level: !table.aggression ? 'OR' : table.aggression.level === 'OR' ? '3B' : '4B',
        seat,
    };
    for (let i = 0; i < table.seats.length; i++) {
        if (i !== seat && !table.seats[i].folded && !table.seats[i].allIn) {
            table.seats[i].acted = false;
        }
    }
    return { fullRaise: true, to: goal };
}

export function applyAllIn(table, seat) {
    const s = table.seats[seat];
    return applyRaiseTo(table, seat, s.committed + s.stack);
}

// Betting is closed when every non-folded, non-all-in seat acted and matched.
export function isBettingClosed(table) {
    for (const i of liveSeats(table)) {
        const s = table.seats[i];
        if (s.allIn) continue;
        if (!s.acted || s.committed !== table.currentBet) return false;
    }
    return true;
}

// Unmatched excess goes back: nobody can win chips nobody called.
export function refundUnmatched(table) {
    for (let i = 0; i < table.seats.length; i++) {
        let cap = 0;
        for (let j = 0; j < table.seats.length; j++) {
            if (j !== i) cap = Math.max(cap, table.seats[j].committed);
        }
        if (table.seats[i].committed > cap) {
            const back = quantize(table.seats[i].committed - cap);
            table.seats[i].committed = cap;
            table.seats[i].stack = quantize(table.seats[i].stack + back);
            if (table.seats[i].stack > 0) table.seats[i].allIn = false;
        }
    }
}

// v1 postflop is notify-only: hand voids, everybody gets stakes back.
// Only valid before anything banks (banked pots cannot be unattributed).
export function refundAll(table) {
    if ((table.banked || []).length > 0) {
        throw new Error('table: refundAll with banked pots (award them first)');
    }
    for (const s of table.seats) {
        s.stack = quantize(s.stack + s.committed);
        s.committed = 0;
    }
}

// Split committed chips into main + side pots. Folded seats contribute dead
// money but are never eligible.
export function collectPots(table) {
    const totals = table.seats.map(s => s.committed);
    const pots = [];
    let prev = 0;
    const levels = [...new Set(totals.filter(t => t > 0))].sort((a, b) => a - b);
    for (const level of levels) {
        const per = quantize(level - prev);
        const contributors = totals.filter(t => t >= level).length;
        const amount = quantize(per * contributors);
        const eligible = [];
        for (let i = 0; i < table.seats.length; i++) {
            if (!table.seats[i].folded && totals[i] >= level) eligible.push(i);
        }
        if (amount > 0) pots.push({ amount, eligible });
        prev = level;
    }
    for (const s of table.seats) s.committed = 0;
    return pots;
}

export function awardPot(table, potIndex, pots, winner) {
    table.seats[winner].stack = quantize(table.seats[winner].stack + pots[potIndex].amount);
}

// Showdown award: each pot goes to the best hand AMONG ITS ELIGIBLE seats, so
// an uncalled side pot (one eligible seat) always returns to that seat and a
// side pot between two non-winners still has a winner. Cent-exact split: odd
// cents go to the first contenders in seat order (no float dust in stacks).
// evs: [{ seat, ev }]; compare(a, b) > 0 when a beats b.
export function awardPotsByRank(table, pots, evs, compare) {
    for (const p of pots) {
        const field = evs.filter(e => p.eligible.includes(e.seat));
        if (field.length === 0) continue;
        let best = field[0];
        for (const e of field) if (compare(e.ev, best.ev) > 0) best = e;
        const contenders = field.filter(e => compare(e.ev, best.ev) === 0).map(e => e.seat);
        const totalCents = Math.round(p.amount * CENT);
        const shareCents = Math.floor(totalCents / contenders.length);
        let oddCents = totalCents - shareCents * contenders.length;
        for (const s of contenders) {
            table.seats[s].stack = quantize(
                table.seats[s].stack + shareCents / CENT + (oddCents-- > 0 ? 1 / CENT : 0)
            );
        }
    }
}

// Advance to the next seat that can act (skips folded/all-in).
export function nextActor(table) {
    for (let n = 1; n <= table.seats.length; n++) {
        const i = (table.actor + n) % table.seats.length;
        if (!table.seats[i].folded && !table.seats[i].allIn) {
            table.actor = i;
            return i;
        }
    }
    return -1;
}
