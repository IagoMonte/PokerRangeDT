import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// stacking context), então seu z-[100] competia só dentro do z-10 do
// feltro — e a sidebar Hands (z-40 no nível da página) pintava por cima,
// sumindo com a ação do usuário. Sem este contrato, um rework volta a
// aninhar o modal no palco e o overlap volta silencioso.
const predict = readFileSync(
  new URL('../../../src/components/PredictRangeModal.vue', import.meta.url),
  'utf8'
);
const sidebar = readFileSync(
  new URL('../../../src/components/HandSidebar.vue', import.meta.url),
  'utf8'
);

describe('predict modal stacking', () => {
  it('predict escapa do stacking context do palco (teleport p/ body)', () => {
    expect(predict).toContain('<Teleport to="body">');
  });

  it('predict na mesma camada do modal HH (z-50), sidebar continua 40', () => {
    expect(predict).toContain('z-50');
    expect(predict).not.toContain('z-[100]');
    expect(sidebar).toContain('z-40');
  });
});
