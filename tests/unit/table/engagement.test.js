import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Tudo deriva do analytics existente. Sem estes contratos, o resumo
// volta a "hands played" seco e o combo some da mesa.
const load = (p) =>
  readFileSync(new URL('../../../src/' + p, import.meta.url), 'utf8');

describe('table behavior', () => {
  it('play: combo ao vivo + resumo comparativo + recordes', () => {
    const play = load('components/pages/play.vue');
    expect(play).toContain('liveCombo');
    expect(play).toContain('🔥 x{{ liveCombo }}');
    expect(play).toContain('summarizeSession');
    expect(play).toContain('checkRecords');
    expect(play).toContain('Novo recorde');
    // Sem economia: nada de XP/badges/moeda como mecânica (a palavra
    // "moeda" aparece só no comentário "sem moeda" acima).
    expect(play).not.toMatch(/\bxp\b|\bbadge\b|\bcoin\b/i);
  });

  it('profile: seção streak & records do analytics', () => {
    const profile = load('components/pages/profile.vue');
    expect(profile).toContain('Streak &amp; Records');
    expect(profile).toContain('computeStreak');
    expect(profile).toContain('personalBests');
  });
});
