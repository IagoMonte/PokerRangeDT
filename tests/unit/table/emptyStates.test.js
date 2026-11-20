import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// diz o que fazer e o que desbloqueia ("jogue N mãos p/ X"). Sem este
// contrato, uma lista nova volta ao "No hands yet." seco.
const load = (p) =>
  readFileSync(new URL('../../../src/' + p, import.meta.url), 'utf8');

describe('table behavior', () => {
  it('profile history: o que fazer + o que desbloqueia', () => {
    expect(load('components/pages/profile.vue')).toContain(
      'No hands yet — play a drill to unlock history.'
    );
  });

  it('coach vazio: N honesto (20 = maior minN das regras)', () => {
    const coach = load('components/pages/coach.vue');
    expect(coach).toContain('20+ mãos desbloqueiam todos os insights');
    expect(coach).toContain('cada regra exige 8–20');
  });
});
