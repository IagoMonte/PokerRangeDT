import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// cria cor nova (paleta é lei). Tokens sl-hover 8 / sl-active 12 = overlay
// da content color via color-mix. Focus fica no ring global (medido
// 6.88:1) — overlay duplo seria ruído.
const load = (p) =>
  readFileSync(new URL('../../../src/' + p, import.meta.url), 'utf8');

describe('table behavior', () => {
  it('tokens existem no CSS global (8 hover / 12 pressed, color-mix)', () => {
    const css = load('style.css');
    expect(css).toContain('.sl-hover:hover');
    expect(css).toContain('.sl-active:active');
    expect(css).toContain('currentColor 8%');
    expect(css).toContain('currentColor 12%');
  });

  it('superfícies listadas usam os tokens, sem bg ad-hoc', () => {
    expect(load('components/RangeGrid.vue')).toContain('sl-hover sl-active');
    expect(load('components/PredictRangeModal.vue')).toContain('sl-hover sl-active');
    expect(load('components/RangeLegend.vue')).toContain('sl-hover');
    expect(load('components/HandRow.vue')).toContain('sl-hover');
    expect(load('components/pages/profile.vue')).toContain('sl-hover sl-active');
    expect(load('components/pages/villains.vue')).toContain('sl-hover sl-active');
    expect(load('components/RangeContext.vue')).toContain('sl-hover sl-active');
    const nav = load('components/navBar.vue');
    expect(nav).toContain('sl-hover');
    expect(nav).not.toContain('hover:bg-bg-tertiary');
    expect(nav).not.toContain('hover:bg-border-active');
    const drill = load('components/pages/drill.vue');
    expect(drill).not.toContain('hover:bg-border-active');
  });
});
