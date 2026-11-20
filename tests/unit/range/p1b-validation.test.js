import { describe, it, expect, beforeEach } from 'vitest';
import { Ranges, currentSituation, currentPosition } from '../../../src/composables/useRangeGame.js';
import { useRangeMatrix } from '../../../src/composables/useRangeMatrix.js';
import { useActions, actionLines, SITUATION_ACTIONS, normalizeStep } from '../../../src/composables/useActions.js';

// o builder validava pouco e em dois shapes — nome duplicado
// virava ambiguidade silenciosa, LIMP impintável apesar do motor honrar,
// e size do builder morria na praia ({token,value} vs {token,size}).
describe('P1-B validação do builder', () => {
  let matrix;
  let addActionLine;

  beforeEach(() => {
    for (const pos of Object.keys(Ranges.RFI)) Ranges.RFI[pos].clear();
    for (const pos of Object.keys(Ranges.XRFI)) Ranges.XRFI[pos].clear();
    currentSituation.value = 'RFI';
    currentPosition.value = 'UTG';
    matrix = useRangeMatrix();
    addActionLine = useActions().addActionLine;
  });

  it('nome de linha duplicado rejeita (fail loud, sem ambiguidade)', () => {
    addActionLine({ id: 't-dup', name: 'Dup', color: '#fff', sequence: [{ token: 'OR' }] });
    try {
      expect(() => addActionLine({ id: 't-dup2', name: 'Dup', color: '#fff', sequence: [{ token: 'CALL' }] }))
        .toThrow(/duplicate/);
    } finally {
      matrix.removeActionLine('t-dup', Ranges);
    }
  });

  it('LIMP pintável no RFI (picker) e lido pelo ciclo', () => {
    expect(SITUATION_ACTIONS.RFI).toContain('LIMP');
    matrix.cycleHandAction('AKs'); // vazio → OR
    matrix.cycleHandAction('AKs'); // OR → LIMP
    expect(Ranges.RFI.UTG.get('AKs')).toEqual(['LIMP']);
    expect(matrix.getActionForHand('AKs')).toBe('LIMP');
  });

  it('shape canônico {token,size}: legado {token,value} migra na escrita', () => {
    expect(normalizeStep({ token: 'OR', value: '3bb' })).toEqual({ token: 'OR', size: '3bb' });
    expect(normalizeStep({ token: 'OR', size: '3bb' })).toEqual({ token: 'OR', size: '3bb' });
    expect(normalizeStep({ token: 'CALL' })).toEqual({ token: 'CALL', size: null });
    addActionLine({ id: 't-shp', name: 'Shp', color: '#fff', sequence: [{ token: 'OR', value: '3bb' }] });
    try {
      const saved = actionLines.find((l) => l.name === 'Shp');
      expect(saved.sequence).toEqual([{ token: 'OR', size: '3bb' }]);
    } finally {
      matrix.removeActionLine('t-shp', Ranges);
    }
  });

  it('builder mostra o erro em vez de dar throw (contrato)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(
      new URL('../../../src/components/ActionLineBuilder.vue', import.meta.url), 'utf8');
    expect(src).toContain('v-model="item.size"');
    expect(src.match(/try \{[\s\S]*?addActionLine\(newLine\)/)).toBeTruthy();
  });
});
