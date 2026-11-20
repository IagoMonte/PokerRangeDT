import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// feature some. Visual continua 10px; ::after invisível completa 44px
// na vertical (largura já passa). Sem este contrato, um rework tira a
// classe e o alvo volta a encolher.
const seat = readFileSync(
  new URL('../../../src/components/PlayerSeat.vue', import.meta.url),
  'utf8'
);

describe('table behavior', () => {
  it('botão carrega a classe de hit + ::after vertical', () => {
    expect(seat).toContain('predict-hit');
    expect(seat).toContain('.predict-hit::after');
    expect(seat).toContain('inset: -13px -4px');
  });
});
