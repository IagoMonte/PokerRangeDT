/**
 * Preflop engine: COORDINATES. The table (table.js) executes, the drill
 * configures. Villain brain is deterministic: bluff% widens the range at
 * build time (getModRange), never at decision time.
 *
 * runPreflop(table, hooks) drives turn order until:
 *   everyone-folded → last live seat takes the pots
 *   to-postflop     → betting closed, 2+ live → v1: stakes refunded, notify only
 *                     (hooks.keepStakes: stakes stay live, runPostflop continues)
 *   allin-runout    → all live all-in → flop+turn+river, exact 7-card
 *                     showdown wins (best 5 of 7 + kickers; ties split)
 */
import {
    liveSeats, toCall, minRaiseTo, facing, potTotal, CENT, quantize, awardPotsByRank,
    applyFold, applyCall, applyCheck, applyLimp, applyRaiseTo, applyAllIn,
    isBettingClosed, refundUnmatched, refundAll, collectPots, awardPot, nextActor,
} from './table.js';
import { generateBoardCards } from './board.js';
import { evaluateHand, compareHands, describeHand } from './showdown.js';
import { callCapToBb } from '../composables/useActions.js';

// Pure villain brain: label + range lines + facing → token. No randomness.
// Facing owns the map: none reads RFI, open reads XRFI ONLY (RFI presence
// is not a defense instruction — an opener ahead means we are not
// first-in, so RFI-only hands fold), 3b reads RFI responses,
// 4b reads both (any map holds the call). LIMP never comes from slider
// ranges — only from the user's painted line ("se o usuario colocou ou nao
// é problema dele").
// "CALL N" is a cap in bb (ctx.callCapBb): over the cap the call folds.
// ctx.toCallBb null (residual inversion) = no cap enforcement.
// First-in plays the OPENER (OR, else LIMP, else ALL-IN): a painted line
// is a sequence across facings (OR → 4B vs 3-bet → ALL-IN vs 4-bet), so
// ALL-IN anywhere in the line must not open-shove — only a line with no
// other opener does (pure open-shove range).
export function decideVillainAction(label, rfiLine, xrfiLine, face, ctx = {}) {
    if (face === 'none') {
        if (rfiLine && rfiLine.includes('OR')) return 'OR';
        if (rfiLine && rfiLine.includes('LIMP')) return 'LIMP';
        if (rfiLine && rfiLine.includes('ALL-IN')) return 'ALL-IN';
        return 'FOLD';
    }
    if (face === 'open') {
        // SPEC (30/09): vs open a XRFI decide sozinha — "3B ALL-IN" 3-beta
        // (raise, nunca jam; o ALL-IN é resposta vs 4-bet) e RFI sem XRFI
        // folda (o CALL do RFI é resposta vs 3-bet, não defesa vs open).
        if (xrfiLine && xrfiLine.includes('3B')) return '3B';
        if (xrfiLine && xrfiLine.includes('ALL-IN')) return 'ALL-IN';
        if (xrfiLine && xrfiLine.includes('CALL')) {
            const { toCallBb, callCapBb } = ctx;
            if (callCapBb != null && toCallBb != null && toCallBb > callCapBb) return 'FOLD';
            return 'CALL';
        }
        return 'FOLD';
    }
    if (face === '3b') {
        if (rfiLine && rfiLine.includes('4B')) return '4B';
        if (rfiLine && rfiLine.includes('ALL-IN')) return 'ALL-IN';
        if (rfiLine && rfiLine.includes('CALL')) return 'CALL';
        return 'FOLD';
    }
    // facing 4b
    // H14a: sem instrução vs 4b+ → FOLD. ALL-IN em qualquer mapa shova;
    // CALL do XRFI sustenta ("3B CALL"); CALL do RFI só com 4B junto
    // ("OR 4B CALL") — "OR CALL" puro folda (98s/66 não veem flop de 4b).
    if ((rfiLine && rfiLine.includes('ALL-IN')) || (xrfiLine && xrfiLine.includes('ALL-IN'))) return 'ALL-IN';
    if (xrfiLine && xrfiLine.includes('CALL')) return 'CALL';
    if (rfiLine && rfiLine.includes('4B') && rfiLine.includes('CALL')) return 'CALL';
    return 'FOLD';
}

// Default villain sizings in chips (hero sizes come from the slider).
export function defaultSize(table, token) {
    if (token === 'OR') return 2.5 * table.bb;
    if (token === '3B') return Math.max(minRaiseTo(table), 3 * table.currentBet);
    if (token === '4B') return Math.max(minRaiseTo(table), 2.5 * table.currentBet);
    throw new Error(`preflop: no default size for "${token}"`);
}

// Hero slider pct → raise-to in chips. KISS: call + pct of the FULL pot.
export function pctToChips(table, seat, pct) {
    const pot = potTotal(table);
    const raiseTo = table.currentBet + toCall(table, seat) + (pct / 100) * pot;
    const maxReachable = table.seats[seat].committed + table.seats[seat].stack;
    return Math.min(Math.max(raiseTo, minRaiseTo(table)), maxReachable);
}

// Dealer strings ("A♥", "TD") → { rank, suit } in board.js letter scheme.
const SUIT_TO_LETTER = { '♥': 'h', '♠': 's', '♣': 'c', '♦': 'd', h: 'h', s: 's', c: 'c', d: 'd' };
export function toBoardCard(card) {
    return { rank: card[0], suit: SUIT_TO_LETTER[card[1]] || card[1] };
}

function applyToken(table, seat, token, size) {
    switch (token) {
        case 'FOLD': return applyFold(table, seat);
        case 'CHECK': return applyCheck(table, seat);
        case 'CALL': return applyCall(table, seat);
        case 'LIMP': return applyLimp(table, seat);
        case 'OR': return applyRaiseTo(table, seat, size ?? defaultSize(table, 'OR'));
        case '3B': return applyRaiseTo(table, seat, size ?? defaultSize(table, '3B'));
        case '4B': return applyRaiseTo(table, seat, size ?? defaultSize(table, '4B'));
        case 'ALL-IN': return applyAllIn(table, seat);
        default: throw new Error(`preflop: unknown token "${token}"`);
    }
}

function runoutWinners(table, holeCards) {
    const known = [];
    for (const cards of holeCards) {
        if (cards) for (const c of cards) known.push(toBoardCard(c));
    }
    const board = generateBoardCards(5, known);
    const live = liveSeats(table);
    // Exact Texas showdown: best 5 of 7 with kickers; only identical
    // five-card hands split (suits and unused cards never count).
    const evs = live.map(seat => ({
        seat,
        ev: evaluateHand(holeCards[seat].map(toBoardCard), board),
    }));
    let best = evs[0];
    for (const e of evs) {
        if (compareHands(e.ev, best.ev) > 0) best = e;
    }
    const winners = evs.filter(e => compareHands(e.ev, best.ev) === 0).map(e => e.seat);
    return { board, winners, evs, handName: describeHand(best.ev) };
}

/**
 * hooks: {
 *   heroSeat,                       // index into table.seats
 *   villainRange(role) -> { rfi: Map, xrfi: Map, xrfiCaps?: Map },
 *     // xrfiCaps: label → { value, unit } ("CALL N" pintado; sem teto = sem gate)
 *   seatRole(seat) -> role string,
 *   holeLabel(seat) -> 'AKs' | null,
 *   holeCards -> Array of [c1, c2] dealer strings per seat (runout only),
 *   waitHero(turn) -> Promise<{ token, size }>,  // UI resolves, timeout folds
 *   onEvent(evt) -> void,  // UI choreography feed (read-only):
 *                          // {type:'turn', seat} before each decision,
 *                          // {type:'action', seat, token, size, allIn} after apply
 *   sleep(ms) -> Promise (default setTimeout; tests inject instant),
 *   villainDelayMs = 0,
 * }
 */
export async function runPreflop(table, hooks) {
    const { heroSeat, villainRange, seatRole, holeLabel, waitHero } = hooks;
    const sleep = hooks.sleep || ((ms) => new Promise(r => setTimeout(r, ms)));
    const villainDelayMs = hooks.villainDelayMs ?? 0;

    for (;;) {
        const live = liveSeats(table);
        if (live.length === 1) {
            refundUnmatched(table);
            const pots = collectPots(table);
            pots.forEach((p, i) => awardPot(table, i, pots, live[0]));
            return { reason: 'everyone-folded', winner: live[0], pots };
        }
        if (isBettingClosed(table)) {
            if (live.every(i => table.seats[i].allIn)) {
                refundUnmatched(table);
                const pots = collectPots(table);
                const { board, winners, evs } = runoutWinners(table, hooks.holeCards);
                awardPotsByRank(table, pots, evs, compareHands);
                return { reason: 'allin-runout', winners, pots, board };
            }
            // v1: postflop is notify-only — stakes go back, hand voids…
            // …unless the caller drives postflop (hooks.keepStakes): then the
            // committed chips stay live and the flop below starts real betting.
            const known = [];
            for (const cards of hooks.holeCards || []) {
                if (cards) for (const c of cards) known.push(toBoardCard(c));
            }
            if (!hooks.keepStakes) refundAll(table);
            return { reason: 'to-postflop', live, board: generateBoardCards(3, known) };
        }

        const seat = table.actor;
        const face = facing(table);
        hooks.onEvent?.({ type: 'turn', seat });
        let decision;
        if (seat === heroSeat) {
            decision = await waitHero({
                facing: face,
                toCall: toCall(table, seat),
                minRaiseTo: minRaiseTo(table),
                seat,
            });
        } else {
            if (villainDelayMs > 0) await sleep(villainDelayMs);
            const range = villainRange(seatRole(seat));
            const label = holeLabel(seat);
            const line = label ? range.rfi.get(label) : undefined;
            const xrLine = label ? range.xrfi.get(label) : undefined;
            const inXrfi = xrLine !== undefined;
            // Teto "CALL N": toCall em bb vs cap (sem teto/aporte = sem gate).
            const tc = toCall(table, seat);
            const rawCap = label ? range.xrfiCaps?.get(label) : undefined;
            const token = decideVillainAction(label, line, xrLine, face, {
                toCallBb: tc / table.bb,
                callCapBb: rawCap ? callCapToBb(rawCap, table.bb) : null,
            });
            // Audit log: full decision context (the hero logs the same
            // shape in play.vue, so the console stream has zero blind seats).
            const sz = token === 'CALL' || token === 'LIMP' ? tc
                : token === 'OR' || token === '3B' || token === '4B' ? quantize(Math.min(defaultSize(table, token), table.seats[seat].committed + table.seats[seat].stack))
                : token === 'ALL-IN' ? quantize(table.seats[seat].committed + table.seats[seat].stack) : null;
            decision = { token, size: null }; // villains use defaultSize
        }
        const preCall = (decision.token === 'CALL' || decision.token === 'LIMP')
            ? quantize(Math.min(toCall(table, seat), table.seats[seat].stack))
            : null;
        const applied = applyToken(table, seat, decision.token, decision.size);
        // Action feed for the UI choreography (read-only: engine already applied).
        hooks.onEvent?.({
            type: 'action', seat, token: decision.token,
            size: decision.size ?? applied?.to ?? preCall,
            allIn: table.seats[seat].allIn,
        });
        const n = nextActor(table);
        if (n >= 0) table.actor = n;
    }
}
