import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// indistinguível do desabilitado num relance, o usuário nem tenta.
// Habilitado agora é sólido; desabilitado cai p/ 40% + sem cursor.
const ctx = readFileSync(
  new URL('../../../src/components/RangeContext.vue', import.meta.url),
  'utf8'
);

describe('table behavior', () => {
  it('habilitado sólido (bg + texto + borda cheios)', () => {
    expect(ctx).toContain('bg-action-fold text-bg-primary');
    expect(ctx).toContain('border-action-fold hover:brightness-110');
    expect(ctx).not.toContain('bg-action-fold/10');
  });

  it('desabilitado com queda + cursor', () => {
    expect(ctx).toContain('disabled:opacity-40');
    expect(ctx).toContain('disabled:cursor-not-allowed');
  });
});
