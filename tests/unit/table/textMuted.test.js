import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// current contrast requirements). Informação em muted quebra WCAG AA. Sem este contrato, um rework
// volta a pintar status/controle com a cor fraca e o texto some p/ quem
// enxerga mal. Falha alto se muted voltar a contexto informativo.
const table = readFileSync(
  new URL('../../../src/components/TableStatus.vue', import.meta.url),
  'utf8'
);
const legend = readFileSync(
  new URL('../../../src/components/RangeLegend.vue', import.meta.url),
  'utf8'
);

describe('table behavior', () => {
  it('timer idle do TableStatus usa secondary (status é informação)', () => {
    expect(table).toContain("'text-text-secondary'");
    expect(table).not.toContain('text-text-muted');
  });

  it('✕ remover-ação do RangeLegend usa secondary (controle, não decor)', () => {
    expect(legend).not.toContain('text-text-muted');
  });
});
