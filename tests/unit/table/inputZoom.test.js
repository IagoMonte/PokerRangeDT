import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// usuário do fluxo no celular, invisível em headless. Regra global (não
// por tela) p/ todo input textual/select/textarea no ≤600px.
const css = readFileSync(
  new URL('../../../src/style.css', import.meta.url),
  'utf8'
);

describe('table behavior', () => {
  it('media ≤600px com piso 16px p/ textuais, fora gestos/caixas', () => {
    expect(css).toContain('@media (max-width: 600px)');
    expect(css).toContain('font-size: 16px !important');
    expect(css).toContain("input:not([type='checkbox'])");
    expect(css).toContain('textarea');
  });
});
