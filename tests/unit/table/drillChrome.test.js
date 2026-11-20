import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// atrás do modal eram chrome morto (e o combo stale do drill anterior
// vazava por cima). Controles do drill só existem durante o drill.
const play = readFileSync(
  new URL('../../../src/components/pages/play.vue', import.meta.url),
  'utf8'
);

describe('controles só durante o drill', () => {
  it('dock, hands e combo escondidos com StartDrill ativo', () => {
    expect(play).toContain('<button v-if="!showStartDrill && !sidebarOpen" @click="setSidebarOpen(true)"');
    expect(play).toContain('<div v-if="!showStartDrill" id="actions-container"');
    expect(play).toContain('v-if="liveCombo >= 2 && !showStartDrill"');
  });

  it('play again zera a sessão (sem combo stale no popup)', () => {
    expect(play).toMatch(/playAgain[\s\S]*?drillStartISO\.value = null/);
  });
});
