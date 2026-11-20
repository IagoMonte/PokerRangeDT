import { describe, it, expect, beforeEach } from 'vitest';
import { rangeGame, Ranges } from '../../../src/composables/useRangeGame.js';
import { HAND_RANKINGS, getComboCount } from '../../../src/infra/handRankings.js';
import { GTO_RFI_REFERENCE } from '../../fixtures/gtoRfiReference.js';
import { rangeToMask } from '../../../src/engine/rangeConverter.js';
import { rangeOps } from '../../../src/engine/bitmask.js';

const { getModRange, getRangePos } = rangeGame();
const POSITIONS = ['UTG', 'MP', 'CO', 'BTN', 'SB'];
const SET_169 = new Set(HAND_RANKINGS);

function combosOf(map) {
  let total = 0;
  for (const hand of map.keys()) total += getComboCount(hand);
  return total;
}

function clearAll() {
  for (const pos of Object.keys(Ranges.RFI)) Ranges.RFI[pos].clear();
  for (const pos of Object.keys(Ranges.XRFI)) Ranges.XRFI[pos].clear();
}

function seedCore(pos) {
  clearAll();
  for (const hand of GTO_RFI_REFERENCE[pos].core) Ranges.RFI[pos].set(hand, ['OR']);
}

beforeEach(() => {
  clearAll();
});

describe('GTO fixture — validade da referência (gtobase.md §2)', () => {
  it('toda mão core/never existe no HAND_RANKINGS (169)', () => {
    for (const pos of POSITIONS) {
      const { core, never } = GTO_RFI_REFERENCE[pos];
      expect(core.every(h => SET_169.has(h))).toBe(true);
      expect(never.every(h => SET_169.has(h))).toBe(true);
    }
  });

  it('never nunca intersecta core', () => {
    for (const pos of POSITIONS) {
      const { core, never } = GTO_RFI_REFERENCE[pos];
      const coreSet = new Set(core);
      expect(never.some(h => coreSet.has(h))).toBe(false);
    }
  });

  it('combos declarado == soma real e perto da ref de solver (margem da fonte ≤ 24)', () => {
    // fontes publicam % arredondados; a precisão contratual (±12) vale
    // motor-vs-alvo, não fonte-vs-solver. Esta margem é explícita e congelada.
    for (const pos of POSITIONS) {
      const ref = GTO_RFI_REFERENCE[pos];
      expect(combosOf(new Map(ref.core.map(h => [h, true])))).toBe(ref.combos);
      expect(Math.abs(ref.combos - ref.refCombos)).toBeLessThanOrEqual(24);
    }
  });
});

describe('GTO contrato RFI — base do usuário preservada perto do solver', () => {
  for (const pos of POSITIONS) {
    it(`${pos}: core presente, never ausente, total em combos ±12`, () => {
      // o bruto vem do usuário (matrix); o motor com stat casado não deve
      // amputar nem inflar o range — só a regra booleana (±12) pode mover a borda.
      const ref = GTO_RFI_REFERENCE[pos];
      seedCore(pos);
      const stat = ref.combos / 1326;
      const { rfi } = getModRange({ POS: pos, RFI: stat });

      for (const hand of ref.core) expect(rfi.has(hand)).toBe(true);
      for (const hand of ref.never) expect(rfi.has(hand)).toBe(false);

      const total = combosOf(rfi);
      expect(total).toBeGreaterThanOrEqual(ref.combos - 12);
      expect(total).toBeLessThanOrEqual(ref.combos + 12);
    });
  }

  it('monotonicidade em combos: UTG ≤ MP ≤ CO ≤ BTN (SB ≤ BTN)', () => {
    // posição tardia joga mais mãos — invariante GTO que o motor não pode inverter.
    const totals = {};
    for (const pos of POSITIONS) {
      seedCore(pos);
      const ref = GTO_RFI_REFERENCE[pos];
      totals[pos] = combosOf(getModRange({ POS: pos, RFI: ref.combos / 1326 }).rfi);
    }
    expect(totals.UTG).toBeLessThanOrEqual(totals.MP);
    expect(totals.MP).toBeLessThanOrEqual(totals.CO);
    expect(totals.CO).toBeLessThanOrEqual(totals.BTN);
    expect(totals.SB).toBeLessThanOrEqual(totals.BTN);
  });

  it('aliases curtos resolvem para a mesma base (MP/CO/BTN/SB/BB)', () => {
    // a matrix UI entrega chaves curtas; sem alias o motor retornava
    // Maps vazios em silêncio e o vilão ficava sem range.
    seedCore('MP');
    expect(getRangePos('MP').rfi.size).toBe(GTO_RFI_REFERENCE.MP.core.length);
    expect(getRangePos('LOJACK').rfi.size).toBe(GTO_RFI_REFERENCE.MP.core.length);
    seedCore('CO');
    expect(getRangePos('CO').rfi.size).toBe(GTO_RFI_REFERENCE.CO.core.length);
    expect(getRangePos('CUTOFF').rfi.size).toBe(GTO_RFI_REFERENCE.CO.core.length);
  });

  it('fronteira booleana: sala 3 p/ mão de 6 → inclui inteira (100%)', () => {
    // float vira booleano — 3 de folga p/ mão de 6 joga 100%.
    // Base = top-4 do ranking (22 combos); próxima do ranking é JJ (6 combos).
    clearAll();
    for (const hand of ['AA', 'KK', 'QQ', 'AKs']) Ranges.RFI.UTG.set(hand, ['OR']);
    const { rfi } = getModRange({ POS: 'UTG', RFI: 25 / 1326 });
    expect(rfi.has('JJ')).toBe(true);
    expect(combosOf(rfi)).toBe(28);
  });

  it('fronteira booleana: sala 3 p/ mão de 12 → exclui inteira (0%)', () => {
    // 3 de folga p/ mão de 12 joga 0% — e o prefixo do ranking é preservado.
    clearAll();
    for (const hand of ['AA', 'KK', 'QQ', 'AKs', 'JJ', 'AQs', 'KQs']) {
      Ranges.RFI.UTG.set(hand, ['OR']);
    }
    const { rfi } = getModRange({ POS: 'UTG', RFI: 39 / 1326 });
    expect(rfi.has('AKo')).toBe(false);
    expect(combosOf(rfi)).toBe(36);
  });

  it('determinismo: mesma entrada, mesma saída', () => {
    seedCore('CO');
    const ref = GTO_RFI_REFERENCE.CO;
    const a = getModRange({ POS: 'CO', RFI: ref.combos / 1326 });
    seedCore('CO');
    const b = getModRange({ POS: 'CO', RFI: ref.combos / 1326 });
    expect([...a.rfi.entries()].sort()).toEqual([...b.rfi.entries()].sort());
  });

  it('edges: RFI=0 vazio, RFI=1.0 com 169 mãos', () => {
    seedCore('UTG');
    expect(getModRange({ POS: 'UTG', RFI: 0 }).rfi.size).toBe(0);
    seedCore('UTG');
    expect(getModRange({ POS: 'UTG', RFI: 1.0 }).rfi.size).toBe(169);
  });
});

describe('GTO hand counts match the bitmask calculation', () => {
  for (const pos of POSITIONS) {
    it(`${pos}: countCombos(rangeToMask(core)) == combos do fixture`, () => {
      // duas implementações independentes (soma getComboCount vs bitmask
      // triangular) têm que concordar exatamente — sem tolerância aqui.
      const ref = GTO_RFI_REFERENCE[pos];
      const mask = rangeToMask(ref.core.join(','));
      expect(rangeOps.countCombos(mask)).toBe(ref.combos);
    });
  }
});
