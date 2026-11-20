import { describe, it, expect } from 'vitest';
import { seatAvatarLabel } from '../../../src/infra/positions.js';

// de graça, e a do herói já aparece na top bar. Todo avatar mostra a inicial do nome.
describe('seatAvatarLabel', () => {
  it('vilão mostra a inicial do nome, nunca a posição', () => {
    expect(seatAvatarLabel({ hero: false, name: 'VILLAIN-3', role: 'CUTOFF', index: 4 })).toBe('V');
    expect(seatAvatarLabel({ hero: false, name: 'cleiton', role: 'BUTTON', index: 2 })).toBe('C');
  });

  it('herói também mostra a inicial do nome, não a posição', () => {
    expect(seatAvatarLabel({ hero: true, name: 'iagodt', role: 'CUTOFF', index: 0 })).toBe('I');
    expect(seatAvatarLabel({ hero: true, name: 'VOCÊ', role: 'SMALL_BLIND', index: 0 })).toBe('V');
  });

  it('vilão sem nome cai no índice do seat', () => {
    expect(seatAvatarLabel({ hero: false, name: '  ', role: 'UTG', index: 5 })).toBe('5');
  });
});
