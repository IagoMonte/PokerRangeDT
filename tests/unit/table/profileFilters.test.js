import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// roubam a dobra. Roles colapsam em 1 camada (details nativo — sem JS,
// teclado grátis). Sem este contrato, os chips voltam p/ fora.
const profile = readFileSync(
  new URL('../../../src/components/pages/profile.vue', import.meta.url),
  'utf8'
);

describe('table behavior', () => {
  it('roles em details nativo de 1 camada', () => {
    expect(profile).toContain('<details');
    expect(profile).toContain('Role detail ({{ roles.length }})');
  });
});
