import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// lógica (P1 fechado). Sem este contrato, o builder apodrece de novo em
// silêncio enquanto o resto anda.
const load = (p) =>
  readFileSync(new URL('../../../src/' + p, import.meta.url), 'utf8');

describe('table behavior', () => {
  it('action line builder: alvos 44 + labels nos inputs', () => {
    const b = load('components/ActionLineBuilder.vue');
    expect(b).toContain('min-h-[44px] min-w-[44px]');
    expect(b).toContain('w-11 h-11');
    expect(b).toContain('aria-label="Size in big blinds"');
    expect(b).toContain('aria-label="Close builder"');
  });

  it('legend modais: help sem title + 44, inputs e footers 44', () => {
    const l = load('components/RangeLegend.vue');
    expect(l).toContain('aria-label="Help: action rules and tokens"');
    expect(l).not.toContain('title="Help"');
    expect(l).toContain('icon-hit');
    expect(l).toContain('px-3 py-2 min-h-[44px]');
  });
});
