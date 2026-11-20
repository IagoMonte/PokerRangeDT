import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rangeGame, Ranges, currentSituation, currentPosition } from '../../../src/composables/useRangeGame.js';
import { useRangeMatrix } from '../../../src/composables/useRangeMatrix.js';
import { useActions, actionConfig, SITUATION_ACTIONS } from '../../../src/composables/useActions.js';

const { getModRange } = rangeGame();

// pintar com quick action ("3B FOLD") preserva a ETIQUETA (round-trip
// de cor/nome); o engine expande na leitura. Linha nomeada grava tokens
// (sequência pertence à linha). Sem isso, size ("OR 3BB") morria na escrita
// e a célula exibia a cor do token base.
describe('action lines gravam tokens', () => {
  let matrix;
  let removeAction;

  beforeEach(() => {
    for (const pos of Object.keys(Ranges.RFI)) Ranges.RFI[pos].clear();
    for (const pos of Object.keys(Ranges.XRFI)) Ranges.XRFI[pos].clear();
    currentSituation.value = 'RFI';
    currentPosition.value = 'UTG';
    matrix = useRangeMatrix();
    removeAction = useActions().removeAction;
  });

  afterEach(() => {
    try { removeAction('3B FOLD', Ranges); } catch { /* já limpo */ }
    try { matrix.removeActionLine('t-fmt', Ranges); } catch { /* já limpo */ }
    for (const pos of Object.keys(Ranges.RFI)) Ranges.RFI[pos].clear();
    for (const pos of Object.keys(Ranges.XRFI)) Ranges.XRFI[pos].clear();
  });

  it('quick action "3B FOLD" preserva a etiqueta e exibe certo', () => {
    matrix.addAction('3B FOLD', '#E5A84B');
    matrix.setHandAction('AJs', '3B FOLD');

    expect(Ranges.RFI.UTG.get('AJs')).toEqual(['3B FOLD']);
    expect(matrix.getActionForHand('AJs')).toBe('3B FOLD');
    expect(matrix.exportRange()['3B FOLD']).toContain('AJs');
  });

  it('etiqueta legada de 1 elemento exibe certo', () => {
    matrix.addAction('3B FOLD', '#E5A84B');
    Ranges.RFI.UTG.set('AJs', ['3B FOLD']);

    expect(matrix.getActionForHand('AJs')).toBe('3B FOLD');
  });

  it('linha nomeada salva a sequência e sai inteira ao remover', () => {
    matrix.addActionLine({
      id: 't-fmt', name: 'Aggro', color: '#fff',
      sequence: [{ token: 'OR', value: '' }, { token: '3B', value: '' }, { token: 'FOLD', value: '' }],
    });
    matrix.setHandAction('AKs', 'Aggro');

    expect(Ranges.RFI.UTG.get('AKs')).toEqual(['OR', '3B', 'FOLD']);
    expect(matrix.getActionForHand('AKs')).toBe('Aggro');
    expect(matrix.exportRange()['Aggro']).toContain('AKs');

    matrix.removeActionLine('t-fmt', Ranges);
    expect(Ranges.RFI.UTG.has('AKs')).toBe(false);
  });

  it('engine expande etiqueta legada sem crash', () => {
    Ranges.XRFI['UTG'].set('AA', ['3B FOLD']);

    let out;
    expect(() => {
      out = getModRange({ POS: 'UTG', RFI: 0, threeBet: 0.08, fourBet: 0, bluff: 0 });
    }).not.toThrow();
    expect(out.xrfi.get('AA')).toEqual(['3B', 'FOLD']);
  });

  it('remover token base destaca só ele, o resto fica', () => {
    const color4B = actionConfig['4B'];
    const had4B = (SITUATION_ACTIONS.XRFI || []).includes('4B');
    const stub = { RFI: { UTG: new Map([['AA', ['OR', '4B']]]) }, XRFI: {} };
    try {
      removeAction('4B', stub);
      expect(stub.RFI.UTG.get('AA')).toEqual(['OR']);
    } finally {
      actionConfig['4B'] = color4B;
      if (had4B && !SITUATION_ACTIONS.XRFI.includes('4B')) SITUATION_ACTIONS.XRFI.push('4B');
    }
  });
});
