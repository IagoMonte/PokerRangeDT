import { describe, it, expect, vi } from 'vitest';
import {
  executeAction,
  unwiredTable,
  actionLines,
  useActions,
} from '../../../src/composables/useActions.js';

const { addActionLine, removeActionLine } = useActions();

function fakeTable() {
  return {
    openRaise: vi.fn(() => 'raised'),
    call: vi.fn(() => 'called'),
    reRaise: vi.fn((size, level) => `reraise-${level}`),
    fold: vi.fn(() => 'folded'),
    allIn: vi.fn(() => 'shoved'),
    limp: vi.fn(() => 'limped'),
  };
}

describe('executeAction (token → table function switch)', () => {
  it('dispatches each token to its table function with the parsed size', () => {
    const table = fakeTable();
    const out = executeAction('OR 3bb', { table });
    expect(table.openRaise).toHaveBeenCalledWith({ value: 3, unit: 'bb' });
    expect(out).toEqual(['raised']);
  });

  it('passes the street level to reRaise (3B → 3, 4B → 4)', () => {
    const table = fakeTable();
    executeAction('OR 3B 4B', { table });
    expect(table.reRaise).toHaveBeenNthCalledWith(1, null, 3);
    expect(table.reRaise).toHaveBeenNthCalledWith(2, null, 4);
  });

  it('runs full progressions in order', () => {
    const table = fakeTable();
    const out = executeAction('OR 3B FOLD', { table });
    expect(table.openRaise).toHaveBeenCalledTimes(1);
    expect(table.reRaise).toHaveBeenCalledWith(null, 3);
    expect(table.fold).toHaveBeenCalledTimes(1);
    expect(out).toEqual(['raised', 'reraise-3', 'folded']);
  });

  it('accepts a single step object too', () => {
    const table = fakeTable();
    executeAction({ token: 'CALL', size: null }, { table });
    expect(table.call).toHaveBeenCalledWith(null);
  });

  it('fails loud on unknown tokens and bad input', () => {
    const table = fakeTable();
    expect(() => executeAction([{ token: 'RAISE', size: null }], { table })).toThrow(/invalid step/);
    expect(() => executeAction(null, { table })).toThrow();
  });

  it('routes LIMP to table.limp with no size', () => {
    const table = fakeTable();
    const out = executeAction('LIMP FOLD', { table });
    expect(table.limp).toHaveBeenCalledTimes(1);
    expect(table.fold).toHaveBeenCalledTimes(1);
    expect(out).toEqual(['limped', 'folded']);
  });

  it('rejects raw arrays with illegal order before touching the table', () => {
    const table = fakeTable();
    const bad = [
      { token: 'OR', size: null },
      { token: 'FOLD', size: null },
      { token: 'CALL', size: null },
    ];
    expect(() => executeAction(bad, { table })).toThrow(/nothing can come after FOLD/);
    expect(table.openRaise).not.toHaveBeenCalled();
    expect(table.fold).not.toHaveBeenCalled();
  });

  it('the default table throws (not wired until the drill loop)', () => {
    for (const fn of Object.values(unwiredTable)) {
      expect(fn).toThrow(/not wired/);
    }
    expect(() => executeAction('FOLD')).toThrow(/not wired/);
  });
});

describe('actionLines registry (add validates, remove sweeps by id or name)', () => {
  it('accepts legal lines and rejects illegal ones at add time', () => {
    const ok = { id: 't-ok', name: 'T_OK_LINE', color: '#fff', sequence: [{ token: 'OR', value: '' }, { token: '3B', value: '10bb' }, { token: 'FOLD', value: '' }] };
    expect(() => addActionLine(ok)).not.toThrow();
    expect(actionLines.map(l => l.id)).toContain('t-ok');

    const badOrder = { id: 't-bad', name: 'T_BAD_LINE', color: '#fff', sequence: [{ token: 'OR', value: '' }, { token: 'FOLD', value: '' }, { token: 'CALL', value: '' }] };
    expect(() => addActionLine(badOrder)).toThrow();
    const badSize = { id: 't-badsize', name: 'T_BADSIZE_LINE', color: '#fff', sequence: [{ token: 'OR', value: 'zero' }] };
    expect(() => addActionLine(badSize)).toThrow();
    const noName = { id: 't-noname', name: ' ', color: '#fff', sequence: [{ token: 'OR', value: '' }] };
    expect(() => addActionLine(noName)).toThrow();

    removeActionLine('t-ok', {});
    expect(actionLines.map(l => l.id)).not.toContain('t-ok');
  });

  it('removes by id and sweeps painted cells by line name', () => {
    const line = { id: 't-sweep', name: 'T_SWEEP_LINE', color: '#fff', sequence: [{ token: 'CALL', value: '' }] };
    addActionLine(line);
    const Ranges = { RFI: { UTG: new Map([['AA', 'T_SWEEP_LINE'], ['KK', 'OR']]) }, XRFI: {} };
    removeActionLine('t-sweep', Ranges);
    expect(Ranges.RFI.UTG.has('AA')).toBe(false);
    expect(Ranges.RFI.UTG.get('KK')).toBe('OR');

    // back-compat: callers holding only the name still work
    addActionLine({ ...line });
    removeActionLine('T_SWEEP_LINE', Ranges);
    expect(actionLines.find(l => l.id === 't-sweep')).toBeUndefined();
  });
});
