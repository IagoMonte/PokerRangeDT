import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Ranges } from '../../../src/composables/useRangeGame.js';
import { actionLines } from '../../../src/composables/useActions.js';
import { useRangeMatrix } from '../../../src/composables/useRangeMatrix.js';
import { usePersistence } from '../../../src/composables/usePersistence.js';
import { useVillains } from '../../../src/composables/useVillains.js';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

// loadAll fazia push das lines sem limpar — cada mão do drill
// (startRound) e cada visita ao /range duplicava as lines do builder. O
// ciclo da matrix atravessava "Aggro, Aggro…" (click parecia morto) e o
// save persistia as duplicatas no localStorage.
describe('loadAll não duplica actionLines', () => {
  beforeEach(() => {
    localStorage.clear();
    actionLines.length = 0;
    localStorage.setItem('poker_action_lines', JSON.stringify([
      { id: 'line_1', name: 'Aggro', color: '#fff', sequence: [{ token: 'OR', size: null }, { token: '4B', size: null }] },
    ]));
  });

  it('três loads seguidos mantêm 1 cópia da line', () => {
    const { loadAll } = usePersistence();
    const { villains } = useVillains();
    loadAll(Ranges, villains);
    loadAll(Ranges, villains);
    loadAll(Ranges, villains);
    expect(actionLines.filter((l) => l.name === 'Aggro')).toHaveLength(1);
  });

  it('ciclo da matrix vê a line uma vez só', () => {
    const { loadAll } = usePersistence();
    const { villains } = useVillains();
    loadAll(Ranges, villains);
    loadAll(Ranges, villains);
    const mx = useRangeMatrix();
    expect(mx.actions.value.filter((a) => a === 'Aggro')).toHaveLength(1);
  });
});
