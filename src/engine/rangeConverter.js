import { RANKS, SUITS } from '../constants/poker.js';
import { getCardId, getComboId, getCardsFromComboId, rangeOps } from './bitmask.js';

const RANK_TO_IDX = Object.fromEntries(RANKS.map((r, i) => [r, i]));

/**
 * Converts a single hand label (e.g., 'AKs', 'AKo', 'AA') to a bitmask.
 * @param {string} label
 * @returns {bigint}
 */
export function labelToMask(label) {
    let mask = 0n;
    const isSuited = label.endsWith('s');
    const isOffsuit = label.endsWith('o');
    const ranksPart = isSuited || isOffsuit ? label.slice(0, -1) : label;

    if (ranksPart.length !== 2) return 0n;
    const r1 = ranksPart[0], r2 = ranksPart[1];
    const r1Idx = RANK_TO_IDX[r1], r2Idx = RANK_TO_IDX[r2];

    if (r1 === r2) {
        // Pair: all combinations of the same rank
        for (let s1 = 0; s1 < 4; s1++) {
            for (let s2 = s1 + 1; s2 < 4; s2++) {
                mask = rangeOps.setCombo(mask, getComboId(getCardId(r1Idx, s1), getCardId(r1Idx, s2)));
            }
        }
    } else {
        for (let s1 = 0; s1 < 4; s1++) {
            for (let s2 = 0; s2 < 4; s2++) {
                const c1 = getCardId(r1Idx, s1);
                const c2 = getCardId(r2Idx, s2);
                if (s1 === s2) {
                    if (isSuited || (!isSuited && !isOffsuit)) {
                        mask = rangeOps.setCombo(mask, getComboId(c1, c2));
                    }
                } else if (isOffsuit || (!isSuited && !isOffsuit)) {
                    mask = rangeOps.setCombo(mask, getComboId(c1, c2));
                }
            }
        }
    }
    return mask;
}

/**
 * Converts a range string (e.g., "JJ+, AKs, AQs") to a bitmask.
 * @param {string} rangeStr 
 * @returns {bigint}
 */
export function rangeToMask(rangeStr) {
    let mask = 0n;
    const parts = rangeStr.split(',').map(p => p.trim());
    
    for (const part of parts) {
        if (part.includes('+')) {
            const [base, plus] = part.split('+');
            if (base.length === 2 && base[0] === base[1]) {
                // Pair range: TT+
                const baseRank = base[0];
                const baseVal = RANK_VALUES[baseRank];
                for (let v = baseVal; v <= 14; v++) {
                    mask = rangeOps.union(mask, labelToMask(VALUE_TO_RANK[v] + VALUE_TO_RANK[v]));
                }
            }
        } else {
            mask = rangeOps.union(mask, labelToMask(part));
        }
    }
    return mask;
}

/**
 * Converts a bitmask back to a list of labels.
 * @param {bigint} mask 
 * @returns {string[]}
 */
export function maskToLabels(mask) {
    const labels = new Set();
    for (let i = 0; i < 1326; i++) {
        if (rangeOps.contains(mask, i)) {
            const [c1, c2] = getCardsFromComboId(i);
            const r1Idx = Math.floor(c1 / 4);
            const r2Idx = Math.floor(c2 / 4);
            const s1 = c1 % 4;
            const s2 = c2 % 4;
            
            const rank1 = RANKS[r1Idx];
            const rank2 = RANKS[r2Idx];
            
            if (rank1 === rank2) {
                labels.add(rank1 + rank2);
            } else if (s1 === s2) {
                // We don't know if the whole suited range is there, 
                // just that THIS combo is. We'll return it as 'XYs' for now
                // and the UI can aggregate it.
                const sorted = [rank1, rank2].sort((a, b) => RANK_VALUES[b] - RANK_VALUES[a]);
                labels.add(sorted[0] + sorted[1] + 's');
            } else {
                const sorted = [rank1, rank2].sort((a, b) => RANK_VALUES[b] - RANK_VALUES[a]);
                labels.add(sorted[0] + sorted[1] + 'o');
            }
        }
    }
    return Array.from(labels);
}
