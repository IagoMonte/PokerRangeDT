import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rangeGame, Ranges, currentSituation, currentPosition } from '../../../src/composables/useRangeGame.js';
import { useRangeMatrix } from '../../../src/composables/useRangeMatrix.js';
import { usePersistence } from '../../../src/composables/usePersistence.js';
import { useVillains } from '../../../src/composables/useVillains.js';
import { SITUATION_ACTIONS } from '../../../src/composables/useActions.js';

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

describe('Range State', () => {
  let matrix;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    currentSituation.value = 'RFI';
    currentPosition.value = '';
    for (const pos of Object.keys(Ranges.RFI)) {
      Ranges.RFI[pos].clear();
    }
    for (const pos of Object.keys(Ranges.XRFI)) {
      Ranges.XRFI[pos].clear();
    }
    matrix = useRangeMatrix();
  });

  it('should start with an empty range', () => {
    currentPosition.value = 'UTG';
    expect(matrix.getActionForHand('AA')).toBe('fold');
  });

  it('should set and get hand actions', () => {
    currentPosition.value = 'UTG';
    matrix.setHandAction('AA', 'OR');
    expect(matrix.getActionForHand('AA')).toBe('OR');
  });

  it('should persist ranges to localStorage', () => {
    currentPosition.value = 'UTG';
    matrix.setHandAction('AA', 'OR');

    const savedData = localStorage.getItem('poker_ranges');
    expect(savedData).toBeDefined();
    const parsed = JSON.parse(savedData);
    expect(parsed.RFI).toBeDefined();
    expect(parsed.RFI.UTG).toBeDefined();
  });

  it('should cleanup range when clearCurrentRange is called', () => {
    currentPosition.value = 'UTG';
    matrix.setHandAction('AA', 'OR');
    matrix.setHandAction('KK', 'OR');
    expect(matrix.getActionForHand('AA')).toBe('OR');

    matrix.clearCurrentRange();
    expect(matrix.getActionForHand('AA')).toBe('fold');
    expect(matrix.getActionForHand('KK')).toBe('fold');
  });

  it('should export range grouped by action', () => {
    currentPosition.value = 'UTG';
    matrix.setHandAction('AA', 'OR');
    matrix.setHandAction('KK', 'OR');

    const exported = matrix.exportRange();
    expect(exported['OR']).toContain('AA');
    expect(exported['OR']).toContain('KK');
  });

  it('should handle fold by deleting from range', () => {
    currentPosition.value = 'UTG';
    matrix.setHandAction('AA', 'OR');
    expect(matrix.getActionForHand('AA')).toBe('OR');

    matrix.setHandAction('AA', 'fold');
    expect(matrix.getActionForHand('AA')).toBe('fold');
    expect(Ranges.RFI.UTG.has('AA')).toBe(false);
  });

  it('should return empty map when no position selected', () => {
    currentPosition.value = '';
    expect(matrix.getActionForHand('AA')).toBe('fold');
  });

  it('should cycle through available actions for RFI', () => {
    currentPosition.value = 'UTG';
    expect(matrix.getActionForHand('AA')).toBe('fold');

    matrix.cycleHandAction('AA');
    expect(matrix.getActionForHand('AA')).toBe('OR');

    matrix.cycleHandAction('AA');
    expect(matrix.getActionForHand('AA')).toBe('LIMP');

    matrix.cycleHandAction('AA');
    expect(matrix.getActionForHand('AA')).toBe('fold');
  });

  it('should cycle through central XRFI actions in order', () => {
    // painting, cycling and exporting share a single owner
    // (SITUATION_ACTIONS). XRFI includes 4B because the engine emits it —
    // the cycle must follow the central list, not a hardcoded copy.
    currentSituation.value = 'XRFI';
    currentPosition.value = 'BB';
    expect(matrix.getActionForHand('AA')).toBe('fold');

    for (const action of SITUATION_ACTIONS.XRFI.slice(1)) {
      matrix.cycleHandAction('AA');
      expect(matrix.getActionForHand('AA')).toBe(action);
    }

    matrix.cycleHandAction('AA');
    expect(matrix.getActionForHand('AA')).toBe('fold');
  });

  it('should notify instead of blocking with alert when no position selected', () => {
    // alert() freezes the page and kills automation. A non-blocking
    // notice keeps UX responsive and the grid untouched.
    currentPosition.value = '';
    expect(() => matrix.handleMouseDown(0, 0, 'AA')).not.toThrow();
    expect(matrix.notice.value).not.toBeNull();
    expect(matrix.notice.value.message).toMatch(/position/i);
    expect(matrix.getActionForHand('AA')).toBe('fold');
  });

  it('should restore ranges from localStorage via loadAll (boot restore)', () => {
    // /range must reload the saved library on boot, otherwise the next
    // save() overwrites storage with empty state and the user loses everything.
    const { loadAll } = usePersistence();
    const { villains } = useVillains();
    currentPosition.value = 'UTG';
    matrix.setHandAction('AA', 'OR');

    // Simulate fresh boot: wipe in-memory state, storage keeps the data.
    Ranges.RFI.UTG.clear();
    expect(matrix.getActionForHand('AA')).toBe('fold');

    loadAll(Ranges, villains);
    expect(matrix.getActionForHand('AA')).toBe('OR');
  });
});
