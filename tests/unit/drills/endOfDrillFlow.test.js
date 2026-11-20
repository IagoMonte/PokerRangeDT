import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const play = readFileSync(new URL('../../../src/components/pages/play.vue', import.meta.url), 'utf8');

// O modal de fim de drill cobria o botão Hands; dá para revisar as mãos
// sem perder o caminho de volta (Play again continua visível).
describe('fim de drill', () => {
  it('"Review hands" dispensa o modal e abre o histórico, com Play again acessível', () => {
    expect(play).toMatch(/reviewHands = \(\) => \{\s*summaryOpen\.value = false;\s*setSidebarOpen\(true\)/);
    expect(play).toContain('v-if="summary && !summaryOpen"');
    expect(play).toContain('v-if="summary && summaryOpen"');
  });

  it('nova sessão reabre o modal no próximo fim de drill', () => {
    expect(play).toMatch(/summary\.value = null;\s*summaryOpen\.value = true;\s*drillStartISO/);
  });
});

// Estourar o relógio é um fold: tem que entrar no registro e nas métricas
// de decisão, senão a mão aparece como "no hero action".
describe('relógio estourado', () => {
  it('gradeia o fold por timeout como uma decisão do herói', () => {
    const t = play.slice(play.indexOf('heroTimer = setTimeout'), play.indexOf('function waitHero'));
    expect(t).toContain('gradeHeroDecision(timeoutFold)');
    expect(t.indexOf('gradeHeroDecision')).toBeLessThan(t.indexOf('resolve(timeoutFold)'));
  });
});

// A média do modal é de todas as sessões (igual a +EV e Predict): o rótulo diz isso.
describe('resumo do drill', () => {
  it('rotula a média como all-time, não como da sessão', () => {
    expect(play).not.toMatch(/\(avg \{\{/);
    expect(play).toContain('(all-time avg');
  });

  it('heroDelta não grava poeira de ponto flutuante', () => {
    expect(play).toMatch(/heroDelta: Math\.round\(\(players\.value\[HERO_SEAT\]\.balance - handStartStack\) \* 100\) \/ 100/);
  });
});

// No drill só pós-flop os blinds precisam virar dinheiro morto: deixados como
// "apostas" de SB/BB, só os dois eram elegíveis ao pote e as fichas não fechavam.
describe('drill só pós-flop', () => {
  it('banca os blinds como dinheiro morto antes de entrar no flop', () => {
    expect(play).toMatch(/bankBlindsAsDeadMoney\(table\);\s*return await playPostflop\(table, generateBoardCards\(3, known\)\)/);
  });
});
