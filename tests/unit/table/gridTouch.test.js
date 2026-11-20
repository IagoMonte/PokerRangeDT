import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Delegating touch to the grid container preserves precise cell selection
// while keeping the full panel, including gaps, easy to target.
const load = (p) =>
  readFileSync(new URL('../../../src/' + p, import.meta.url), 'utf8');

describe('touch delegated on the grid', () => {
  it('/range: touchstart só no container, com sonda fat-finger', () => {
    const grid = load('components/RangeGrid.vue');
    expect(grid).toContain('@touchstart.prevent="handleGridTouchStart"');
    expect(grid).not.toContain('@touchstart="handleTouchStart');
    const mx = load('composables/useRangeMatrix.js');
    expect(mx).toContain('handleGridTouchStart');
    expect(mx).toContain("closest?.('[data-hand]')");
    expect(mx).not.toContain('handleTouchStart');
  });

  it('predict: mesmo modelo, sem dica e sem duplo-ciclo', () => {
    const modal = load('components/PredictRangeModal.vue');
    expect(modal).toContain('@touchstart.prevent="handleGridTouchStart"');
    expect(modal).not.toContain('@touchstart="handleTouchStart');
    expect(modal).not.toContain('function handleTouchStart(');
  });

  it('arrasto sobrevive ao vão de 2px (closest no touchmove)', () => {
    expect(load('composables/useRangeMatrix.js')).toContain(
      "element.closest?.('[data-hand]')"
    );
    expect(load('components/PredictRangeModal.vue')).toContain(
      "closest?.('[data-hand]')"
    );
  });
});
