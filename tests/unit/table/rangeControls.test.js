import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// tinta. Linha em 44px, "+" em 44×44, ✕ com área (e visível no foco do
// teclado, não só no hover do mouse).
const legend = readFileSync(
  new URL('../../../src/components/RangeLegend.vue', import.meta.url),
  'utf8'
);

describe('table behavior', () => {
  it('chip em 44px e "+" 44×44', () => {
    expect(legend).toContain('px-2 py-1 min-h-[44px]');
    expect(legend).toContain('w-11 h-11');
    expect(legend).not.toContain('w-8 h-8');
  });

  it('✕ com área de toque e visível via teclado', () => {
    expect(legend).toContain('px-3 min-h-[44px]');
    expect(legend).toContain('group-focus-within:opacity-100');
  });
});
