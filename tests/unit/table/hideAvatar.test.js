import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// leitura de posição era impossível. Flag `hideAvatar` no drill (default
// false): ativada, vilão vira índice no avatar + RoleBadge some (B/SB/BB
// também vazam posição); herói mantém a dele (range é posicional, Top bar
// já mostra). Hit area e Predict intactos.
const drill = readFileSync(
  new URL('../../../src/components/pages/drill.vue', import.meta.url),
  'utf8'
);
const seat = readFileSync(
  new URL('../../../src/components/PlayerSeat.vue', import.meta.url),
  'utf8'
);
const table = readFileSync(
  new URL('../../../src/components/PokerTable.vue', import.meta.url),
  'utf8'
);

describe('table behavior', () => {
  it('drill.vue tem checkbox + load/save da flag', () => {
    expect(drill).toContain('v-model="hideAvatar"');
    expect(drill).toContain('drill.hideAvatar ?? false');
    expect(drill).toContain('hideAvatar: hideAvatar.value');
  });

  it('PlayerSeat troca posição por índice e some com a RoleBadge', () => {
    expect(seat).toContain('hideAvatar');
    expect(seat).toContain('avatarLabel');
    expect(seat).toContain('!hideAvatar || hero');
    expect(seat).toContain('{{ avatarLabel }}');
  });

  it('PokerTable deriva do ActiveDrill e repassa por seat', () => {
    expect(table).toContain('ActiveDrill.settings?.hideAvatar ?? false');
    expect(table).toContain(':hide-avatar="hideAvatar"');
  });
});
