import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const nav = readFileSync(new URL('../../../src/components/navBar.vue', import.meta.url), 'utf8');

// A barra tem 64px de altura (h-16); as cartas hero (68px) estouravam o topo.
describe('logo da navbar', () => {
  it('usa cartas que cabem dentro da barra', () => {
    expect(nav).toContain('h-16');
    expect(nav).not.toMatch(/:variant="'hero'"/);
  });
});
