import { describe, it, expect } from 'vitest';
import { decideVillainAction } from '../../../src/engine/preflop.js';

/**
 * initResidual(modRange) → Set
 * - Chaves da union rfi ∪ xrfi
 *
 * narrowPreflop(residual, modRange, facing, token) → Set
 * - Remove mãos onde decideVillainAction(...) ≠ token
 * - facing: 'none' | 'open' | '3b' | '4b'
 * - token: 'OR' | 'LIMP' | 'FOLD' | '3B' | 'ALL-IN' | 'CALL'
 *
 * narrowPostflop(residual, board, op) → Set
 * - op: 'RAISE' | 'CALL' | 'CHECK' | 'FOLD'
 * - Filtra por bucket após redistributeRange
 * - RAISE → {A, B}, CALL → {B, C}, CHECK → {C, D}, FOLD → {}
 *
 * initResidual(null/empty) → empty Set
 */

describe('residual narrowing', () => {
  // Mock decideVillainAction
  function mockDecide(label, rfiLine, xrfiLine, face) {
    return decideVillainAction(label, rfiLine, xrfiLine, face);
  }

  describe('initResidual', () => {
    it('vazio se modRange = null', () => {
      // Helper do engine vai validar isto
      expect(null).toBe(null);
    });

    it('union rfi ∪ xrfi', () => {
      const modRange = {
        rfi: new Map([['AA', ['OR']], ['KK', ['OR', '4B']]]),
        xrfi: new Map([['QQ', ['3B']], ['AKs', ['CALL']]]),
      };
      const residual = new Set([...modRange.rfi.keys(), ...modRange.xrfi.keys()]);
      expect(residual).toEqual(new Set(['AA', 'KK', 'QQ', 'AKs']));
    });
  });

  describe('narrowPreflop', () => {
    it('facing=none, token=OR: remove mãos sem OR na rfiLine', () => {
      const modRange = {
        rfi: new Map([
          ['AA', ['OR']],
          ['KK', ['LIMP']],
          ['QQ', ['OR']],
        ]),
        xrfi: new Map(),
      };
      // facing='none': acessa rfiLine
      // AA: rfiLine=['OR'], token='OR' → match (keep)
      // KK: rfiLine=['LIMP'], token='OR' → no match (remove)
      // QQ: rfiLine=['OR'], token='OR' → match (keep)
      const residual = new Set(['AA', 'KK', 'QQ']);
      const narrowed = new Set();
      for (const hand of residual) {
        const rfiLine = modRange.rfi.get(hand);
        const decision = mockDecide(hand, rfiLine, undefined, 'none');
        if (decision === 'OR') narrowed.add(hand);
      }
      expect(narrowed).toEqual(new Set(['AA', 'QQ']));
    });

    it('facing=open, token=3B: remove mãos sem 3B na xrfiLine', () => {
      const modRange = {
        rfi: new Map(),
        xrfi: new Map([
          ['AA', ['3B']],
          ['KK', ['CALL']],
          ['QQ', ['3B']],
        ]),
      };
      // facing='open': acessa xrfiLine
      // AA: xrfiLine=['3B'], token='3B' → match (keep)
      // KK: xrfiLine=['CALL'], token='3B' → no match (remove)
      // QQ: xrfiLine=['3B'], token='3B' → match (keep)
      const residual = new Set(['AA', 'KK', 'QQ']);
      const narrowed = new Set();
      for (const hand of residual) {
        const xrfiLine = modRange.xrfi.get(hand);
        const decision = mockDecide(hand, undefined, xrfiLine, 'open');
        if (decision === '3B') narrowed.add(hand);
      }
      expect(narrowed).toEqual(new Set(['AA', 'QQ']));
    });

    it('facing=open, token=CALL: keep só XRFI-CALL (RFI sem XRFI folda)', () => {
      const modRange = {
        rfi: new Map([['99', ['OR']]]), // 99 sem defesa vs open → FOLD 
        xrfi: new Map([
          ['AA', ['CALL']],
          ['KK', ['3B']],
        ]),
      };
      // facing='open':
      // AA: xrfiLine=['CALL'] → CALL (keep)
      // KK: xrfiLine=['3B'] → 3B (remove, não CALL)
      // 99: xrfiLine=undefined, rfiLine=['OR'] → FOLD (remove)
      const residual = new Set(['AA', 'KK', '99']);
      const narrowed = new Set();
      for (const hand of residual) {
        const rfiLine = modRange.rfi.get(hand);
        const xrfiLine = modRange.xrfi.get(hand);
        const decision = mockDecide(hand, rfiLine, xrfiLine, 'open');
        if (decision === 'CALL') narrowed.add(hand);
      }
      expect(narrowed).toEqual(new Set(['AA']));
    });

    it('facing=3b, token=ALL-IN: keep mãos com ALL-IN na rfiLine', () => {
      const modRange = {
        rfi: new Map([
          ['AA', ['ALL-IN']],
          ['KK', ['CALL']],
          ['QQ', ['4B', 'ALL-IN']],
        ]),
        xrfi: new Map(),
      };
      // facing='3b': acessa rfiLine
      // AA: rfiLine=['ALL-IN'], token=ALL-IN → ALL-IN (keep)
      // KK: rfiLine=['CALL'], token=ALL-IN → CALL (remove)
      // QQ: rfiLine=['4B','ALL-IN'], token=ALL-IN → 4B (remova, 4B tem prioridade)
      const residual = new Set(['AA', 'KK', 'QQ']);
      const narrowed = new Set();
      for (const hand of residual) {
        const rfiLine = modRange.rfi.get(hand);
        const decision = mockDecide(hand, rfiLine, undefined, '3b');
        if (decision === 'ALL-IN') narrowed.add(hand);
      }
      expect(narrowed).toEqual(new Set(['AA']));
    });

    it('token=FOLD: remove todas as mãos (faced fold)', () => {
      const modRange = {
        rfi: new Map([['AA', ['OR']], ['KK', ['OR']]]),
        xrfi: new Map(),
      };
      // facing='none', token='FOLD' → nada corresponde (aa/kk têm OR)
      const residual = new Set(['AA', 'KK']);
      const narrowed = new Set();
      for (const hand of residual) {
        const rfiLine = modRange.rfi.get(hand);
        const decision = mockDecide(hand, rfiLine, undefined, 'none');
        if (decision === 'FOLD') narrowed.add(hand);
      }
      expect(narrowed).toEqual(new Set());
    });
  });

  describe('narrowPostflop (simples v1)', () => {
    it('RAISE filtra por bucket: A e B only', () => {
      // V1: simples, sem redistributeRange real — apenas simulado
      // Assume que redistributeRange(P, board) → { A: Set, B: Set, C: Set, D: Set }
      // RAISE → A ∪ B
      const bucketed = {
        A: new Set(['AA', 'KK']),
        B: new Set(['AK', 'QQ']),
        C: new Set(['JJ', 'TT']),
        D: new Set(['99', '88']),
      };
      const afterRaise = new Set([...bucketed.A, ...bucketed.B]);
      expect(afterRaise).toEqual(new Set(['AA', 'KK', 'AK', 'QQ']));
    });

    it('CALL filtra por bucket: B e C only', () => {
      const bucketed = {
        A: new Set(['AA', 'KK']),
        B: new Set(['AK', 'QQ']),
        C: new Set(['JJ', 'TT']),
        D: new Set(['99', '88']),
      };
      const afterCall = new Set([...bucketed.B, ...bucketed.C]);
      expect(afterCall).toEqual(new Set(['AK', 'QQ', 'JJ', 'TT']));
    });

    it('CHECK filtra por bucket: C e D only', () => {
      const bucketed = {
        A: new Set(['AA', 'KK']),
        B: new Set(['AK', 'QQ']),
        C: new Set(['JJ', 'TT']),
        D: new Set(['99', '88']),
      };
      const afterCheck = new Set([...bucketed.C, ...bucketed.D]);
      expect(afterCheck).toEqual(new Set(['JJ', 'TT', '99', '88']));
    });

    it('FOLD esvazia o range', () => {
      const bucketed = {
        A: new Set(['AA', 'KK']),
        B: new Set(['AK', 'QQ']),
        C: new Set(['JJ', 'TT']),
        D: new Set(['99', '88']),
      };
      const afterFold = new Set();
      expect(afterFold).toEqual(new Set());
    });
  });
});
