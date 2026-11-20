import { describe, it, expect, beforeEach } from 'vitest';
import { useActions, actionLines, actionConfig, SITUATION_ACTIONS } from '../../../src/composables/useActions.js';
import { useRangeMatrix } from '../../../src/composables/useRangeMatrix.js';
import { usePersistence } from '../../../src/composables/usePersistence.js';
import { Ranges, currentSituation, currentPosition, rangeGame } from '../../../src/composables/useRangeGame.js';

// quick action com size ("OR 3BB") pintava ["OR"] — a etiqueta morria
// na escrita e a cor custom nunca voltava (a célula exibia o OR base).
// O paint agora preserva a etiqueta; o engine expande na leitura
// (normLine), então decisão nunca vê size. Linha nomeada continua
// gravando tokens (sequência pertence à linha).
function reset() {
  for (const pos of Object.keys(Ranges.RFI)) Ranges.RFI[pos].clear();
  for (const pos of Object.keys(Ranges.XRFI)) Ranges.XRFI[pos].clear();
  actionLines.length = 0;
  for (const k of Object.keys(actionConfig)) delete actionConfig[k];
  Object.assign(actionConfig, {
    OR: '#3B82F6', CALL: '#9CA3AF', '3B': '#22C55E', '4B': '#E5A84B',
    FOLD: '#E06C75', 'ALL-IN': '#EAB308', LIMP: '#7DD3FC',
  });
  SITUATION_ACTIONS.RFI.length = 0;
  SITUATION_ACTIONS.RFI.push('fold', 'OR', 'LIMP');
  currentSituation.value = 'RFI';
  currentPosition.value = 'UTG';
}

describe('quick action com size preserva etiqueta', () => {
  beforeEach(reset);

  it('pinta ["OR 3BB"]: etiqueta, cor custom e grupo próprio no export', () => {
    const { addAction } = useActions();
    const mx = useRangeMatrix();
    addAction('OR 3BB', '#FF0000', 'RFI');
    mx.setHandAction('AA', 'OR 3BB');
    expect(Ranges.RFI.UTG.get('AA')).toEqual(['OR 3BB']);
    expect(mx.getActionForHand('AA')).toBe('OR 3BB');
    expect(mx.getCellColor('AA')).toBe('#FF0000');
    expect(mx.exportRange()['OR 3BB']).toContain('AA');
  });

  it('cycle chega na etiqueta e o drag a mantém', () => {
    const { addAction } = useActions();
    const mx = useRangeMatrix();
    addAction('OR 3BB', '#FF0000', 'RFI');
    // fold → OR → LIMP → OR 3BB
    mx.cycleHandAction('KK');
    mx.cycleHandAction('KK');
    mx.cycleHandAction('KK');
    expect(Ranges.RFI.UTG.get('KK')).toEqual(['OR 3BB']);
    expect(mx.getActionForHand('KK')).toBe('OR 3BB');
  });

  it('engine continua vendo OR (decisão intacta, size invisível)', () => {
    const { addAction } = useActions();
    const { getModRange } = rangeGame();
    const mx = useRangeMatrix();
    addAction('OR 3BB', '#FF0000', 'RFI');
    mx.setHandAction('AA', 'OR 3BB');
    const mod = getModRange({ POS: 'UTG', RFI: 1 });
    expect(mod.rfi.get('AA')).toEqual(['OR']);
  });

  it('reload preserva a etiqueta; linha nomeada continua expandindo', () => {
    const { addAction, addActionLine } = useActions();
    const { normalizeLine } = usePersistence();
    const mx = useRangeMatrix();
    addAction('OR 3BB', '#FF0000', 'RFI');
    addActionLine({ id: 'l1', name: 'Aggro', color: '#fff', sequence: [{ token: 'OR', size: '3bb' }] });
    expect(normalizeLine(['OR 3BB'])).toEqual(['OR 3BB']);
    expect(normalizeLine(['Aggro'])).toEqual(['OR']);
    expect(normalizeLine([['OR']][0])).toEqual(['OR']);
    expect(mx.getActionForHand).toBeDefined();
  });

  it('remover a quick action apaga SÓ as células dela (base sobrevive)', () => {
    const { addAction, removeAction } = useActions();
    const mx = useRangeMatrix();
    addAction('OR 3BB', '#FF0000', 'RFI');
    mx.setHandAction('AA', 'OR 3BB');
    mx.setHandAction('KK', 'OR');
    removeAction('OR 3BB', Ranges);
    expect(Ranges.RFI.UTG.has('AA')).toBe(false);
    expect(Ranges.RFI.UTG.get('KK')).toEqual(['OR']);
  });

  it('remover base OR não orfana sized (ação independente, segue válida)', () => {
    const { addAction, removeAction } = useActions();
    const mx = useRangeMatrix();
    addAction('OR 3BB', '#FF0000', 'RFI');
    mx.setHandAction('AA', 'OR 3BB');
    removeAction('OR', Ranges);
    expect(Ranges.RFI.UTG.get('AA')).toEqual(['OR 3BB']);
    expect(mx.getActionForHand('AA')).toBe('OR 3BB');
  });
});
