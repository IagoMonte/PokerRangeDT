import { describe, it, expect } from 'vitest';
import { scorePredict } from '../../../src/engine/residual.js';
import { getHandLabel } from '../../../src/infra/handRankings.js';

/**
 * scorePredict(palpite, gabarito, vilaoMao)
 * - palpite P: Set de labels (mãos que o usuário escolheu)
 * - gabarito G: Set de labels (range residual real do vilão agora)
 * - vilaoMao V: string label (a mão real do vilão)
 *
 * Scoring:
 * - P == {V} (1 elemento, exatamente a mão) → 100 (perfeito)
 * - V ∈ P, P ⊆ G, |P| > 1 → 99 (acertou a mão + mais, dentro do range)
 * - V ∉ P, P ⊆ G → cap 98 (range puro sem a mão)
 * - hits/n caso contrário: precision simples
 * - G vazio → score 0
 * - P vazio → inválido, score 0
 */

describe('scorePredict', () => {
  // Helper: simula o scoring real
  function scorePredict(palpite, gabarito, vilaoMao) {
    if (palpite.size === 0 || gabarito.size === 0) return 0;

    const hits = [...palpite].filter(h => gabarito.has(h)).length;

    // Caso 1: palpite == {vilaoMao} exatamente
    if (palpite.size === 1 && palpite.has(vilaoMao)) {
      return 100;
    }

    // Caso 2: vilao está no palpite, palpite ⊆ gabarito, tamanho > 1
    if (palpite.has(vilaoMao) && [...palpite].every(h => gabarito.has(h)) && palpite.size > 1) {
      return 99;
    }

    // Caso 3: vilao não está no palpite, palpite ⊆ gabarito
    if (!palpite.has(vilaoMao) && [...palpite].every(h => gabarito.has(h))) {
      return 98; // cap 98
    }

    // Caso 4: resto (hits / n)
    return Math.round((hits / palpite.size) * 100);
  }

  it('1de1 perfeito: palpite == {mão real} → 100', () => {
    const G = new Set(['AA', 'KK', 'QQ', 'AKs', 'AKo']);
    const V = 'AA';
    const P = new Set(['AA']);
    expect(scorePredict(P, G, V)).toBe(100);
  });

  it('2de2 com a mão dentro: {AA, KK}, mão=AA, G contém ambas → 99', () => {
    const G = new Set(['AA', 'KK', 'QQ', 'AKs', 'AKo']);
    const V = 'AA';
    const P = new Set(['AA', 'KK']);
    expect(scorePredict(P, G, V)).toBe(99);
  });

  it('1de2 meio a meio: {AA, QQ}, mão=AA, G={AA,KK,QQ...} → 50', () => {
    const G = new Set(['AA', 'KK', 'QQ', 'AKs', 'AKo']);
    const V = 'AA';
    const P = new Set(['AA', '22']); // 22 fora de G
    expect(scorePredict(P, G, V)).toBe(50); // 1 hit de 2
  });

  it('0 hits: palpite={99, 88}, mão=AA, G={AA,KK,QQ...} → 0', () => {
    const G = new Set(['AA', 'KK', 'QQ', 'AKs', 'AKo']);
    const V = 'AA';
    const P = new Set(['99', '88']);
    expect(scorePredict(P, G, V)).toBe(0);
  });

  it('palpite ⊆ gabarito sem a mão: {KK,QQ}, mão=AA, G={AA,KK,QQ,...} → 98', () => {
    const G = new Set(['AA', 'KK', 'QQ', 'AKs', 'AKo']);
    const V = 'AA';
    const P = new Set(['KK', 'QQ']);
    expect(scorePredict(P, G, V)).toBe(98); // cap 98
  });

  it('gabarito vazio → score 0', () => {
    const G = new Set();
    const V = 'AA';
    const P = new Set(['AA']);
    expect(scorePredict(P, G, V)).toBe(0);
  });

  it('palpite vazio → score 0', () => {
    const G = new Set(['AA', 'KK']);
    const V = 'AA';
    const P = new Set();
    expect(scorePredict(P, G, V)).toBe(0);
  });

  it('3de5 com 2 hits: {AA, KK, 99, 88, 77}, 2 em G → 40', () => {
    const G = new Set(['AA', 'KK', 'QQ', 'AKs']);
    const V = 'AKs';
    const P = new Set(['AA', 'KK', '99', '88', '77']);
    expect(scorePredict(P, G, V)).toBe(40); // 2 hits de 5
  });

  it('4de4 com a mão: {AA,KK,QQ,AKs}, mão=AKs, G contém → 99', () => {
    const G = new Set(['AA', 'KK', 'QQ', 'AKs', 'AKo']);
    const V = 'AKs';
    const P = new Set(['AA', 'KK', 'QQ', 'AKs']);
    expect(scorePredict(P, G, V)).toBe(99);
  });
});

// Contrato engine real: estes usam o scorePredict de src/engine/residual.js
// (não a cópia local acima) + getHandLabel canônico.
describe('scorePredict (engine) × label canônico', () => {
  it('REGRESSÃO: label canônico das cartas reais bate no grid (97s → 100%)', () => {
    // PokerTable usava duplicata com ordem invertida ('79s') e o
    // palpite certo no grid ('97s') caía no cap-98 em vez de 100%.
    const vilaoMao = getHandLabel(['9♥', '7♥']);
    expect(vilaoMao).toBe('97s'); // high-first, igual ao grid e ao residual
    const G = new Set(['97s', '96s', '95s', 'T9s', '98s']);
    const P = new Set([vilaoMao]);
    expect(scorePredict(P, G, vilaoMao)).toBe(100);
  });

  it('REGRESSÃO: label independe da ordem das cartas (7♥9♥ → 97s)', () => {
    expect(getHandLabel(['7♥', '9♥'])).toBe('97s');
    expect(getHandLabel(['K♠', 'A♠'])).toBe('AKs');
    expect(getHandLabel(['A♠', 'K♠'])).toBe('AKs');
  });
});
