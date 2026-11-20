import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// coach é tela à parte sobre decisões — o /play volta a ser feedback
// rápido (veredito + número) e o porquê mora no /coach com as mãos.
// Se o strip regredir, os dois canais voltam a dizer coisa diferente.
const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), 'utf8');

describe('coach (tela à parte)', () => {
  it('rota /coach + links no nav (desktop e mobile)', () => {
    const router = src('router/index.js');
    expect(router).toContain("path: '/coach'");
    const nav = src('components/navBar.vue');
    expect(nav.match(/to="\/coach"/g).length).toBe(2);
  });

  it('página usa o motor puro + reusa a linha do histórico', () => {
    const page = src('components/pages/coach.vue');
    expect(page).toContain('runCoach');
    expect(page).toContain('computeMetrics');
    expect(page).toContain('HandRow');
    expect(page).toContain('formatHandHistory');
    expect(page).toContain('formatHandMTT');
    expect(page).toContain('Copy MTT');
  });

  it('notify do /play enxuto: sem coaching', () => {
    const play = src('components/pages/play.vue');
    expect(play).not.toContain('— coach:');
    expect(play).not.toContain('— linha:');
    expect(play).toContain('−EV ✗ ${heroOp}');
    expect(play).toContain('fora da linha`');
  });
});
