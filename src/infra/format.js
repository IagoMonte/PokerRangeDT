// Money display: engine values are cent-quantized, so this only trims
// representation ("20" not "20.00", "0.3" not "0.30000000000000004").
// Never use for math — formatting is the last step before the template.
export function fmtChips(n) {
    if (typeof n !== 'number' || !Number.isFinite(n)) return '–';
    return String(Number(n.toFixed(2)));
}

// Board { rank, suit } letters (board.js scheme) → dealer string for
// CardComponent ("A♥"): exact inverse of preflop toBoardCard.
const LETTER_TO_SUIT = { h: '♥', s: '♠', c: '♣', d: '♦' };
export function boardToDealer({ rank, suit }) {
    return `${rank}${LETTER_TO_SUIT[suit] || suit}`;
}
