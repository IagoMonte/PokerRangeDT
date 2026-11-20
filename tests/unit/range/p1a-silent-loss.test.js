import { describe, it, expect, beforeEach } from 'vitest';
import { Ranges, currentSituation, currentPosition } from '../../../src/composables/useRangeGame.js';
import { useRangeMatrix } from '../../../src/composables/useRangeMatrix.js';

// o builder alimenta motor + gabarito — dado perdido ou
// invisível aqui vira treino errado sem aviso. Trilogia anti-perda:
// export nunca dropa, órfão tem cor própria, ciclo em órfão é erase
// explícito (contrato, nunca vaporização silenciosa).
describe('P1-A sem perda silenciosa (órfãos)', () => {
  let matrix;

  beforeEach(() => {
    for (const pos of Object.keys(Ranges.RFI)) Ranges.RFI[pos].clear();
    for (const pos of Object.keys(Ranges.XRFI)) Ranges.XRFI[pos].clear();
    currentSituation.value = 'RFI';
    currentPosition.value = 'UTG';
    matrix = useRangeMatrix();
    // Órfão: tokens sem linha dona (dono deletado, save legado, etc).
    Ranges.RFI.UTG.set('AJs', ['OR', '3B']);
  });

  it('export inclui o grupo sem-dono sob o próprio label', () => {
    const out = matrix.exportRange();
    expect(out['OR 3B']).toContain('AJs');
  });

  it('ciclo em órfão apaga explicitamente (recomeço, sem pintar por cima)', () => {
    matrix.cycleHandAction('AJs');
    expect(Ranges.RFI.UTG.has('AJs')).toBe(false);
  });

  it('órfão tem cor distinta (nunca parece fold)', () => {
    const orphan = matrix.getActionColor(matrix.getActionForHand('AJs'));
    expect(orphan).not.toBe('#111827');
    expect(orphan).not.toBe(matrix.getActionColor('fold'));
  });

  it('ciclo normal intacto: fold→OR→LIMP→fold apaga no giro', () => {
    matrix.cycleHandAction('AKs'); // vazio → OR
    expect(Ranges.RFI.UTG.get('AKs')).toEqual(['OR']);
    matrix.cycleHandAction('AKs'); // OR → LIMP
    expect(Ranges.RFI.UTG.get('AKs')).toEqual(['LIMP']);
    matrix.cycleHandAction('AKs'); // LIMP → fold (apaga)
    expect(Ranges.RFI.UTG.has('AKs')).toBe(false);
  });
});
