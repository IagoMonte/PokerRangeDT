import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// escondido; segmented = 1 tap, sempre visível (recognition > recall).
// Position (6 opções) fica dropdown — 6 segmentos quebrariam em wrap.
// Critério: ≤3 opções = segmented.
const ctx = readFileSync(
  new URL('../../../src/components/RangeContext.vue', import.meta.url),
  'utf8'
);

describe('table behavior', () => {
  it('RFI/XRFI em grupo de 2 botões com estado visível', () => {
    expect(ctx).toContain('role="group"');
    expect(ctx).toContain('aria-pressed');
    expect(ctx).not.toContain('value="RFI"');
    expect(ctx).not.toContain('value="XRFI"');
  });

  it('position continua dropdown (6 opções)', () => {
    expect(ctx).toContain('<select');
    expect(ctx).toContain('availablePositions');
  });
});
