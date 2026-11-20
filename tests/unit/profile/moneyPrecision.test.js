import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), 'utf8');

// Em stakes pequenos (blinds 0.1/0.2) arredondar o PnL para inteiro faz
// ganhos reais aparecerem como "0". fmtMoney já limita as casas decimais.
describe('valores de dinheiro mantêm precisão na tela', () => {
  it.each([
    'components/HandRow.vue',
    'components/pages/play.vue',
    'components/pages/profile.vue',
  ])('%s não arredonda para inteiro antes de formatar', (file) => {
    expect(src(file)).not.toMatch(/fmtMoney\(Math\.round\(/);
  });
});
