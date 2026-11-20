/**
 * Postflop engine: COORDINATES (same contract shape as runPreflop).
 * Per街 decision chain per acting seat — own hole cards + own profile only:
 *
 *   bucketForHand(hole, board) → texture → SPR/risk → calculateDecisionScore
 *   → mapScoreToAction → calculateBetSize → CHECK / CALL / FOLD / raise-to
 *
 * Free actions never fold: toCall == 0 maps FOLD/CALL to CHECK.
 * Missed draws are air on the river (no cards to come → outs count 0).
 *
 * runPostflop(table, hooks) continues a keepStakes to-postflop table:
 *   flop betting → turn → betting → river → betting → showdown.
 * Street money is banked via collectPots at every close (main + side pots,
 * folded seats contribute dead money but stay ineligible).
 *
 * hooks: {
 *   heroSeat,
 *   board,            // flop as [{rank, suit}] (from the to-postflop result)
 *   holeCards,        // dealer strings per seat ([c1, c2], same as preflop)
 *   profileFor(seat), // OWN stats of the acting seat (never another villain's)
 *   waitHero(turn),   // { facing:'postflop', street, board, toCall, minRaiseTo, seat }
 *   onEvent(evt),     // turn/action like preflop + {type:'street', street, board}
 *   sleep, villainDelayMs,
 *   scoreOverrides?, sizingTable?,
 * }
 */
import {
    liveSeats, activeSeats, toCall, minRaiseTo, potTotal,
    applyFold, applyCall, applyCheck, applyRaiseTo, applyAllIn,
    isBettingClosed, refundUnmatched, collectPots, awardPot, nextActor,
    quantize, CENT, awardPotsByRank,
} from './table.js';
import { generateBoardCards, analyzeTexture } from './board.js';
import { bucketForHand, bucketFor } from './buckets.js';
import { calculateDecisionScore, mapScoreToAction, SCORE_CONFIG } from './score.js';
import { callEV, evToScore } from './ev.js';
import { heroEquity } from './heroEv.js';
import { calculateBetSize } from './sizing.js';
import { evaluateHand, compareHands, describeHand } from './showdown.js';
import { toBoardCard } from './preflop.js';

const STREETS = ['flop', 'turn', 'river'];

/**
 * One postflop decision for one seat. Pure: no table mutation.
 * @returns {{ handClass, outs, draws, bucket, texture, score, action, fraction }}
 *   action: 'CHECK' | 'CALL' | 'FOLD' | 'RAISE'; fraction: pot fraction or null.
 */
export function decidePostflop(
    { hole, board, pot, risk, stack, profile, street = 'flop', scoreOverrides, sizingTable },
) {
    // No cards to come: a missed draw is just air (never upgrade the bucket).
    const { handClass, outs: liveOuts, draws } = bucketForHand(hole, board);
    const outs = street === 'river' ? 0 : liveOuts;
    const bucket = street === 'river' ? bucketFor(handClass, 0) : bucketFor(handClass, liveOuts);
    const texture = analyzeTexture(board);
    const spr = pot > 0 ? stack / pot : stack;
    const score = calculateDecisionScore(
        { bucket, pot, risk, spr, villainProfile: profile, boardTexture: texture, outs, street },
        scoreOverrides,
    );
    let action = mapScoreToAction(score);
    let fraction = null;
    if (risk === 0) {
        // Nothing to call: only aggression costs chips. Never fold for free.
        // Bet two pair and overpair for value; keep checking top pair.
        if (action !== 'RAISE' && street === 'river' &&
            (handClass === 'TWO_PAIR' || handClass === 'OVERPAIR')) {
            action = 'RAISE';
        }
        if (action === 'RAISE') fraction = calculateBetSize(score, texture, sizingTable);
        else action = 'CHECK';
    } else if (action === 'RAISE') {
        fraction = calculateBetSize(score, texture, sizingTable);
    }
    // Return EV details for decision logging; they do not affect the action.
    const equity = heroEquity({ bucket, outs, street });
    const evCall = callEV(equity, pot, risk);
    const evCap = scoreOverrides?.evCall?.cap ?? SCORE_CONFIG.evCall?.cap ?? 10;
    const evBonus = risk > 0 && outs > 0 ? evToScore(evCall, pot + risk, evCap) : 0;
    return { handClass, outs, draws, bucket, texture, score, action, fraction, ev: { equity, evCall, evBonus } };
}

// Hero decisions arrive as UI tokens ({token, size}); normalize to table ops.
// Free actions never fold: FOLD/CALL with nothing to call become CHECK
// (covers the timeout-fold too — no folding for free).
export function normalizeHeroDecision(raw, toCallChips) {
    const token = raw?.token ?? null;
    if (token === 'CHECK' || token === null || token === undefined) {
        return toCallChips > 0 ? { op: 'FOLD' } : { op: 'CHECK' };
    }
    if (token === 'FOLD') return toCallChips > 0 ? { op: 'FOLD' } : { op: 'CHECK' };
    if (token === 'CALL' || token === 'LIMP') return toCallChips > 0 ? { op: 'CALL' } : { op: 'CHECK' };
    if (token === 'ALL-IN') return { op: 'ALL-IN' };
    // Any raise token carries absolute raise-to chips (the buttons convert).
    return { op: 'RAISE', size: raw.size };
}

// Pot-fraction raise → absolute raise-to chips, clamped [min-raise, stack].
// Mirrors preflop pctToChips: currentBet + toCall + fraction × FULL pot.
export function raiseToChips(table, seat, fraction) {
    const pot = potTotal(table);
    const raw = table.currentBet + toCall(table, seat) + fraction * pot;
    const maxReachable = table.seats[seat].committed + table.seats[seat].stack;
    return Math.min(Math.max(raw, minRaiseTo(table)), maxReachable);
}

function applyOp(table, seat, op) {
    switch (op.op) {
        case 'FOLD': return applyFold(table, seat);
        case 'CHECK': return applyCheck(table, seat);
        case 'CALL': return applyCall(table, seat);
        case 'ALL-IN': return applyAllIn(table, seat);
        case 'RAISE': return applyRaiseTo(table, seat, op.size);
        default: throw new Error(`postflop: unknown op "${op.op}"`);
    }
}

function showdown(table, board, holeCards) {
    refundUnmatched(table);
    table.banked.push(...collectPots(table));
    const pots = table.banked;
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
    awardPotsByRank(table, pots, evs, compareHands);
    table.banked = [];
    return { reason: 'postflop-showdown', winners, pots, board: [...board], handName: describeHand(best.ev) };
}

function awardAll(table, winner) {
    table.banked.push(...collectPots(table));
    const pots = table.banked;
    pots.forEach((p, i) => awardPot(table, i, pots, winner));
    table.banked = [];
    return pots;
}

/**
 * Drives flop → turn → river → showdown on a keepStakes to-postflop table.
 * Banks each street with collectPots; deals turn/river excluding known holes.
 */
export async function runPostflop(table, hooks) {
    const { heroSeat, holeCards, profileFor } = hooks;
    const sleep = hooks.sleep || ((ms) => new Promise(r => setTimeout(r, ms)));
    const villainDelayMs = hooks.villainDelayMs ?? 0;
    const holeBoard = (seat) => (holeCards[seat] || []).map(toBoardCard);
    const knownHole = [];
    for (const cards of holeCards || []) {
        if (cards) for (const c of cards) knownHole.push(toBoardCard(c));
    }

    let board = [...(hooks.board || [])];
    const bankedTotal = () => (table.banked || []).reduce((n, p) => n + p.amount, 0);

    const newStreet = () => {
        table.currentBet = 0;
        table.lastIncrement = table.bb;
        table.aggression = null;
        for (const i of liveSeats(table)) {
            if (!table.seats[i].allIn) table.seats[i].acted = false;
        }
        // Primeiro a agir: o SB, ou o próximo ativo à esquerda dele (botão age por último).
        const act = new Set(activeSeats(table));
        const n = table.seats.length;
        const start = table.sbSeat ?? 0;
        let first = -1;
        for (let k = 0; k < n && first < 0; k++) {
            const i = (start + k) % n;
            if (act.has(i)) first = i;
        }
        table.actor = first;
    };

    // Bank the preflop action: postflop betting starts clean every street.
    // Banked pots live on the table so the display reads the full pot.
    table.banked.push(...collectPots(table));
    newStreet();

    // Sem aposta possível — ninguém (ou só um) com fichas contra all-in(s):
    // corre o resto do board e decide no showdown, sem pedir ação.
    // Vale na entrada da rua (herói pagou o shove) e no fecha-rua.
    const runout = () => {
        const need = 5 - board.length;
        if (need > 0) board.push(...generateBoardCards(need, [...knownHole, ...board]));
        return { ...showdown(table, board, holeCards), reason: 'postflop-runout' };
    };

    for (let s = 0; s < STREETS.length; s++) {
        const street = STREETS[s];
        if (activeSeats(table).length <= 1) return runout();

        for (;;) {
            const live = liveSeats(table);
            if (live.length === 1) {
                refundUnmatched(table);
                const pots = awardAll(table, live[0]);
                return { reason: 'everyone-folded', winner: live[0], pots };
            }
            if (isBettingClosed(table)) break;

            const seat = table.actor;
            const tc = toCall(table, seat);
            hooks.onEvent?.({ type: 'turn', seat });
            let op;
            let applied;
            if (seat === heroSeat) {
                const raw = await hooks.waitHero({
                    facing: 'postflop', street, board: [...board],
                    toCall: tc, minRaiseTo: minRaiseTo(table), seat,
                });
                op = normalizeHeroDecision(raw, tc);
                const heroPays = quantize(Math.min(tc, table.seats[seat].stack));
                applied = applyOp(table, seat, op);
                hooks.onEvent?.({
                    type: 'action', seat, token: op.op === 'RAISE' ? 'RAISE' : op.op,
                    size: op.op === 'RAISE' ? quantize(table.seats[seat].committed) : op.op === 'CALL' ? heroPays : null,
                    allIn: table.seats[seat].allIn,
                });
            } else {
                if (villainDelayMs > 0) await sleep(villainDelayMs);
                const d = decidePostflop({
                    hole: holeBoard(seat),
                    board,
                    pot: potTotal(table),
                    risk: tc,
                    stack: table.seats[seat].stack,
                    profile: profileFor(seat),
                    street,
                    scoreOverrides: hooks.scoreOverrides,
                    sizingTable: hooks.sizingTable,
                });
                if (d.action === 'RAISE') {
                    op = { op: 'RAISE', size: raiseToChips(table, seat, d.fraction) };
                } else {
                    op = { op: d.action };
                }
                // CALL anuncia o efetivamente pago (stack curto paga menos que o to-call).
                const preCall = op.op === 'CALL' ? quantize(Math.min(tc, table.seats[seat].stack)) : null;
                applied = applyOp(table, seat, op);
                hooks.onEvent?.({
                    type: 'action', seat, token: op.op,
                    size: op.op === 'RAISE' ? quantize(table.seats[seat].committed) : preCall, // raise-to efetivo (quantizado, limitado ao stack)
                    allIn: table.seats[seat].allIn,
                });
            }
            void applied;
            const n = nextActor(table);
            if (n >= 0) table.actor = n;
        }

        // Street closed. Nobody left to act → run out the rest, then showdown.
        if (activeSeats(table).length === 0) return runout();
        refundUnmatched(table);
        table.banked.push(...collectPots(table));
        if (s === STREETS.length - 1) break;
        board.push(...generateBoardCards(1, [...knownHole, ...board]));
        hooks.onEvent?.({ type: 'street', street: STREETS[s + 1], board: [...board] });
        newStreet();
    }

    return showdown(table, board, holeCards);
}
