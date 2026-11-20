import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Regressões visuais da mesa (QA): lidas do fonte, como o resto de tests/unit/table.
const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), 'utf8');

describe('chips de rua anterior não sobrevivem na mesa', () => {
  it('RoleBadge de blind some pós-flop: senão SB/BB parecem apostas fantasmas', () => {
    expect(src('components/PokerTable.vue')).toContain(':postflop="shown > 0"');
    expect(src('components/PlayerSeat.vue')).toContain(':has-bet="bet > 0 || postflop"');
  });

  it('fichas não desenham entre o flop aparecer e o pré-flop ser bancado', () => {
    const play = src('components/pages/play.vue');
    expect(play).toContain('engineTable.value && streetBanked.value');
    expect(play).toMatch(/streetBanked\.value = false;\s*await pause\(VFX\.dur\.linger\);\s*streetBanked\.value = true;/);
  });
});

describe('stack exibido é o stack vivo do engine', () => {
  it('play passa stacks do engine e a mesa os prefere ao balance sincronizado no settle', () => {
    expect(src('components/pages/play.vue')).toContain('engineTable.value.seats.map(s => s.stack)');
    expect(src('components/pages/play.vue')).toContain(':stacks="stackBySeat"');
    expect(src('components/PokerTable.vue')).toContain(':balance="stacks[index] ?? Player.balance"');
  });
});

describe('CALL do pote fica legível', () => {
  it('rótulo ao lado do POT (não embaixo, atrás do board) e some com pote liquidado', () => {
    const c = src('components/CenterPot.vue');
    expect(c).toContain('left-full');
    expect(c).not.toContain('mt-1');
    expect(c).toContain('toCall > 0 && pot > 0');
  });
});

describe('valor a pagar exibido', () => {
  it('nunca passa do stack do herói (all-in curto)', () => {
    const play = readFileSync(new URL('../../../src/components/pages/play.vue', import.meta.url), 'utf8');
    expect(play).toMatch(/Math\.min\(toCall\(engineTable\.value, HERO_SEAT\), engineTable\.value\.seats\[HERO_SEAT\]\.stack\)/);
  });
});
