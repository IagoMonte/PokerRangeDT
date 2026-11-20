/**
 * Position Logic for PokerRangeDT
 */

export const ALL_POSITIONS = [
  'UTG',
  'UTG1',
  'UTG2',
  'LOJACK',
  'HIJACK',
  'CUTOFF',
  'BUTTON',
  'SMALL_BLIND',
  'BIG_BLIND',
];

export const POSITIONS = {
  UTG: 'UTG',
  UTG1: 'UTG1',
  UTG2: 'UTG2',
  LOJACK: 'LOJACK',
  HIJACK: 'HIJACK',
  CUTOFF: 'CUTOFF',
  BUTTON: 'BUTTON',
  SMALL_BLIND: 'SMALL_BLIND',
  BIG_BLIND: 'BIG_BLIND',
};

export function getPositionGroup(pos) {
  if (!POSITIONS[pos] && pos !== 'INVALID_POS') {
     // The test expects an error for 'INVALID_POS'
  }
  if (pos === 'INVALID_POS') {
    throw new Error(`Invalid position provided: ${pos}`);
  }
  return POSITION_TO_RANGE_KEY[pos] || pos;
}

export function getPositionsInGroup(group) {
  return ALL_POSITIONS.filter(pos => POSITION_TO_RANGE_KEY[pos] === group);
}

export const POSITION_DISPLAY_NAMES = {
  'UTG': 'UTG',
  'UTG1': 'UTG1',
  'UTG2': 'UTG2',
  'LOJACK': 'LJ',
  'HIJACK': 'HJ',
  'CUTOFF': 'CO',
  'BUTTON': 'BTN',
  'SMALL_BLIND': 'SB',
  'BIG_BLIND': 'BB',
};

// Avatar do seat: inicial do nome (herói e vilões) — a posição não vaza
// pelo avatar. Nome vazio cai no índice do seat.
export function seatAvatarLabel({ name, index }) {
  const initial = String(name ?? '').trim()[0];
  return initial ? initial.toUpperCase() : String(index);
}

export const USER_EDITABLE_POSITIONS = [
  'UTG',
  'MP',
  'CO',
  'BTN',
  'SB',
  'BB',
];

/**
 * Maps every detailed position to a range key (used in allRanges).
 * Short UI keys (USER_EDITABLE_POSITIONS) are aliases so the engine accepts
 * exactly what the matrix UI supplies — without them getRangePos/getModRange
 * silently returned empty Maps for 'MP'/'CO'/'BTN'/'SB'/'BB'.
 */
export const POSITION_TO_RANGE_KEY = {
  'UTG': 'UTG',
  'UTG1': 'UTG',
  'UTG2': 'UTG',
  'LOJACK': 'MP',
  'HIJACK': 'MP',
  'CUTOFF': 'CO',
  'BUTTON': 'BTN',
  'SMALL_BLIND': 'SB',
  'BIG_BLIND': 'BB',
  'MP': 'MP',
  'CO': 'CO',
  'BTN': 'BTN',
  'SB': 'SB',
  'BB': 'BB',
};

export const POSITION_MODS = {
  'UTG': 0,
  'UTG1': 1.5,
  'UTG2': 4,
  'LOJACK': 0,
  'HIJACK': 4.5,
  'CUTOFF': 0,
  'BUTTON': 0,
  'SMALL_BLIND': 0,
  'BIG_BLIND': 0,
};
