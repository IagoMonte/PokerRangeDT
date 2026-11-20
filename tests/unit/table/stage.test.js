import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// viewport is a proportional derivative of it. The responsive
// rework must scale the stage, never rearrange it — these asserts fail
// loudly if proportions, seat geometry, or SR-hiding regress.
const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), 'utf8');

// Every component that lives inside the game stage. Breakpoints here would
// mean per-viewport layouts — the opposite of the proportional-stage rule.
const STAGE_FILES = [
  'components/PokerTable.vue',
  'components/pages/play.vue',
  'components/PlayerSeat.vue',
  'components/PlayerHand.vue',
  'components/BoardDisplay.vue',
  'components/VillainHand.vue',
  'components/CardComponent.vue',
  'components/CenterPot.vue',
  'components/TableStatus.vue',
  'components/actionButtons.vue',
  'components/PokerTableSurface.vue',
];

describe('proportional stage contract', () => {
  it('declares 430×932 as the reference viewport, derivatives keep proportion', () => {
    const css = src('style.css');
    expect(css).toMatch(/width:\s*430px/);
    expect(css).toMatch(/height:\s*932px/);
    expect(css).toContain('100vw / 430px');
    expect(css).toContain('/ 932px');
  });

  it('card sizes stay single-sourced in CSS vars (hero 48×68, villain 30×42)', () => {
    const css = src('style.css');
    expect(css).toContain('--hero-card-w: 48px');
    expect(css).toContain('--hero-card-h: 68px');
    expect(css).toContain('--villain-card-w: 30px');
    expect(css).toContain('--villain-card-h: 42px');
  });

  it('seat geometry stays percentage-based: 9 seats anchored in % coords', () => {
    const table = src('composables/usePokerTable.js');
    // position:{x:..} per seat (ButtonPosition excluded on purpose).
    expect(table.match(/position:\{x:/g)).toHaveLength(9);
    // Seats are positioned with translate(-50%, -50%) over % coords.
    expect(src('components/PlayerSeat.vue')).toContain('translate(-50%, -50%)');
  });

  it('no responsive breakpoints inside the stage (scale-to-fit, not reflow)', () => {
    for (const f of STAGE_FILES) {
      expect(src(f), f).not.toMatch(/["'\s](sm|md|lg|xl|2xl):/);
    }
  });

  it('non-cards stay hidden from screen readers (backs, empty slots, placeholders)', () => {
    expect(src('components/BoardDisplay.vue')).toContain('aria-hidden');
    expect(src('components/VillainHand.vue')).toContain('aria-hidden');
    expect(src('components/PlayerHand.vue')).toContain('aria-hidden');
  });

  it('play route renders inside the proportional stage wrapper', () => {
    const play = src('components/pages/play.vue');
    expect(play).toContain('stage-outer');
    expect(play).toContain('game-stage');
  });

  it('stage scales the 430×932 reference to fit any viewport (no reflow)', () => {
    const css = src('style.css');
    expect(css).toContain('.game-stage');
    expect(css).toContain('430px');
    expect(css).toContain('932px');
  });
});
