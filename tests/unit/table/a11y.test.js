import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// rework drops a live region, unbinds a real disabled, removes a label, or
// darkens a token below its measured ratio. Ratios are computed, never
// eyeballed.
const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), 'utf8');

function lum(hex) {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i + 1, i + 3), 16) / 255);
  const lin = c.map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
const ratio = (a, b) => {
  const hi = Math.max(lum(a), lum(b));
  const lo = Math.min(lum(a), lum(b));
  return (hi + 0.05) / (lo + 0.05);
};
function themeVar(css, name) {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`));
  expect(m, `--color-${name} exists`).toBeTruthy();
  return m[1];
}

describe('a11y contract (WCAG AA)', () => {
  it('screen readers can follow the hand: live regions on status, pot, toast', () => {
    expect(src('components/TableStatus.vue')).toContain('aria-live');
    expect(src('components/CenterPot.vue')).toContain('aria-live');
    expect(src('components/NoticeToast.vue')).toContain('role="status"');
  });

  it('cards expose a full name, not glyph fragments', () => {
    const card = src('components/CardComponent.vue');
    expect(card).toContain('role="img"');
    expect(card).toContain('aria-label');
  });

  it('decorative layers stay hidden (backs, empty slots, placeholders)', () => {
    expect(src('components/VillainHand.vue')).toContain('aria-hidden');
    expect(src('components/BoardDisplay.vue')).toContain('aria-hidden');
    expect(src('components/PlayerHand.vue')).toContain('aria-hidden');
  });

  it('actions use a real disabled (unfocusable off-turn), not a visual class', () => {
    const btns = src('components/actionButtons.vue');
    expect(btns).toContain(':disabled="disabled"');
    expect(btns).not.toContain('pointer-events-none');
  });

  it('keyboard flow: focus moves to turn/dialog, Escape closes the slider', () => {
    const btns = src('components/actionButtons.vue');
    expect(btns).toContain('onSliderKeydown');
    expect(btns).toContain('Escape');
    expect(btns).toContain('.focus({ preventScroll: true })');
    expect(src('components/pages/play.vue')).toContain('playAgainBtn');
    expect(src('components/StartDrill.vue')).toContain('autofocus');
  });

  it('slider announces percent, not a raw 0-100 number', () => {
    const btns = src('components/actionButtons.vue');
    expect(btns).toContain('aria-label="Raise size"');
    expect(btns).toContain('aria-valuetext');
  });

  it('focus is visible: global ring, no outline-none on the /play route', () => {
    const css = src('style.css');
    expect(css).toContain(':focus-visible');
    expect(src('components/StartDrill.vue')).not.toContain('focus:outline-none');
  });

  it('reduced motion is honored in CSS and JS (count-up, settle pauses)', () => {
    const css = src('style.css');
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*animation-duration/);
    expect(src('composables/useAnimatedNumber.js')).toContain('prefersReducedMotion');
    expect(src('components/pages/play.vue')).toContain('prefersReducedMotion');
    expect(src('vfx.js')).toContain('prefersReducedMotion');
  });

  it('touch targets: slider controls are at least 44px tall, thumb 28px', () => {
    const btns = src('components/actionButtons.vue');
    expect(btns).toContain('min-h-[44px]');
    expect(btns).toContain('width: 28px');
  });

  it('measured contrast meets AA (text 4.5:1, UI 3:1)', () => {
    const css = src('style.css');
    const T = (n) => themeVar(css, n);
    // Small text on dark.
    expect(ratio(T('text-muted'), T('bg-primary'))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(T('text-secondary'), T('bg-secondary'))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(T('text-primary'), T('bg-primary'))).toBeGreaterThanOrEqual(4.5);
    // Red suits ride a tertiary→secondary gradient; worst case is the top.
    expect(ratio(T('action-fold'), T('bg-tertiary'))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(T('action-fold'), T('bg-secondary'))).toBeGreaterThanOrEqual(4.5);
    // Focus ring and dark-on-lavender buttons.
    expect(ratio(T('action-primary'), T('bg-primary'))).toBeGreaterThanOrEqual(3);
    expect(ratio(T('bg-primary'), T('action-primary'))).toBeGreaterThanOrEqual(4.5);
  });
});
