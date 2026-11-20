import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// olho. Breakpoints content-out. Sem estes contratos, o desktop volta a
// mar de margem e o mobile a modal inalcançável.
const load = (p) =>
  readFileSync(new URL('../../../src/' + p, import.meta.url), 'utf8');

describe('table behavior', () => {
  it('start drill: sheet no mobile, centrado no desktop', () => {
    const s = load('components/StartDrill.vue');
    expect(s).toContain('items-end');
    expect(s).toContain('sm:items-center');
    expect(s).toContain('rounded-t-xl');
    expect(s).toContain('safe-area-inset-bottom');
  });

  it('grid cresce no desktop, compacto+toque no mobile', () => {
    const g = load('components/RangeGrid.vue');
    expect(g).toContain('max-w-[420px] lg:max-w-[560px]');
    expect(g).toContain('lg:text-xs');
    expect(g).toContain('@touchstart.prevent="handleGridTouchStart"');
  });

  it('tetos por papel: form 720, dashboard 1440, prosa 65ch', () => {
    expect(load('components/RangeContext.vue')).toContain('max-w-[720px]');
    expect(load('components/pages/profile.vue')).toContain('lg:max-w-[1440px]');
    expect(load('components/pages/coach.vue')).toContain('max-w-[65ch]');
  });

  it('HH quase-fullscreen no mobile (margem 16, scroll interno)', () => {
    const p = load('components/pages/profile.vue');
    expect(p).toContain('max-h-[85vh]');
    expect(p).toContain('overflow-auto');
  });

  it('filtros em linha no ≥600px, empilhado no 430', () => {
    const c = load('components/RangeContext.vue');
    expect(c).toContain('flex-col sm:flex-row');
    expect(c).toContain('justify-end');
  });

  it('sidebar dockada ≥1280 fora do palco, overlay intacto', () => {
    const h = load('components/HandSidebar.vue');
    expect(h).toContain('docked');
    expect(h).toContain('min-[1280px]:flex');
    expect(h).toContain('min-[1280px]:hidden');
    expect(h).toContain('border-r');
    expect(h).toContain('left-0 top-16 bottom-0');
    expect(h).toContain('max-w-[85vw]');
    expect(h).toContain('<Teleport to="body">');
    expect(h).not.toContain('right-0');
    const play = load('components/pages/play.vue');
    expect(play).toContain(':docked="true"');
    // Painel à esquerda do palco (irmão antes do #stage) + botão Hands à
    // esquerda + aberta por padrão no desktop (matchMedia, ainda fechável).
    expect(play).toMatch(/HandSidebar :open="sidebarOpen"[^>]*:docked="true"[^>]*\/>\s*<div id="stage"/s);
    expect(play).toContain('top-2 left-2 z-20 inline-flex items-center gap-1 px-3');
    expect(play).toContain('min-width: 1280px');
  });

  it('checkbox com bloco de label fantasma (baseline)', () => {
    expect(load('components/pages/drill.vue')).toContain('aria-hidden="true">&nbsp;');
  });
});
