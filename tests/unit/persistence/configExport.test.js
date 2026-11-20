import { describe, it, expect, beforeEach } from 'vitest';
import { ref } from 'vue';
import { actionLines, actionConfig } from '../../../src/composables/useActions.js';
import { Ranges } from '../../../src/composables/useRangeGame.js';
import { Drills } from '../../../src/composables/useDrillSettings.js';
import { usePersistence } from '../../../src/composables/usePersistence.js';

const mkVillain = (name) => ({ stats: { NAME: name, RFI: 0.5 } });

function reset() {
  for (const pos of Object.keys(Ranges.RFI)) Ranges.RFI[pos].clear();
  for (const pos of Object.keys(Ranges.XRFI)) Ranges.XRFI[pos].clear();
  actionLines.length = 0;
}

// o "Export Library" só leva ranges+villains+cores; trocar de máquina
// perdia os drills e as linhas de ação. A config completa tem que voltar
// idêntica depois de um round-trip, e JSON ruim nunca importa pela metade.
describe('config completa: export → import', () => {
  beforeEach(reset);

  it('round-trip restaura ranges, villains, drills e linhas de ação', () => {
    const { buildConfigPayload, applyConfigPayload } = usePersistence();
    Ranges.RFI.UTG.set('AKs', ['OR']);
    Drills['meu drill'] = { preflop: true, posflop: false, ActionTime: 7, blinds: [1, 2], stacks: 80, hands: 5, villainDelayMs: 0, predictAlways: false };
    actionLines.push({ id: 'l1', name: 'minha linha', sequence: [{ token: 'OR', size: null }] });
    const villains = ref([mkVillain('V-A')]);

    const payload = JSON.parse(JSON.stringify(buildConfigPayload(Ranges, villains)));

    reset();
    delete Drills['meu drill'];
    const target = ref([]);
    applyConfigPayload(Ranges, target, payload);

    expect(Ranges.RFI.UTG.get('AKs')).toEqual(['OR']);
    expect(Drills['meu drill'].ActionTime).toBe(7);
    expect(actionLines.map(l => l.name)).toContain('minha linha');
    expect(target.value[0].stats.NAME).toBe('V-A');
    expect(target.value[0].stats).toEqual({ NAME: 'V-A', RFI: 0.5 });
    delete Drills['meu drill'];
  });

  it('JSON inválido ou de outra versão dá throw e não toca em nada', () => {
    const { applyConfigPayload } = usePersistence();
    Ranges.RFI.UTG.set('AA', ['OR']);
    const target = ref([mkVillain('fica')]);
    expect(() => applyConfigPayload(Ranges, target, { version: 99 })).toThrow(/unsupported version/i);
    expect(() => applyConfigPayload(Ranges, target, 'lixo{')).toThrow(/invalid JSON/);
    expect(Ranges.RFI.UTG.get('AA')).toEqual(['OR']);
    expect(target.value[0].stats.NAME).toBe('fica');
  });

  it('formato inválido de qualquer campo rejeita tudo antes de aplicar (sem import pela metade)', () => {
    const { applyConfigPayload } = usePersistence();
    Ranges.RFI.UTG.set('AA', ['OR']);
    const before = actionLines.length;
    const target = ref([mkVillain('fica')]);
    const bad = {
      version: 1,
      actionLines: [{ id: 'novo', name: 'novo', sequence: [{ token: 'OR', size: null }] }],
      ranges: 'x',
    };
    expect(() => applyConfigPayload(Ranges, target, bad)).toThrow(/malformed "ranges"/);
    expect(actionLines.length).toBe(before);
    expect(Ranges.RFI.UTG.get('AA')).toEqual(['OR']);
    expect(target.value[0].stats.NAME).toBe('fica');
  });
});
