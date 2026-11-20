import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// não alcançava a unidade. Controle na /play com o mesmo store
// (useDisplayUnit), top-right do palco (Hands fica à esquerda, combo
// abaixo dele — sem sobreposição).
const play = readFileSync(
  new URL('../../../src/components/pages/play.vue', import.meta.url),
  'utf8'
);

describe('table behavior', () => {
  it('importa store compartilhado e renderiza o toggle', () => {
    expect(play).toContain('displayUnit, setDisplayUnit');
    expect(play).toContain('setDisplayUnit(\'bb\')');
    expect(play).toContain('setDisplayUnit(\'chips\')');
    expect(play).toContain('aria-label="Unidade de exibição"');
  });

  it('posicionado top-right, fora do caminho de Hands/combo', () => {
    expect(play).toContain('top-2 right-2');
  });
});
