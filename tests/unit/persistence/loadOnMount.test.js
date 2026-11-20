import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { ref } from 'vue';
import { usePersistence } from '../../../src/composables/usePersistence.js';

const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), 'utf8');

function stubStorage(data) {
  vi.stubGlobal('localStorage', {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  });
}

afterEach(() => vi.unstubAllGlobals());

// Perfis de vilão salvos precisam voltar na tela /villains depois de F5;
// senão o próximo Save sobrescreve tudo com os defaults.
describe('loadAll na tela de vilões', () => {
  it('carrega os perfis salvos quando só o ref de vilões é passado', () => {
    const { saveAll, loadAll } = usePersistence();
    const saved = [{ stats: { NAME: 'V-Maniac', RFI: 0.5 } }];
    stubStorage({});
    saveAll({ RFI: {}, XRFI: {} }, ref(saved));

    const villains = ref([]);
    loadAll(null, villains);

    expect(villains.value).toHaveLength(1);
    expect(villains.value[0].stats.NAME).toBe('V-Maniac');
  });

  it('save antigo com campo state (ou sem ele) carrega sem erro', () => {
    const { loadAll } = usePersistence();
    stubStorage({ villains_data: JSON.stringify([{ stats: { NAME: 'A' } }, { stats: { NAME: 'B' }, state: { Range: [['AA', ['OR']]] } }]) });
    const villains = ref([]);
    expect(() => loadAll(null, villains)).not.toThrow();
    expect(villains.value.map((v) => v.stats.NAME)).toEqual(['A', 'B']);
    expect(villains.value[1].state).toBeUndefined();
  });

  it('villains.vue usa a assinatura (Ranges, villains)', () => {
    expect(src('components/pages/villains.vue')).toContain('loadAll(null, villains)');
  });
});

// Export/import de config sem carregar os drills salvos regravava só os
// built-ins e apagava os drills criados pelo usuário.
describe('config no Profile preserva drills customizados', () => {
  it('export e import carregam os drills salvos antes de usar a config', () => {
    const profile = src('components/pages/profile.vue');
    const exp = profile.slice(profile.indexOf('function exportConfig'), profile.indexOf('async function importConfig'));
    const imp = profile.slice(profile.indexOf('async function importConfig'), profile.indexOf('const day = ref'));
    expect(exp).toContain('loadDrills()');
    expect(imp.indexOf('loadDrills()')).toBeGreaterThan(-1);
    expect(imp.indexOf('loadDrills()')).toBeLessThan(imp.indexOf('importConfigJSON'));
  });
});
