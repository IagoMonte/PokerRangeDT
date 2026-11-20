import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Preserves the action bar's sizing, visual cues, and keyboard shortcuts.
const btns = readFileSync(
  new URL('../../../src/components/actionButtons.vue', import.meta.url),
  'utf8'
);

describe('action bar', () => {
  it('altura 48px e largura fluida sem estourar o palco 430', () => {
    // 4×120px + gaps = 516px > palco 430px: largura fixa quebra (clip).
    // Botões dividem a largura (flex-1 min-w-0) e nunca vazam (max-w-full).
    expect(btns).toContain('min-h-[48px]');
    expect(btns).toContain('flex-1 min-w-0');
    expect(btns).toContain('max-w-full');
    expect(btns).not.toContain('min-w-[120px]');
  });

  it('borda de acento 3px por ação (spec, não 4px)', () => {
    expect(btns).toContain('border-l-[3px]');
    expect(btns).not.toContain('border-l-4');
  });

  it('cor + ícone + texto: svg outline e hint de atalho visível', () => {
    expect(btns).toContain('<svg');
    expect(btns).toContain('stroke-width="1.5"');
    expect(btns).toContain('<kbd');
    expect(btns).toContain('aria-keyshortcuts');
  });

  it('kbd fora do fluxo (canto absoluto) e só com teclado/mouse', () => {
    // Inline cortava em ~86px de botão em TODA viewport (proporção
    // invariante ao scale). Canto absoluto + gate de ponteiro fino.
    expect(btns).toContain('kbd-hint absolute top-1 right-1');
    expect(btns).toContain('@media (hover: hover) and (pointer: fine)');
  });

  it('atalhos F/K/C/R via listener global, ignorando inputs e slider aberto', () => {
    for (const k of ["key: 'f'", "key: 'k'", "key: 'c'", "key: 'r'"]) {
      expect(btns).toContain(k);
    }
    expect(btns).toContain("addEventListener('keydown'");
    expect(btns).toContain('isRaiseSliderOpen');
    expect(btns).toContain('isContentEditable');
  });

  it('Check trava com to-call>0 (nunca emite CHECK ilegal)', () => {
    // nem deveria estar clicável. Só CHECK com toCall==0 (BB option,
    // pós-flop grátis). O guard no handleAction cobre click + atalho K.
    expect(btns).toContain('checkDisabled');
    expect(btns).toMatch(/checkDisabled = computed\(\(\) => heroToCall\.value !== null && heroToCall\.value > 0\)/);
    expect(btns).toContain("action.id === 'check' && checkDisabled");
    expect(btns).toContain("actionId === 'check' && checkDisabled.value");
  });

  it('Call trava com nada a pagar (seria um check disfarçado)', () => {
    expect(btns).toMatch(/callDisabled = computed\(\(\) => heroToCall\.value === 0\)/);
    expect(btns).toContain("action.id === 'call' && callDisabled");
    expect(btns).toContain("actionId === 'call' && callDisabled.value");
  });

  it('slider escala o passo pelo bb e trata a última posição como all-in', () => {
    // Passo fixo de 1 pulava 0.8 → 1.8 com blinds 0.1/0.2 e escondia o topo (all-in).
    expect(btns).toContain(':step="sliderStep"');
    expect(btns).toContain('props.table.bb / 20');
    expect(btns).toContain('atSliderTop(raiseAmount.value)');
    expect(btns).not.toContain('step="1"');
  });

  it('o painel de raise fecha quando a vez acaba e o foco não rola o palco', () => {
    // Relógio estourado deixava o painel aberto (e com Confirm clicável) na mão seguinte.
    expect(btns).toMatch(/if \(off\) closeSlider\(false\)/);
    expect(btns).not.toMatch(/\.focus\(\)/);
  });
});
