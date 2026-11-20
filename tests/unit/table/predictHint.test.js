import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// avatar até a 1ª descoberta por sessão — sem poluir depois. Sem este
// contrato, um rework tira o hint e o Predict volta a sumir.
const load = (p) =>
  readFileSync(new URL('../../../src/' + p, import.meta.url), 'utf8');

describe('table behavior', () => {
  it('hint 1×/sessão, morre na descoberta', () => {
    const table = load('components/PokerTable.vue');
    expect(table).toContain('poker_predict_hint_seen');
    expect(table).toContain('sessionStorage');
    expect(table).toContain(':hint-predict="showPredictHint"');
  });

  it('pulso só anel + aria que anuncia a dica', () => {
    const seat = load('components/PlayerSeat.vue');
    expect(seat).toContain('hint-pulse');
    expect(seat).toContain('@keyframes hint-pulse');
    expect(seat).toContain('Predict range aqui');
  });
});
