/**
 * Hero preflop grader: painted line is the answer key (no EV math preflop).
 * Pure: raw token arrays in, verdict out. The caller reads the raw painted
 * line (no stat trim) and maps the hero UI token.
 *
 * In-line action → null (silence: correct play makes no noise).
 * Off-line action → { verdict: 'minus', chosen, line } for the notify.
 * No forgiveness: a free fold off the line still punishes (CHECK was free).
 */

// Aggression token per facing (mirrors FACING_TO_AGGRO in useActions;
// hero raise buttons already resolve to these, ALL-IN passes through).
const AGGRO = { none: 'OR', open: '3B', '3b': '4B', '4b': 'ALL-IN' };

function has(line, t) {
  return Array.isArray(line) && line.includes(t);
}

/**
 * Expected line tokens for a facing, mirroring decideVillainAction.
 * CHECK is appended when free (toCall == 0): no paintable token exists
 * for it, and passing for free is never wrong.
 */
export function expectedPreflopLine({ rfiLine, xrfiLine, facing, toCall = 0, bb = 0, xrfiCallCap = null }) {
  let set;
  if (facing === 'none') {
    // Espelha decideVillainAction: first-in joga o ABRIDOR (OR, senão
    // LIMP, senão ALL-IN puro) — ALL-IN no meio da linha é resposta
    // (vs 3b/4b), não open-shove.
    if (has(rfiLine, 'OR')) set = ['OR'];
    else if (has(rfiLine, 'LIMP')) set = ['LIMP'];
    else if (has(rfiLine, 'ALL-IN')) set = ['ALL-IN'];
    else set = ['FOLD'];
  } else if (facing === 'open') {
    // Re-raises take precedence; calls above the configured cap fold.
    if (has(xrfiLine, '3B')) set = ['3B'];
    else if (has(xrfiLine, 'ALL-IN')) set = ['ALL-IN'];
    else if (has(xrfiLine, 'CALL')) {
      const over = xrfiCallCap != null && Number(bb) > 0 && (toCall / Number(bb)) > xrfiCallCap;
      set = [over ? 'FOLD' : 'CALL'];
    } else set = ['FOLD'];
  } else if (facing === '3b') {
    if (has(rfiLine, '4B')) set = ['4B'];
    else if (has(rfiLine, 'ALL-IN')) set = ['ALL-IN'];
    else if (has(rfiLine, 'CALL')) set = ['CALL'];
    else set = ['FOLD'];
  } else {
    // facing 4b — espelha decideVillainAction (H14a): sem instrução → FOLD.
    if (has(rfiLine, 'ALL-IN') || has(xrfiLine, 'ALL-IN')) set = ['ALL-IN'];
    else if (has(xrfiLine, 'CALL')) set = ['CALL'];
    else if (has(rfiLine, '4B') && has(rfiLine, 'CALL')) set = ['CALL'];
    else set = ['FOLD'];
  }
  if (toCall <= 0) {
    // Grátis: FOLD sai do esperado (fold grátis sempre pune — CHECK era
    // grátis) e CHECK entra (sem token pintável p/ ele, nunca é erro).
    set = set.filter((t) => t !== 'FOLD');
    if (!set.includes('CHECK')) set.push('CHECK');
  }
  return set;
}

/**
 * @param {Object} p - { heroToken, rfiLine, xrfiLine, facing, toCall, bb, xrfiCallCap }
 * @returns null when in-line (silence) or { verdict:'minus', chosen, line }
 */
export function gradePreflopLine({ heroToken, rfiLine, xrfiLine, facing, toCall = 0, bb = 0, xrfiCallCap = null }) {
  const line = expectedPreflopLine({ rfiLine, xrfiLine, facing, toCall, bb, xrfiCallCap });
  if (line.includes(heroToken)) return null;
  return { verdict: 'minus', chosen: heroToken, line };
}

export { AGGRO as PREFLOP_AGGRO };
