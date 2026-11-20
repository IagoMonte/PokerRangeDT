import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { notify, clearNotice, notice } from '../../../src/composables/useRangeMatrix.js';

// veredito na decisão errada. A vez nova dispensa o anterior — sem fila,
// sem duração nova. Falha alto se o waitHero voltar a herdar toast.
describe('table behavior', () => {
  it('clearNotice esvazia o canal e mata o timer', () => {
    notify('−EV ✗ CALL', 'NEGATIVE');
    expect(notice.value).not.toBeNull();
    clearNotice();
    expect(notice.value).toBeNull();
  });

  it('vez nova do herói dispensa o veredito anterior', () => {
    const play = readFileSync(
      new URL('../../../src/components/pages/play.vue', import.meta.url),
      'utf8'
    );
    expect(play).toContain('clearNotice');
    expect(play).toMatch(/function waitHero[\s\S]*?clearNotice\(\)/);
  });
});
