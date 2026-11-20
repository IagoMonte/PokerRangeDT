/**
 * src/engine/residual.js
 * 
 * Narrowing por ação: elimina mãos do range residual a cada decisão.
 * 
 * initResidual(modRange) → Set
 *   Union das chaves rfi ∪ xrfi
 * 
 * narrowPreflop(residual, modRange, facing, token) → Set
 *   Remove mãos onde decideVillainAction(label, rfiLine, xrfiLine, facing) ≠ token
 * 
 * narrowPostflop(residual, board, bucketed, op) → Set
 *   op: 'RAISE' | 'CALL' | 'CHECK' | 'FOLD'
 *   Filtra por bucket: RAISE→{A,B}, CALL→{B,C}, CHECK→{C,D}, FOLD→{}
 * 
 * scorePredict(palpite, gabarito, vilaoMao) → number (0-100)
 *   Scoring com regras especiais para perfeição e range puro.
 */

import { decideVillainAction } from './preflop.js';
import { redistributeRange } from './buckets.js';

export function initResidual(modRange) {
  if (!modRange || !modRange.rfi || !modRange.xrfi) {
    return new Set();
  }
  const residual = new Set([...modRange.rfi.keys(), ...modRange.xrfi.keys()]);
  return residual;
}

/**
 * Remove mãos onde a ação determinística não bate.
 * @param {Set} residual - Mãos atuais
 * @param {Object} modRange - { rfi: Map, xrfi: Map }
 * @param {string} facing - 'none' | 'open' | '3b' | '4b'
 * @param {string} token - 'OR' | 'LIMP' | 'FOLD' | '3B' | 'ALL-IN' | 'CALL'
 * @returns {Set} - Mãos que executariam token com facing dado
 */
export function narrowPreflop(residual, modRange, facing, token) {
  if (residual.size === 0) return new Set();
  
  const narrowed = new Set();
  for (const hand of residual) {
    const rfiLine = modRange.rfi.get(hand);
    const xrfiLine = modRange.xrfi.get(hand);
    const decision = decideVillainAction(hand, rfiLine, xrfiLine, facing);
    if (decision === token) {
      narrowed.add(hand);
    }
  }
  return narrowed;
}

/**
 * Filtra por bucket pós-flop.
 * @param {Set} residual - Mãos atuais
 * @param {Array} board - Board cards para classificar
 * @param {Object} bucketed - { A: Set, B: Set, C: Set, D: Set } de redistributeRange
 * @param {string} op - 'RAISE' | 'CALL' | 'CHECK' | 'FOLD'
 * @returns {Set} - Mãos do bucket(s) correspondente(s)
 */
export function narrowPostflop(residual, board, bucketed, op) {
  if (residual.size === 0) return new Set();
  
  // Mapeamento: ação → buckets válidos
  const bucketMap = {
    'RAISE': new Set(['A', 'B']),
    'CALL': new Set(['B', 'C']),
    'CHECK': new Set(['C', 'D']),
    'FOLD': new Set(),
  };
  
  const validBuckets = bucketMap[op] || new Set();
  if (validBuckets.size === 0) {
    return new Set(); // FOLD esvazia
  }
  
  const narrowed = new Set();
  for (const bucket of validBuckets) {
    if (bucketed[bucket]) {
      for (const hand of bucketed[bucket]) {
        if (residual.has(hand)) {
          narrowed.add(hand);
        }
      }
    }
  }
  return narrowed;
}

/**
 * Scoring da previsão.
 * @param {Set} palpite - Mãos que o usuário escolheu
 * @param {Set} gabarito - Range residual real do vilão
 * @param {string} vilaoMao - Label da mão real do vilão
 * @returns {number} - 0-100, score da precisão
 */
export function scorePredict(palpite, gabarito, vilaoMao) {
  if (palpite.size === 0 || gabarito.size === 0) {
    return 0;
  }

  const hits = [...palpite].filter(h => gabarito.has(h)).length;

  // Caso 1: palpite exatamente a mão real (1 de 1 perfeito)
  if (palpite.size === 1 && palpite.has(vilaoMao)) {
    return 100;
  }

  // Caso 2: acertou a mão + mais de 1, palpite ⊆ gabarito → 99
  if (palpite.has(vilaoMao) && [...palpite].every(h => gabarito.has(h)) && palpite.size > 1) {
    return 99;
  }

  // Caso 3: palpite ⊆ gabarito mas sem a mão real → cap 98
  if (!palpite.has(vilaoMao) && [...palpite].every(h => gabarito.has(h))) {
    return 98;
  }

  // Caso 4: resto → hits / n
  return Math.round((hits / palpite.size) * 100);
}
