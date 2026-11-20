import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// quebra/clipa. Centros % são lei (regra 6) — o fix é só padding interno
// (empurra o conteúdo p/ o centro, âncora intacta) + truncate no texto.
const seat = readFileSync(
  new URL('../../../src/components/PlayerSeat.vue', import.meta.url),
  'utf8'
);

describe('table behavior', () => {
  it('padding interno por borda (x<10 / x>90), âncora % intacta', () => {
    expect(seat).toContain('edgePad');
    expect(seat).toMatch(/x < 10.*pl-4/s);
    expect(seat).toMatch(/x > 90.*pr-4/s);
    expect(seat).toContain("left: position.x + '%'");
  });

  it('nome e balance truncam dentro da caixa', () => {
    expect(seat).toContain('max-w-full truncate');
  });
});
