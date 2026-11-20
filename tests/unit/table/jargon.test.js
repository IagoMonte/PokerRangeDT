import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// exclui touch + teclado (WCAG 1.4.13/2.1.1). Cada página com jargão tem
// gloss visível uma vez ou toggletip. Sem este contrato, uma seção nova
// volta a despejar sigla sem tradução.
const tip = readFileSync(
  new URL('../../../src/components/JargonTip.vue', import.meta.url),
  'utf8'
);
const load = (p) =>
  readFileSync(new URL('../../../src/' + p, import.meta.url), 'utf8');

describe('table behavior', () => {
  it('toggletip nunca depende só de title: Esc + aria-describedby + área 44px', () => {
    expect(tip).toContain('aria-describedby');
    expect(tip).toContain('aria-expanded');
    expect(tip).toContain("'Escape'");
    expect(tip).toContain('role="tooltip"');
    // Visual 20px, toque 44px (20 + 2×12 do ::after invisível).
    expect(tip).toContain('inset: -12px');
    expect(tip).not.toMatch(/title="[^"]*RFI|title="[^"]*3-bet/);
  });

  it('no toque o tap não abre e fecha na hora: mouseenter/focus só abrem com hover real', () => {
    expect(tip).toContain("(hover: hover)");
    expect(tip).toContain('@mouseenter="hoverOpen"');
    expect(tip).toContain('@focus="hoverOpen"');
    expect(tip).not.toContain('@focus="open = true"');
  });

  it('o balão é reposicionado quando sairia do viewport (borda esquerda/direita)', () => {
    expect(tip).toContain('getBoundingClientRect');
    expect(tip).toContain('clientWidth');
    expect(tip).toContain('marginLeft');
  });

  it('toque em aparelho híbrido (hover + touch) usa só o click, via pointerType', () => {
    expect(tip).toContain('@pointerdown="onPointerDown"');
    expect(tip).toContain("e.pointerType === 'touch'");
    expect(tip).toMatch(/hoverOpen\(\) \{\s*if \(touching/);
  });

  it('legenda visível uma vez por seção de jargão', () => {
    expect(load('components/RangeContext.vue')).toContain('RFI = first to raise');
    expect(load('components/pages/profile.vue')).toContain('3B = re-raise vs open');
    expect(load('components/pages/profile.vue')).toContain('A = monsters');
    expect(load('components/pages/villains.vue')).toContain('RFI = open frequency');
    expect(load('components/ActionLineBuilder.vue')).toContain('OR = open raise');
  });

  it('coach (texto longo) usa toggletip com glossário PT', () => {
    const coach = load('components/pages/coach.vue');
    expect(coach).toContain('JargonTip');
    expect(coach).toContain('W$SD');
  });
});
