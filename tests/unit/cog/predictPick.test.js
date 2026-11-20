import { describe, it, expect } from 'vitest';
import { pickPredictSeat } from '../../../src/engine/predictPick.js';

// fim de mão com flag pede predict sozinho — a pick
// decide QUEM sem viés do operador: HU é o vilão, multiway sorteia entre
// os vivos, pré é o agressor. Sem vivo = skip honesto (-1), nunca trava.
const rng0 = () => 0; // determinístico: primeiro da lista

describe('pickPredictSeat', () => {
  it('sem vilão vivo = -1 (skip honesto)', () => {
    expect(pickPredictSeat({ liveVillains: [] })).toBe(-1);
    expect(pickPredictSeat({ liveVillains: [0], heroSeat: 0 })).toBe(-1);
  });

  it('pós-flop HU: o vilão', () => {
    expect(pickPredictSeat({ reachedPostflop: true, liveVillains: [4], heroSeat: 0 })).toBe(4);
  });

  it('pós-flop multiway: sorteia entre os vivos (folded fora)', () => {
    expect(pickPredictSeat({ reachedPostflop: true, liveVillains: [2, 5], heroSeat: 0, rng: rng0 })).toBe(2);
  });

  it('pré-flop: último agressor vilão (tuplas do handLog)', () => {
    const acts = [[0, 'LIMP'], [3, 'OR'], [0, 'CALL'], [5, '3B'], [3, 'FOLD']];
    expect(pickPredictSeat({ liveVillains: [5], preflopActions: acts, heroSeat: 0 })).toBe(5);
  });

  it('agressor foldado pula p/ o anterior vivo; herói nunca', () => {
    const acts = [[3, 'OR'], [0, '3B'], [3, 'FOLD']];
    // 3 foldou → não está em live; 0 é herói → cai no aleatório entre vivos
    expect(pickPredictSeat({ liveVillains: [7], preflopActions: acts, heroSeat: 0, rng: rng0 })).toBe(7);
  });

  it('sem agressão pré: aleatório entre vivos', () => {
    const acts = [[0, 'LIMP'], [3, 'CALL']];
    expect(pickPredictSeat({ liveVillains: [3, 4], preflopActions: acts, heroSeat: 0, rng: rng0 })).toBe(3);
  });

  it('aceita objetos {seat,token} além de tuplas', () => {
    const acts = [{ seat: 6, token: 'OR' }];
    expect(pickPredictSeat({ liveVillains: [6], preflopActions: acts, heroSeat: 0 })).toBe(6);
  });
});
