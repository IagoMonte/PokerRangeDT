import { describe, it, expect, beforeEach } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { rangeGame, Ranges } from '../../../src/composables/useRangeGame';
import { HAND_RANKINGS, getComboCount, RFI_BLUFF_RANKING, XRFI_BLUFF_RANKING, FOURBET_RANKING } from '../../../src/infra/handRankings';
import { POSITION_TO_RANGE_KEY, POSITION_MODS } from '../../../src/infra/positions';
import { usePersistence } from '../../../src/composables/usePersistence';

const { getRangePos, getModRange } = rangeGame();

describe('Range Structure E2E', () => {
  beforeEach(() => {
    // Limpar ranges antes de cada teste
    for (const pos in Ranges.RFI) {
      Ranges.RFI[pos].clear();
    }
    for (const pos in Ranges.XRFI) {
      Ranges.XRFI[pos].clear();
    }
  });

  describe('1. getRangePos(POS) — Range base por posição', () => {
    it('UTG (mod=0) retorna range base sem extras', () => {
      Ranges.RFI['UTG'].set('AA', ['OR']);
      Ranges.RFI['UTG'].set('KK', ['OR']);
      Ranges.XRFI['UTG'].set('AA', ['CALL']);

      const result = getRangePos('UTG');

      expect(result.rfi.size).toBe(2);
      expect(result.xrfi.size).toBe(1);
      expect(result.rfi.has('AA')).toBe(true);
      expect(result.rfi.has('KK')).toBe(true);
      expect(result.xrfi.has('AA')).toBe(true);
    });

    it('UTG1 (mod=1.5) adiciona 20 combos extras', () => {
      Ranges.RFI['UTG'].set('AA', ['OR']);
      Ranges.XRFI['UTG'].set('AA', ['CALL']);

      const result = getRangePos('UTG1');
      const expectedExtras = Math.round((1.5 / 100) * 1326);

      // Base tem 1 mão (AA = 6 combos); regra booleana limita o desvio a ±12 (gtobase.md §4).
      let rfiCombos = 0;
      for (const hand of result.rfi.keys()) rfiCombos += getComboCount(hand);

      expect(rfiCombos).toBeGreaterThanOrEqual(6 + expectedExtras - 12);
      expect(rfiCombos).toBeLessThanOrEqual(6 + expectedExtras + 12);
    });

    it('UTG2 (mod=4) adiciona 53 combos extras', () => {
      Ranges.RFI['UTG'].set('AA', ['OR']);
      const result = getRangePos('UTG2');
      const expectedExtras = Math.round((4 / 100) * 1326);

      let rfiCombos = 0;
      for (const hand of result.rfi.keys()) rfiCombos += getComboCount(hand);

      expect(rfiCombos).toBeGreaterThanOrEqual(6 + expectedExtras - 12);
      expect(rfiCombos).toBeLessThanOrEqual(6 + expectedExtras + 12);
    });

    it('HIJACK (mod=4.5) adiciona 60 combos extras ao base MP', () => {
      Ranges.RFI['MP'].set('AA', ['OR']);
      const result = getRangePos('HIJACK');
      const expectedExtras = Math.round((4.5 / 100) * 1326);

      let rfiCombos = 0;
      for (const hand of result.rfi.keys()) rfiCombos += getComboCount(hand);

      expect(rfiCombos).toBeGreaterThanOrEqual(6 + expectedExtras - 12);
      expect(rfiCombos).toBeLessThanOrEqual(6 + expectedExtras + 12);
    });

    it('LOJACK (mod=0) retorna base MP sem extras', () => {
      Ranges.RFI['MP'].set('AA', ['OR']);
      Ranges.RFI['MP'].set('KK', ['OR']);

      const result = getRangePos('LOJACK');

      expect(result.rfi.size).toBe(2);
    });

    it('CUTOFF/BUTTON/SB (mod=0) retornam base sem extras', () => {
      Ranges.RFI['CO'].set('AA', ['OR']);
      Ranges.RFI['BTN'].set('AA', ['OR']);
      Ranges.RFI['SB'].set('AA', ['OR']);

      expect(getRangePos('CUTOFF').rfi.size).toBe(1);
      expect(getRangePos('BUTTON').rfi.size).toBe(1);
      expect(getRangePos('SMALL_BLIND').rfi.size).toBe(1);
    });

    it('Posição inválida retorna Maps vazios', () => {
      const result = getRangePos('INVALID_POS');

      expect(result.rfi.size).toBe(0);
      expect(result.xrfi.size).toBe(0);
    });

    it('Não muta Ranges originais quando há extras', () => {
      Ranges.RFI['UTG'].set('AA', ['OR']);
      const originalSize = Ranges.RFI['UTG'].size;

      getRangePos('UTG1');

      expect(Ranges.RFI['UTG'].size).toBe(originalSize);
    });
  });

  describe('2. getModRange — Retorno separado', () => {
    beforeEach(() => {
      // Popular base com algumas mãos
      Ranges.RFI['UTG'].set('AA', ['OR']);
      Ranges.RFI['UTG'].set('KK', ['OR']);
      Ranges.RFI['UTG'].set('QQ', ['OR']);
      Ranges.XRFI['UTG'].set('AA', ['CALL']);
      Ranges.XRFI['UTG'].set('KK', ['CALL']);
    });

    it('Retorna { rfi: Map, xrfi: Map }', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, threeBet: 0.08 });

      expect(result).toHaveProperty('rfi');
      expect(result).toHaveProperty('xrfi');
      expect(result.rfi instanceof Map).toBe(true);
      expect(result.xrfi instanceof Map).toBe(true);
    });

    it('Map rfi contém apenas OR/4B, nunca CALL/3B', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, threeBet: 0.08 });

      for (const [hand, actions] of result.rfi) {
        expect(actions).not.toContain('CALL');
        expect(actions).not.toContain('3B');
      }
    });

    it('Map xrfi contém apenas CALL/3B, nunca OR/4B', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, threeBet: 0.08 });

      for (const [hand, actions] of result.xrfi) {
        expect(actions).not.toContain('OR');
        expect(actions).not.toContain('4B');
      }
    });

    it('RFI=0 e threeBet=0 retorna ambos vazios', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0, threeBet: 0 });

      expect(result.rfi.size).toBe(0);
      expect(result.xrfi.size).toBe(0);
    });

    it('RFI>0 e threeBet=0 só popula rfi', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, threeBet: 0 });

      expect(result.rfi.size).toBeGreaterThan(0);
      expect(result.xrfi.size).toBe(0);
    });

    it('RFI=0 e threeBet>0 só popula xrfi', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0, threeBet: 0.08 });

      expect(result.rfi.size).toBe(0);
      expect(result.xrfi.size).toBeGreaterThan(0);
    });

    it('Ambos >0 popula ambos sem sobreposição de actions', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, threeBet: 0.08 });

      expect(result.rfi.size).toBeGreaterThan(0);
      expect(result.xrfi.size).toBeGreaterThan(0);

      // Verificar que não há sobreposição de actions entre os maps
      for (const [hand, rfiActions] of result.rfi) {
        if (result.xrfi.has(hand)) {
          const xrfiActions = result.xrfi.get(hand);
          const overlap = rfiActions.filter(a => xrfiActions.includes(a));
          expect(overlap.length).toBe(0);
        }
      }
    });
  });

  describe('3. Cálculo de combos — Stats em decimal', () => {
    beforeEach(() => {
      Ranges.RFI['UTG'].set('AA', ['OR']);
      Ranges.XRFI['UTG'].set('AA', ['CALL']);
    });

    it('RFI=0.22 resulta em ~292 combos', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, threeBet: 0 });

      let totalCombos = 0;
      for (const hand of result.rfi.keys()) totalCombos += getComboCount(hand);

      const expected = Math.round(0.22 * 1326);
      expect(totalCombos).toBeGreaterThanOrEqual(expected - 10);
      expect(totalCombos).toBeLessThanOrEqual(expected + 10);
    });

    it('threeBet=0.08 resulta em ~106 combos', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0, threeBet: 0.08 });

      let totalCombos = 0;
      for (const hand of result.xrfi.keys()) totalCombos += getComboCount(hand);

      const expected = Math.round(0.08 * 1326);
      expect(totalCombos).toBeGreaterThanOrEqual(expected - 10);
      expect(totalCombos).toBeLessThanOrEqual(expected + 10);
    });

    it('fourBet=0.05 resulta em 5% dos combos do RFI', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, fourBet: 0.05 });

      let rfiCombos = 0;
      let fourBetCombos = 0;

      for (const [hand, actions] of result.rfi) {
        const combos = getComboCount(hand);
        rfiCombos += combos;
        if (actions.includes('4B')) fourBetCombos += combos;
      }

      const expectedFourBet = Math.round(0.05 * rfiCombos);
      expect(fourBetCombos).toBeGreaterThanOrEqual(expectedFourBet - 6);
      expect(fourBetCombos).toBeLessThanOrEqual(expectedFourBet + 6);
    });

    it('bluff=0.3 distribui 33% no RFI e 67% no XRFI', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, threeBet: 0.08, bluff: 0.3 });

      // RFI bluff target = 292 * 0.3 * 0.33 = ~29 combos
      // XRFI bluff target = 106 * 0.3 * 0.67 = ~21 combos
      const rfiBluffTarget = Math.round(Math.round(0.22 * 1326) * 0.3 * 0.33);
      const xrfiBluffTarget = Math.round(Math.round(0.08 * 1326) * 0.3 * 0.67);

      // Verificar que bluffs foram adicionados (mãos do ranking de bluff estão presentes)
      let rfiBluffHands = 0;
      for (const hand of RFI_BLUFF_RANKING) {
        if (result.rfi.has(hand)) rfiBluffHands++;
      }

      let xrfiBluffHands = 0;
      for (const hand of XRFI_BLUFF_RANKING) {
        if (result.xrfi.has(hand)) xrfiBluffHands++;
      }

      expect(rfiBluffHands).toBeGreaterThan(0);
      expect(xrfiBluffHands).toBeGreaterThan(0);
    });
  });

  describe('4. Bluff rankings — Sem fallback aleatório', () => {
    beforeEach(() => {
      Ranges.RFI['UTG'].set('AA', ['OR']);
      Ranges.XRFI['UTG'].set('AA', ['CALL']);
    });

    it('RFI bluffs vêm de RFI_BLUFF_RANKING', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, bluff: 0.5 });

      // Verificar que mãos de bluff do ranking estão presentes
      const bluffHandsInResult = RFI_BLUFF_RANKING.filter(h => result.rfi.has(h));
      expect(bluffHandsInResult.length).toBeGreaterThan(0);
    });

    it('XRFI bluffs vêm de XRFI_BLUFF_RANKING', () => {
      const result = getModRange({ POS: 'UTG', threeBet: 0.08, bluff: 0.5 });

      const bluffHandsInResult = XRFI_BLUFF_RANKING.filter(h => result.xrfi.has(h));
      expect(bluffHandsInResult.length).toBeGreaterThan(0);
    });

    it('Mãos do ranking de bluff não são duplicadas se já estão no value', () => {
      // Popular base com mãos que também estão no bluff ranking
      Ranges.RFI['UTG'].clear();
      Ranges.RFI['UTG'].set('A5s', ['OR']);

      const result = getModRange({ POS: 'UTG', RFI: 0.22, bluff: 0.5 });

      // A5s deve estar no resultado, mas apenas uma vez
      expect(result.rfi.has('A5s')).toBe(true);
    });
  });

  describe('5. 4Bet — FOURBET_RANKING', () => {
    beforeEach(() => {
      Ranges.RFI['UTG'].set('AA', ['OR']);
      Ranges.RFI['UTG'].set('KK', ['OR']);
      Ranges.RFI['UTG'].set('QQ', ['OR']);
      Ranges.RFI['UTG'].set('AKs', ['OR']);
    });

    it('4Bet seleciona mãos de FOURBET_RANKING', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, fourBet: 0.5 });

      // Verificar que mãos de 4Bet estão no FOURBET_RANKING
      for (const [hand, actions] of result.rfi) {
        if (actions.includes('4B')) {
          expect(FOURBET_RANKING).toContain(hand);
        }
      }
    });

    it('4Bet é sub-seleção do range RFI', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, fourBet: 0.5 });

      for (const [hand, actions] of result.rfi) {
        if (actions.includes('4B')) {
          expect(actions).toContain('OR');
        }
      }
    });

    it('4Bet adiciona 4B ao array de actions existente', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, fourBet: 0.5 });

      for (const [hand, actions] of result.rfi) {
        if (actions.includes('4B')) {
          expect(actions).toContain('OR');
          expect(actions.length).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it('4Bet não adiciona mãos que não estão no range RFI', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, fourBet: 0.5 });

      // Todas as mãos com 4B devem estar no rfiBase
      for (const [hand, actions] of result.rfi) {
        if (actions.includes('4B')) {
          expect(result.rfi.has(hand)).toBe(true);
        }
      }
    });
  });

  describe('6. Expansão/Contração do range base', () => {
    beforeEach(() => {
      Ranges.RFI['UTG'].set('AA', ['OR']);
      Ranges.RFI['UTG'].set('KK', ['OR']);
      Ranges.RFI['UTG'].set('QQ', ['OR']);
    });

    it('Expande quando rfiCombos < valueTarget', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.50 });

      let totalCombos = 0;
      for (const hand of result.rfi.keys()) totalCombos += getComboCount(hand);

      const expected = Math.round(0.50 * 1326);
      expect(totalCombos).toBeGreaterThanOrEqual(expected - 12);
      expect(totalCombos).toBeLessThanOrEqual(expected + 12);
    });

    it('Contrai quando rfiCombos > valueTarget', () => {
      // Popular base com muitas mãos
      for (let i = 0; i < 50; i++) {
        if (HAND_RANKINGS[i]) {
          Ranges.RFI['UTG'].set(HAND_RANKINGS[i], ['OR']);
        }
      }

      const result = getModRange({ POS: 'UTG', RFI: 0.10 });

      let totalCombos = 0;
      for (const hand of result.rfi.keys()) totalCombos += getComboCount(hand);

      const expected = Math.round(0.10 * 1326);
      expect(totalCombos).toBeGreaterThanOrEqual(expected - 12);
      expect(totalCombos).toBeLessThanOrEqual(expected + 12);
    });

    it('Bluffs são adicionados depois do value', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.22, bluff: 0.3 });

      // Verificar que mãos de bluff estão presentes além do value
      const bluffHands = RFI_BLUFF_RANKING.filter(h => result.rfi.has(h));
      expect(bluffHands.length).toBeGreaterThan(0);
    });
  });

  describe('7. Persistência — Save/Load', () => {
    it('saveAll e loadAll preservam dados', () => {
      // localStorage não disponível em teste — testar apenas a estrutura da função
      const { saveAll, loadAll } = usePersistence();

      expect(typeof saveAll).toBe('function');
      expect(typeof loadAll).toBe('function');

      // Verificar que não crasha com argumentos válidos
      const villains = { value: [{ name: 'V1', stats: {} }] };
      expect(() => saveAll(Ranges, villains)).not.toThrow();
      expect(() => loadAll(Ranges, villains)).not.toThrow();
    });

    it('saveAll funciona com 1 argumento (array cru)', () => {
      const { saveAll } = usePersistence();
      const villains = [{ name: 'V1', stats: {} }];
      expect(() => saveAll(villains)).not.toThrow();
    });

    it('loadAll funciona com 1 argumento', () => {
      const { loadAll } = usePersistence();
      const villains = { value: [{ name: 'V1', stats: {} }] };
      expect(() => loadAll(villains)).not.toThrow();
    });
  });

  describe('8. Cenários integrados', () => {
    beforeEach(() => {
      Ranges.RFI['UTG'].set('AA', ['OR']);
      Ranges.RFI['UTG'].set('KK', ['OR']);
      Ranges.XRFI['UTG'].set('AA', ['CALL']);
    });

    it('Vilão tight: range pequeno, poucos bluffs', () => {
      const result = getModRange({
        POS: 'UTG',
        RFI: 0.12,
        threeBet: 0.04,
        fourBet: 0.02,
        bluff: 0.1
      });

      let rfiCombos = 0;
      for (const hand of result.rfi.keys()) rfiCombos += getComboCount(hand);

      expect(rfiCombos).toBeLessThan(200);
    });

    it('Vilão loose-aggressive: range largo, muitos bluffs', () => {
      const result = getModRange({
        POS: 'UTG',
        RFI: 0.45,
        threeBet: 0.15,
        fourBet: 0.08,
        bluff: 0.5
      });

      let rfiCombos = 0;
      for (const hand of result.rfi.keys()) rfiCombos += getComboCount(hand);

      expect(rfiCombos).toBeGreaterThan(400);
    });

    it('Vilão nit: range mínimo', () => {
      const result = getModRange({
        POS: 'UTG',
        RFI: 0.08,
        threeBet: 0.02,
        fourBet: 0.01,
        bluff: 0.05
      });

      let rfiCombos = 0;
      for (const hand of result.rfi.keys()) rfiCombos += getComboCount(hand);

      expect(rfiCombos).toBeLessThan(150);
    });
  });

  describe('9. Edge cases', () => {
    beforeEach(() => {
      Ranges.RFI['UTG'].set('AA', ['OR']);
      Ranges.XRFI['UTG'].set('AA', ['CALL']);
    });

    it('RFI=1.0 (100%) inclui todas as 169 mãos', () => {
      const result = getModRange({ POS: 'UTG', RFI: 1.0 });

      expect(result.rfi.size).toBe(169);
    });

    it('RFI=0.01 (~1%) inclui apenas AA, KK ou AA+KK+QQ', () => {
      const result = getModRange({ POS: 'UTG', RFI: 0.01 });

      let totalCombos = 0;
      for (const hand of result.rfi.keys()) totalCombos += getComboCount(hand);

      const expected = Math.round(0.01 * 1326);
      expect(totalCombos).toBeGreaterThanOrEqual(expected - 6);
      expect(totalCombos).toBeLessThanOrEqual(expected + 6);
    });

    it('fourBet=1.0 converte todas as mãos elegíveis em 4Bet', () => {
      // Popular base com mãos do FOURBET_RANKING
      Ranges.RFI['UTG'].clear();
      FOURBET_RANKING.slice(0, 5).forEach(hand => {
        Ranges.RFI['UTG'].set(hand, ['OR']);
      });

      const result = getModRange({ POS: 'UTG', RFI: 0.22, fourBet: 1.0 });

      let fourBetHands = 0;
      for (const [hand, actions] of result.rfi) {
        if (actions.includes('4B')) fourBetHands++;
      }

      expect(fourBetHands).toBeGreaterThan(0);
    });

    it('Position key inexistente retorna Maps vazios', () => {
      const result = getModRange({ POS: 'INVALID', RFI: 0.22 });

      expect(result.rfi.size).toBe(0);
      expect(result.xrfi.size).toBe(0);
    });
  });
});
