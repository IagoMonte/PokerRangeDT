import { describe, it, expect } from 'vitest';
import { decideVillainAction } from '../../../src/engine/preflop.js';
import { expectedPreflopLine } from '../../../src/engine/heroGrade.js';
import { parseCallCap } from '../../../src/composables/useActions.js';
import { rangeGame } from '../../../src/composables/useRangeGame.js';

// // RFI and XRFI lines determine actions for each preflop situation.
// o ramo face=open lia "RFI presente ⇒ CALL" (call fantasma: A7s
// "OR FOLD" pagava open frio) e priorizava ALL-IN sobre 3B (KK/AKs davam
// jam de 100bb over 1 open). A spec manda: vs open só XRFI decide, 3B
// vence ALL-IN, CALL com size é teto.
describe('RFI action lines', () => {
  it('"fold" → fold em todo facing', () => {
    for (const face of ['none', 'open', '3b', '4b']) {
      expect(decideVillainAction('x', null, null, face)).toBe('FOLD');
      expect(decideVillainAction('x', [], [], face)).toBe('FOLD');
    }
  });

  it('"OR FOLD" → open; folda 3-bet; sem instrução vs open → FOLD', () => {
    expect(decideVillainAction('A7s', ['OR', 'FOLD'], undefined, 'none')).toBe('OR');
    expect(decideVillainAction('A7s', ['OR', 'FOLD'], undefined, 'open')).toBe('FOLD');
    expect(decideVillainAction('A7s', ['OR', 'FOLD'], undefined, '3b')).toBe('FOLD');
    expect(decideVillainAction('A7s', ['OR', 'FOLD'], undefined, '4b')).toBe('FOLD');
  });

  it('"OR CALL" → open; call 3-bet; sem instrução vs 4-bet → FOLD ', () => {
    expect(decideVillainAction('88', ['OR', 'CALL'], undefined, 'none')).toBe('OR');
    expect(decideVillainAction('88', ['OR', 'CALL'], undefined, 'open')).toBe('FOLD');
    expect(decideVillainAction('88', ['OR', 'CALL'], undefined, '3b')).toBe('CALL');
    expect(decideVillainAction('88', ['OR', 'CALL'], undefined, '4b')).toBe('FOLD');
  });

  it('"OR 4B FOLD" → open; 4-beta 3-bet; folda all-in/5-bet', () => {
    expect(decideVillainAction('AJo', ['OR', '4B', 'FOLD'], undefined, 'none')).toBe('OR');
    expect(decideVillainAction('AJo', ['OR', '4B', 'FOLD'], undefined, 'open')).toBe('FOLD');
    expect(decideVillainAction('AJo', ['OR', '4B', 'FOLD'], undefined, '3b')).toBe('4B');
    expect(decideVillainAction('AJo', ['OR', '4B', 'FOLD'], undefined, '4b')).toBe('FOLD');
  });

  it('"OR 4B CALL" → open; 4-beta 3-bet; call all-in/5-bet', () => {
    expect(decideVillainAction('AKs', ['OR', '4B', 'CALL'], undefined, 'none')).toBe('OR');
    expect(decideVillainAction('AKs', ['OR', '4B', 'CALL'], undefined, 'open')).toBe('FOLD');
    expect(decideVillainAction('AKs', ['OR', '4B', 'CALL'], undefined, '3b')).toBe('4B');
    expect(decideVillainAction('AKs', ['OR', '4B', 'CALL'], undefined, '4b')).toBe('CALL');
  });
});

describe('XRFI action lines', () => {
  it('"3B FOLD" → 3-beta open; folda 4-bet', () => {
    expect(decideVillainAction('K9s', undefined, ['3B', 'FOLD'], 'open')).toBe('3B');
    expect(decideVillainAction('K9s', undefined, ['3B', 'FOLD'], '4b')).toBe('FOLD');
  });

  it('"3B CALL" → 3-beta open; call 4-bet', () => {
    expect(decideVillainAction('QQ', undefined, ['3B', 'CALL'], 'open')).toBe('3B');
    expect(decideVillainAction('QQ', undefined, ['3B', 'CALL'], '4b')).toBe('CALL');
  });

  it('"3B ALL-IN" → 3-beta open (raise, nunca jam); all-in vs 4-bet', () => {
    expect(decideVillainAction('KK', undefined, ['3B', 'ALL-IN'], 'open')).toBe('3B');
    expect(decideVillainAction('KK', undefined, ['3B', 'ALL-IN'], '4b')).toBe('ALL-IN');
  });

  it('"CALL 2/3.5" → call open até o teto, fold acima', () => {
    expect(decideVillainAction('A2s', undefined, ['CALL'], 'open', { toCallBb: 2, callCapBb: 2 })).toBe('CALL');
    expect(decideVillainAction('A2s', undefined, ['CALL'], 'open', { toCallBb: 2.5, callCapBb: 2 })).toBe('FOLD');
    expect(decideVillainAction('A2s', undefined, ['CALL'], 'open', { toCallBb: 2.5, callCapBb: 3.5 })).toBe('CALL');
    expect(decideVillainAction('A2s', undefined, ['CALL'], 'open', { toCallBb: 4, callCapBb: 3.5 })).toBe('FOLD');
    // sem teto (CALL puro): paga como antes
    expect(decideVillainAction('A2s', undefined, ['CALL'], 'open', { toCallBb: 9 })).toBe('CALL');
  });
});

describe('heroGrade matches the preflop engine', () => {
  it('RFI sem XRFI vs open espera FOLD (não CALL)', () => {
    expect(expectedPreflopLine({ rfiLine: ['OR', 'FOLD'], xrfiLine: null, facing: 'open', toCall: 5 }))
      .toEqual(['FOLD']);
  });

  it('"3B ALL-IN" vs open espera 3B (não jam)', () => {
    expect(expectedPreflopLine({ rfiLine: ['OR'], xrfiLine: ['3B', 'ALL-IN'], facing: 'open', toCall: 5 }))
      .toEqual(['3B']);
  });

  it('teto XRFI no grade: CALL até o cap, FOLD acima', () => {
    expect(expectedPreflopLine({ rfiLine: null, xrfiLine: ['CALL'], facing: 'open', toCall: 4, bb: 2, xrfiCallCap: 2 }))
      .toEqual(['CALL']);
    expect(expectedPreflopLine({ rfiLine: null, xrfiLine: ['CALL'], facing: 'open', toCall: 5, bb: 2, xrfiCallCap: 2 }))
      .toEqual(['FOLD']);
  });
});

describe('parseCallCap (CALL limit in bb)', () => {
  it('extrai o teto de etiquetas sized', () => {
    expect(parseCallCap('CALL 2')).toEqual({ value: 2, unit: 'bb' });
    expect(parseCallCap('CALL 3.5')).toEqual({ value: 3.5, unit: 'bb' });
  });

  it('sem size ou sem CALL → null (sem teto)', () => {
    expect(parseCallCap('CALL')).toBeNull();
    expect(parseCallCap('3B FOLD')).toBeNull();
    expect(parseCallCap('OR 4B CALL')).toBeNull();
    expect(parseCallCap('fold')).toBeNull();
    expect(parseCallCap(null)).toBeNull();
  });
});

describe('range bands preserve painted hands', () => {
  it('mão pintada não-CALL nunca vira CALL de banda (anti-ressurreição)', () => {
    // trim cortava o "3B FOLD" fraco p/ bater o stat e a banda de
    // blefe reinseria a mão como ['CALL'] puro — a etiqueta pintada morria
    // (probe no código original: BTN K9s/A4s "3B FOLD" → ['CALL']).
    // Aqui ~102 combos pintados vs alvo ~85: o trim corta A5s–A2s e a banda
    // tenta trazê-los de volta como CALL.
    const { Ranges, getModRange } = rangeGame();
    Ranges.RFI.BTN = new Map([['AA', ['OR', '4B', 'CALL']]]);
    Ranges.XRFI.BTN = new Map([
      ['AA', ['3B', 'ALL-IN']], ['KK', ['3B', 'ALL-IN']], ['QQ', ['3B', 'ALL-IN']],
      ['JJ', ['3B', 'CALL']], ['TT', ['3B', 'CALL']], ['99', ['3B', 'CALL']], ['88', ['3B', 'CALL']],
      ['AKs', ['3B', 'CALL']], ['AQs', ['3B', 'CALL']],
      ['KQs', ['3B', 'CALL']], ['KJs', ['3B', 'CALL']], ['QJs', ['3B', 'CALL']],
      ['JTs', ['3B', 'CALL']], ['KTs', ['3B', 'CALL']], ['QTs', ['3B', 'CALL']],
      ['A5s', ['3B', 'FOLD']], ['A4s', ['3B', 'FOLD']], ['A3s', ['3B', 'FOLD']], ['A2s', ['3B', 'FOLD']],
      ['K9s', ['3B', 'FOLD']], ['Q9s', ['3B', 'FOLD']], ['J9s', ['3B', 'FOLD']],
    ]);
    const mod = getModRange({ POS: 'BTN', RFI: 0.22, threeBet: 0.08, fourBet: 0.05, bluff: 0.30, call: 0.08 });
    // Trim corta p/ baixo (fora = fold em tudo); o que não pode é voltar
    // como CALL de banda com a etiqueta pintada morta.
    for (const h of ['A5s', 'A4s', 'A3s', 'A2s']) {
      expect(mod.xrfi.get(h)).not.toEqual(['CALL']);
    }
  });

  it('mão pintada CALL sized carrega o teto no modRange', () => {
    const { Ranges, getModRange } = rangeGame();
    Ranges.RFI.BB = new Map();
    Ranges.XRFI.BB = new Map([['A2s', ['CALL 3.5']], ['K9s', ['CALL 2']]]);
    const mod = getModRange({ POS: 'BIG_BLIND', RFI: 0, threeBet: 0.5, fourBet: 0, bluff: 0, call: 0.5 });
    expect(mod.xrfiCaps.get('A2s')).toEqual({ value: 3.5, unit: 'bb' });
    expect(mod.xrfiCaps.get('K9s')).toEqual({ value: 2, unit: 'bb' });
  });

  it('RFI: mão pintada cortada pelo trim fica fora (anti-ressurreição lado RFI)', () => {
    // mesmo padrão do T3 no outro mapa — trim cortava o
    // "OR CALL" fraco e a banda de blefe reinseria ['OR']; pior: o
    // append-4B convertia em ["OR","4B"] (SB A4s 4-betou em sessão com
    // linha pintada de call). Trim corta p/ baixo, banda não reescreve.
    const { Ranges, getModRange } = rangeGame();
    Ranges.RFI.UTG = new Map([
      ['AA', ['OR', '4B', 'CALL']],
      ['KK', ['OR', 'CALL']], ['QQ', ['OR', 'CALL']], ['JJ', ['OR', 'CALL']],
      ['TT', ['OR', 'CALL']], ['99', ['OR', 'CALL']],
      ['88', ['OR', 'CALL']], ['77', ['OR', 'CALL']], ['66', ['OR', 'CALL']],
      ['55', ['OR', 'CALL']], ['44', ['OR', 'CALL']],
      ['AKs', ['OR', 'CALL']], ['AQs', ['OR', 'CALL']], ['AJs', ['OR', 'CALL']], ['KQs', ['OR', 'CALL']],
      ['KJs', ['OR', 'CALL']], ['QJs', ['OR', 'CALL']], ['JTs', ['OR', 'CALL']],
      ['AKo', ['OR', 'CALL']], ['AQo', ['OR', 'CALL']],
      ['A5s', ['OR', 'CALL']], ['A4s', ['OR', 'CALL']], ['A3s', ['OR', 'CALL']], ['A2s', ['OR', 'CALL']],
    ]);
    const mod = getModRange({ POS: 'UTG', RFI: 0.1, threeBet: 0, fourBet: 0.05, bluff: 0.5 });
    expect(mod.rfi.get('A2s')).toBeUndefined();
    expect(mod.rfi.get('A5s')).toBeUndefined();
    expect(mod.rfi.get('AA')).toEqual(['OR', '4B', 'CALL']);
  });
});
