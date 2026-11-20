import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// erra o sweet spot do polegar. Flutuante = acima da mesa (sombra honesta,
// mesmo radius das superfícies flutuantes). Botões 48px/hints/atalhos
// intactos — só o container mexe. Sem este contrato, um rework cola de
// volta no bottom-0 full-bleed.
const play = readFileSync(
  new URL('../../../src/components/pages/play.vue', import.meta.url),
  'utf8'
);
const btns = readFileSync(
  new URL('../../../src/components/actionButtons.vue', import.meta.url),
  'utf8'
);

describe('table behavior', () => {
  it('container flutua: margens + radius + elevação, sem full-bleed', () => {
    expect(play).toContain('inset-x-3 bottom-3');
    expect(play).toContain('rounded-lg');
    expect(play).toContain('shadow-2xl');
    expect(play).toContain('safe-area-inset-bottom');
    expect(play).toContain('max-w-[430px]');
    expect(play).not.toContain('bottom-0 z-20');
  });

  it('botões intactos: 48px, hints, atalhos, borda 3px', () => {
    expect(btns).toContain('min-h-[48px]');
    expect(btns).toContain('<kbd');
    expect(btns).toContain('border-l-[3px]');
  });
});
