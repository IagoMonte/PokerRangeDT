import { describe, it, expect } from 'vitest';
import { gradePreflopLine } from '../../../src/engine/heroGrade.js';

// pré-flop não tem conta de EV — o gabarito é a linha pintada.
// Ação dentro da linha → silêncio (null). Fora → −EV com o X + a linha.
// Sem perdão: fold grátis fora da linha pune.

describe('gradePreflopLine (linha pintada, sem EV)', () => {
  it('ação dentro da linha → null (silêncio)', () => {
    expect(gradePreflopLine({
      heroToken: 'OR', rfiLine: ['OR'], xrfiLine: null, facing: 'none', toCall: 0,
    })).toBeNull();
    expect(gradePreflopLine({
      heroToken: 'CALL', rfiLine: ['OR'], xrfiLine: ['CALL'], facing: 'open', toCall: 20,
    })).toBeNull();
    // First-in shove na linha → silêncio (espelha decideVillainAction).
    expect(gradePreflopLine({
      heroToken: 'ALL-IN', rfiLine: ['ALL-IN'], xrfiLine: null, facing: 'none', toCall: 0,
    })).toBeNull();
    // Linha-sequência first-in: abridor é o esperado (OR, não ALL-IN).
    expect(gradePreflopLine({
      heroToken: 'OR', rfiLine: ['OR', '4B', 'ALL-IN'], xrfiLine: null, facing: 'none', toCall: 0,
    })).toBeNull();
    expect(gradePreflopLine({
      heroToken: 'ALL-IN', rfiLine: ['OR', '4B', 'ALL-IN'], xrfiLine: null, facing: 'none', toCall: 0,
    })?.verdict).toBe('minus');
  });

  it('ação fora da linha → minus com X + linha', () => {
    const g = gradePreflopLine({
      heroToken: 'FOLD', rfiLine: ['OR'], xrfiLine: ['CALL'], facing: 'open', toCall: 20,
    });
    expect(g).not.toBeNull();
    expect(g.verdict).toBe('minus');
    expect(g.chosen).toBe('FOLD');
    expect(g.line).toEqual(['CALL']);
  });

  it('fold grátis fora da linha pune (CHECK era grátis)', () => {
    const g = gradePreflopLine({
      heroToken: 'FOLD', rfiLine: [], xrfiLine: null, facing: 'none', toCall: 0,
    });
    expect(g).not.toBeNull();
    expect(g.verdict).toBe('minus');
  });

  it('CHECK grátis é sempre aceitável (sem token pintável p/ ele)', () => {
    expect(gradePreflopLine({
      heroToken: 'CHECK', rfiLine: [], xrfiLine: null, facing: 'none', toCall: 0,
    })).toBeNull();
  });

  it('mão sem linha pintada no facing → só FOLD é correto', () => {
    expect(gradePreflopLine({
      heroToken: 'FOLD', rfiLine: null, xrfiLine: null, facing: 'open', toCall: 20,
    })).toBeNull();
    const g = gradePreflopLine({
      heroToken: 'CALL', rfiLine: null, xrfiLine: null, facing: 'open', toCall: 20,
    });
    expect(g?.verdict).toBe('minus');
  });

  it('raise resolve p/ o token da agressão do facing (3B vs open)', () => {
    expect(gradePreflopLine({
      heroToken: '3B', rfiLine: ['OR'], xrfiLine: ['3B'], facing: 'open', toCall: 20,
    })).toBeNull();
    const g = gradePreflopLine({
      heroToken: '3B', rfiLine: ['OR'], xrfiLine: ['CALL'], facing: 'open', toCall: 20,
    });
    expect(g?.verdict).toBe('minus');
  });
});
