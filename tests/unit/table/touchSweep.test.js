import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// 44px nos pontos que a varredura headless (audit62g.json) flagrou.
// Exceções registradas: JargonTip/plaque usam área invisível (specification,
// o audit mede só o visual); range/color inputs seguem WCAG 2.5.8 (24px);
// builder fica p/ the builder (dono da passada).
const load = (p) =>
  readFileSync(new URL('../../../src/' + p, import.meta.url), 'utf8');

describe('table behavior', () => {
  it('nav: avatar, hamburger, links mobile e desktop', () => {
    const nav = load('components/navBar.vue');
    expect(nav).toContain('h-11 w-11');
    expect(nav).toContain('min-h-[44px] min-w-[44px]');
    expect(nav).not.toContain('h-10 w-10');
  });

  it('forms: drill, villains, profile, range selects', () => {
    expect(load('components/pages/drill.vue')).toContain('min-h-[44px]');
    expect(load('components/pages/villains.vue')).toContain('min-h-[44px]');
    expect(load('components/pages/profile.vue')).toContain('min-h-[44px]');
    expect(load('components/RangeContext.vue')).toContain('px-2 py-1 min-h-[44px]');
    expect(load('components/RangeLibrary.vue')).toContain('px-4 py-2 min-h-[44px]');
  });

  it('predict modal: cancel + submit', () => {
    expect(load('components/PredictRangeModal.vue')).toContain('px-4 py-2 min-h-[44px]');
    expect(load('components/PredictRangeModal.vue')).toContain('px-6 py-2 min-h-[44px]');
  });

  it('✕ do legend com largura cheia 44', () => {
    expect(load('components/RangeLegend.vue')).toContain('min-w-[44px]');
  });
});
