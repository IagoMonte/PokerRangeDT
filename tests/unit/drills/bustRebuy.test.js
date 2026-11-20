import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// bust encerra o drill do herói (tela de derrota), rebuy é só p/
// vilão. Se o loop voltar a recomprar o herói, a falência vira
// impossível e o drill mente sobre sobrevivência.
const play = readFileSync(new URL('../../../src/components/pages/play.vue', import.meta.url), 'utf8');

describe('bust/rebuy', () => {
  it('rebuy só p/ vilão; herói bustado encerra com derrota', () => {
    expect(play).toContain('i !== HERO_SEAT && stack < bb');
    expect(play).toContain('finish(true)');
    expect(play).toContain('busted');
    expect(play).toContain("{{ summary.busted ? 'Busted' : 'Drill complete' }}");
  });

  it('bust conta mãos completadas e fecha a sessão', () => {
    expect(play).toContain('hands: busted ? handNo.value : handsTotal.value');
    // finish() único p/ os dois finais: endSession sempre roda.
    const finishes = (play.match(/finish\(/g) || []).length;
    expect(finishes).toBe(2); // bust + complete
  });
});
