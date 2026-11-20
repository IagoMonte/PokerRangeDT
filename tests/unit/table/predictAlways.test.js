import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// aguarda — sem isso a flag seria enfeite. Skip/falha/saída resolvem a
// espera (loop nunca pendura); sem vilão não abre. Falha alto se o settle
// voltar a ignorar a flag ou se o modal perder um caminho de saída.
const load = (p) =>
  readFileSync(new URL('../../../src/' + p, import.meta.url), 'utf8');

describe('predictAlways fim de mão', () => {
  it('setting no drill (default false, sem migração)', () => {
    const ds = load('composables/useDrillSettings.js');
    expect(ds).toContain('predictAlways: false');
    const drill = load('components/pages/drill.vue');
    expect(drill).toContain('predictAlways');
    expect(drill).toContain('Predict always');
    expect(drill).toContain('?? false');
  });

  it('drills custom sobrevivem ao reload (loadDrills no mount)', () => {
    // Sem isso, criar drill com a flag e recarregar "apagava" o drill —
    // o E2E do predictAlways tropeçou aqui.
    expect(load('components/StartDrill.vue')).toContain('loadDrills()');
    expect(load('components/pages/drill.vue')).toContain('loadDrills()');
  });

  it('settle aguarda o forçado quando a flag marca', () => {
    const play = load('components/pages/play.vue');
    expect(play).toContain('predictAlways ?? false');
    expect(play).toContain('runForcedPredict(settledPreflopLines)');
    expect(play).toContain('pickPredictSeat');
    expect(play).toContain(':forced-seat="forcedPredictSeat"');
    expect(play).toContain(':on-forced-done="handleForcedDone"');
  });

  it('toda saída resolve a espera (submit, skip, sem residual, unmount)', () => {
    const table = load('components/PokerTable.vue');
    expect(table).toContain('onForcedDone?.(true)');
    expect(table).toContain('onForcedDone?.(false)');
    const play = load('components/pages/play.vue');
    expect(play).toMatch(/onUnmounted[\s\S]*?forcedResolve/);
    // Residual vazio não veta: gabarito recai no range da mão (init).
    expect(play).toContain('initResidual(villainRange(');
  });
});
