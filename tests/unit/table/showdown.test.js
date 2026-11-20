import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// The settle identifies the board, winners, and pot; the reveal uses a flip
// animation to distinguish showdown from card distribution.
const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), 'utf8');

describe('complete showdown', () => {
  it('settle do runout informa board + vencedores + pote', () => {
    const play = src('components/pages/play.vue');
    expect(play).toContain('Runout');
    // Paridade com o everyone-folded: o take leva fmtMoney(total).
    expect(play).toMatch(/take \$\{fmtMoney\(total/);
  });

  it('reveal vira a carta (flip rotateY), não reusa o deal-in', () => {
    const hand = src('components/VillainHand.vue');
    expect(hand).toContain('reveal-flip');
    expect(hand).toContain('rotateY');
    expect(hand).toContain('ease-out');
    // O verso continua com o deal do embaralhamento; só a face vira.
    expect(hand).toContain('deal-in');
  });

  it('reveal respeita reduced-motion', () => {
    const hand = src('components/VillainHand.vue');
    expect(hand).toMatch(/prefers-reduced-motion[\s\S]*\.reveal-flip\s*\{\s*animation:\s*none/);
  });

  it('settle não recascata ruas já exibidas (vai direto ao reveal)', () => {
    // de street — recascatar no settle é animação repetida. Só o all-in
    // runout (sem eventos de street) precisa da cascata 3→4→5.
    const play = src('components/pages/play.vue');
    expect(play).toMatch(/for \(const n of \[3, 4, 5\]\)/);
    expect(play).toContain('n <= shown.value');
  });
});
