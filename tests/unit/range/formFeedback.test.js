import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { actionConfig, actionLines, nextFreeColor } from '../../../src/composables/useActions.js';

const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), 'utf8');

// Ação nova nascia sempre #3B82F6 (a cor de OR) e ficava indistinguível no grid.
describe('cor padrão de ação nova', () => {
  it('nunca repete a cor de uma ação existente', () => {
    const used = new Set(Object.values(actionConfig).map((c) => c.toLowerCase()));
    expect(used.has(nextFreeColor().toLowerCase())).toBe(false);
  });

  it('pula as cores já usadas por ações e linhas criadas', () => {
    const first = nextFreeColor();
    actionLines.push({ id: 'x', name: 'x', color: first, sequence: [] });
    try {
      expect(nextFreeColor()).not.toBe(first);
    } finally {
      actionLines.pop();
    }
  });
});

describe('formulários não falham em silêncio', () => {
  it('criar drill sem nome avisa o usuário', () => {
    expect(src('components/pages/drill.vue')).toMatch(/!drillName\.value\.trim\(\)[\s\S]{0,80}notify\(/);
  });

  it('Cancel em /villains descarta as edições recarregando os perfis salvos', () => {
    const v = src('components/pages/villains.vue');
    expect(v).toContain('@click="cancelEdits"');
    expect(v).toMatch(/cancelEdits = \(\) => \{\s*loadAll\(null, villains\)/);
  });

  it('o texto de ajuda do 4B bate com a regra do código (OR ou LIMP, não 3B)', () => {
    expect(src('components/RangeLegend.vue')).not.toContain('needs a <span class="text-text-primary font-mono">3B');
  });
});

// Drill sem limites aceitava relógio ≤ 0 (herói foldava na hora) e 999999 mãos.
describe('limites dos números do drill', () => {
  const drill = src('components/pages/drill.vue');

  it('relógio, mãos e delay são limitados ao salvar', () => {
    expect(drill).toContain('ActionTime: clampInt(actionTime.value, 1, 300');
    expect(drill).toContain('hands: clampInt(hands.value, 1, 1000');
    expect(drill).toContain('villainDelayMs: clampInt(villainDelayMs.value, 0, 5000');
  });

  it('a linha inteira do checkbox é o label (alvo de toque), sem espaçador no mobile', () => {
    expect(drill).toMatch(/<label for="preflop" class="flex items-center gap-3 min-h-\[44px\]/);
    expect(drill).not.toMatch(/<div class="flex items-center gap-3 min-h-\[44px\] group cursor-pointer">/);
    expect(drill).toContain('hidden sm:block text-[12px]');
  });
});

describe('quick action repetida', () => {
  it('avisa em vez de sobrescrever a ação (e a cor) existente em silêncio', () => {
    const legend = src('components/RangeLegend.vue');
    expect(legend).toContain('actionConfig[name] !== undefined');
    expect(legend).toContain('already exists');
    expect(legend.indexOf('already exists')).toBeLessThan(legend.indexOf('addAction(name, newActionColor.value)'));
  });
});
