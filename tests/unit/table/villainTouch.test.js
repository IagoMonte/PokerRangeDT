import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// 430. Visual intacto (mesmo padding/texto), só o piso de 44px.
const villains = readFileSync(
  new URL('../../../src/components/pages/villains.vue', import.meta.url),
  'utf8'
);

describe('table behavior', () => {
  it('linhas do dropdown com piso 44px', () => {
    expect(villains).toContain('min-h-[44px] flex items-center');
  });
});
