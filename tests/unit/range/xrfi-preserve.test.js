import { describe, it, expect, beforeEach } from 'vitest';
import { rangeGame, Ranges } from '../../../src/composables/useRangeGame';

const { getModRange } = rangeGame();

// o XRFI reescrevia toda linha pintada com ['CALL','3B'] genérico —
// o range do usuário era apagado em vez de manipulado. Linha pintada
// sobrevive; mão completada pelo engine segue o default.
describe('XRFI preserva linhas do usuário', () => {
  beforeEach(() => {
    for (const pos in Ranges.RFI) Ranges.RFI[pos].clear();
    for (const pos in Ranges.XRFI) Ranges.XRFI[pos].clear();
  });

  it('mantém 4B/CALL/ALL-IN pintados', () => {
    Ranges.XRFI['UTG'].set('AA', ['4B']);
    Ranges.XRFI['UTG'].set('AKs', ['CALL']);
    Ranges.XRFI['UTG'].set('72o', ['ALL-IN']);

    const out = getModRange({ POS: 'UTG', RFI: 0, threeBet: 0.08, fourBet: 0, bluff: 0, call: 0.08 });

    expect(out.xrfi.get('AA')).toEqual(['4B']);
    expect(out.xrfi.get('AKs')).toEqual(['CALL']);
    expect(out.xrfi.get('72o')).toEqual(['ALL-IN']);
  });

  it('mão completada pelo engine é do núcleo 3B', () => {
    Ranges.XRFI['UTG'].set('AA', ['CALL']);

    const out = getModRange({ POS: 'UTG', RFI: 0, threeBet: 0.08, fourBet: 0, bluff: 0 });

    const added = [...out.xrfi.keys()].filter(h => h !== 'AA');
    expect(added.length).toBeGreaterThan(0);
    for (const h of added) expect(out.xrfi.get(h)).toEqual(['3B']);
  });

  it('XRFI com 4B avulso folda vs open (sem 3B/CALL não há defesa definida)', async () => {
    // 4B não é pintável no XRFI (picker: CALL/3B/ALL-IN);
    // linha avulsa não pode nem 4-betar o nada nem herdar o CALL antigo.
    const { decideVillainAction } = await import('../../../src/engine/preflop.js');
    expect(decideVillainAction('AA', undefined, ['4B'], 'open')).toBe('FOLD');
  });
});
