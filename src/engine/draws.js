/**
 * Draw / outs logic (postflop brain input).
 * Counts UNIQUE one-card outs to a flush or straight by enumerating the
 * unseen deck, so combo draws never double-count a card that completes both.
 * Backdoors (flop only, need two cards) count ~1 out each: real enough to
 * exist, too small to upgrade a bucket on their own.
 *
 * Card scheme: { rank: '2'..'T'|'J'|'Q'|'K'|'A', suit: 's'|'h'|'d'|'c' }.
 */

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS = ['s', 'h', 'd', 'c'];
const RANK_VAL = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

export const DRAW_TYPES = {
    FLUSH_DRAW: 'FLUSH_DRAW',       // 4 to a flush → 9 outs
    OESD: 'OESD',                   // open-ender → 8 outs
    GUTSHOT: 'GUTSHOT',             // one interior card → 4 outs
    DOUBLE_BELLY: 'DOUBLE_BELLY',   // two gutshots (non-consecutive gaps) → 8 outs
    BACKDOOR_FLUSH: 'BACKDOOR_FLUSH',
    BACKDOOR_STRAIGHT: 'BACKDOOR_STRAIGHT',
    COMBO_DRAW: 'COMBO_DRAW',       // flush draw + straight draw at once
};

function hasFlush(cards) {
    const counts = {};
    for (const c of cards) counts[c.suit] = (counts[c.suit] || 0) + 1;
    return Object.values(counts).some(n => n >= 5);
}

function hasStraight(cards) {
    const uniq = [...new Set(cards.map(c => RANK_VAL[c.rank]))].sort((a, b) => a - b);
    if (uniq.length < 5) return false;
    for (let i = 0; i <= uniq.length - 5; i++) {
        if (uniq[i + 4] - uniq[i] === 4) return true;
    }
    return uniq.includes(14) && uniq.includes(2) && uniq.includes(3) && uniq.includes(4) && uniq.includes(5);
}

// One card completes a straight here (used to label WHICH ranks are outs).
function completesStraight(known, rank) {
    return hasStraight([...known, { rank, suit: 'x' }]);
}

/**
 * @param {Array} holeCards - [{rank, suit} x2]
 * @param {Array} board - [{rank, suit} x3-5]
 * @returns {{ outs: number, draws: string[] }}
 */
export function countOuts(holeCards, board) {
    const known = [...(holeCards || []), ...(board || [])];
    const knownKeys = new Set(known.map(c => c.rank + c.suit));
    const madeFlush = hasFlush(known);
    const madeStraight = hasStraight(known);
    if (madeFlush && madeStraight) return { outs: 0, draws: [] };

    let flushOuts = 0;
    const straightRanks = new Set();
    for (const rank of RANKS) {
        for (const suit of SUITS) {
            if (knownKeys.has(rank + suit)) continue;
            const card = { rank, suit };
            if (!madeFlush && hasFlush([...known, card])) flushOuts++;
            if (!madeStraight && completesStraight(known, rank) && !straightRanks.has(rank)) {
                // Count unseen suits of this completing rank (blockers excluded).
                let suitsLeft = 0;
                for (const s of SUITS) {
                    if (!knownKeys.has(rank + s)) suitsLeft++;
                }
                if (suitsLeft > 0) straightRanks.add(rank);
            }
        }
    }
    // Unique outs: a card completing BOTH is one out, not two.
    // (Straight completion is rank-based; flush is suit-based.)
    const outKeys = new Set();
    for (const rank of RANKS) {
        for (const suit of SUITS) {
            if (knownKeys.has(rank + suit)) continue;
            const card = { rank, suit };
            const f = !madeFlush && hasFlush([...known, card]);
            const completesStraightReal = !madeStraight && straightRanks.has(rank);
            if (f || completesStraightReal) outKeys.add(rank + suit);
        }
    }

    const draws = [];
    const isFlushDraw = flushOuts > 0;
    if (isFlushDraw) draws.push(DRAW_TYPES.FLUSH_DRAW);

    // OESD = a 4-card consecutive run is already there (outs are its two
    // ends, e.g. 6-7-8-9 → {5,T}). Two completing ranks WITHOUT a 4-run
    // means two separate interior gaps (e.g. T,J,Q,K,A needs K or 9) → double belly.
    const vals = [...new Set(known.map(c => RANK_VAL[c.rank]))].sort((a, b) => a - b);
    let fourRun = false;
    for (let i = 0; i <= vals.length - 4; i++) {
        if (vals[i + 3] - vals[i] === 3) { fourRun = true; break; }
    }
    if (!fourRun && vals.includes(14) && vals.includes(2) && vals.includes(3) && vals.includes(4)) {
        fourRun = true; // A-2-3-4 needs the 5
    }
    const gapRanks = [...straightRanks].sort((a, b) => RANK_VAL[a] - RANK_VAL[b]);
    if (gapRanks.length >= 2) {
        draws.push(fourRun ? DRAW_TYPES.OESD : DRAW_TYPES.DOUBLE_BELLY);
    } else if (gapRanks.length === 1) {
        draws.push(DRAW_TYPES.GUTSHOT);
    }

    if (isFlushDraw && gapRanks.length > 0) draws.push(DRAW_TYPES.COMBO_DRAW);

    let outs = outKeys.size;

    // Backdoors: flop only, two cards away → ~1 out each. Never upgrades alone.
    if ((board || []).length === 3 && outs === 0) {
        const suitCounts = {};
        for (const c of known) suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
        if (Object.values(suitCounts).some(n => n === 3)) {
            draws.push(DRAW_TYPES.BACKDOOR_FLUSH);
            outs += 1;
        }
        const vals = [...new Set(known.map(c => RANK_VAL[c.rank]))].sort((a, b) => a - b);
        let nearStraight = false;
        for (let i = 0; i <= vals.length - 3; i++) {
            if (vals[i + 2] - vals[i] <= 4) { nearStraight = true; break; }
        }
        if (!nearStraight && vals.includes(14) && vals.includes(2) && vals.includes(3)) nearStraight = true;
        if (nearStraight) {
            draws.push(DRAW_TYPES.BACKDOOR_STRAIGHT);
            outs += 1;
        }
    }

    return { outs, draws };
}
