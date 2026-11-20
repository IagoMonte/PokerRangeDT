import { describe, it, expect, beforeEach } from 'vitest';
import { rangeGame, Ranges } from '../../../src/composables/useRangeGame';
import { HAND_RANKINGS } from '../../../src/infra/handRankings';

const { getModRange } = rangeGame();

// o trim corta COMBOS (mãos inteiras, das mais fracas) para atingir o
// alvo do stat — mas nunca corta DECISÕES: mão sobrevivente mantém a linha
// pintada token por token (OR ALL-IN continua OR ALL-IN).
describe('trim corta combos, nunca decisões', () => {
  beforeEach(() => {
    for (const pos in Ranges.RFI) Ranges.RFI[pos].clear();
    for (const pos in Ranges.XRFI) Ranges.XRFI[pos].clear();
  });

  it('sobrevivente mantém linha multi-token sob pressão de trim', () => {
    Ranges.RFI['BTN'].set('AA', ['OR', 'ALL-IN']);
    Ranges.RFI['BTN'].set('KK', ['OR', '4B']);
    for (const h of HAND_RANKINGS.slice(2, 80)) Ranges.RFI['BTN'].set(h, ['OR']);

    const out = getModRange({ POS: 'BTN', RFI: 0.15, threeBet: 0.08, fourBet: 0.05, bluff: 0.3, call: 0.08 });

    // trim cortou mãos (80 pintadas → bem menos na saída)
    expect(out.rfi.size).toBeLessThan(80);
    // mas as linhas das sobreviventes estão intactas
    expect(out.rfi.get('AA')).toContain('OR');
    expect(out.rfi.get('AA')).toContain('ALL-IN');
    expect(out.rfi.get('KK')).toEqual(['OR', '4B']);
  });

  it('não vaza mutação para o range guardado', () => {
    Ranges.RFI['BTN'].set('AA', ['OR', 'ALL-IN']);

    getModRange({ POS: 'BTN', RFI: 0.15, threeBet: 0.08, fourBet: 0.5, bluff: 0.3, call: 0.08 });

    expect(Ranges.RFI['BTN'].get('AA')).toEqual(['OR', 'ALL-IN']);
  });
});

describe('higiene de linhas do engine', () => {
  beforeEach(() => {
    for (const pos in Ranges.RFI) Ranges.RFI[pos].clear();
    for (const pos in Ranges.XRFI) Ranges.XRFI[pos].clear();
  });

  it('append de 4B pula linha terminal (FOLD/ALL-IN)', () => {
    Ranges.RFI['UTG'].set('AA', ['OR', 'FOLD']);
    Ranges.RFI['UTG'].set('KK', ['OR', 'ALL-IN']);

    const out = getModRange({ POS: 'UTG', RFI: 0.2, threeBet: 0, fourBet: 0.5, bluff: 0 });

    expect(out.rfi.get('AA')).toEqual(['OR', 'FOLD']);
    expect(out.rfi.get('KK')).toEqual(['OR', 'ALL-IN']);
  });

  it('tira 3B do RFI (não existe 3B first-in)', () => {
    Ranges.RFI['UTG'].set('AA', ['OR', '3B', '4B']);
    Ranges.RFI['UTG'].set('KK', ['3B']);

    // RFI mínimo: sem expand para reencher, só o strip aparece.
    const out = getModRange({ POS: 'UTG', RFI: 0.005, threeBet: 0, fourBet: 0, bluff: 0 });

    expect(out.rfi.get('AA')).toEqual(['OR', '4B']);
    expect(out.rfi.has('KK')).toBe(false);
  });
});
