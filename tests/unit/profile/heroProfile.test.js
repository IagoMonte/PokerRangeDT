import { describe, it, expect } from 'vitest';
import { heroName, setHeroName, HERO_DEFAULT_NAME } from '../../../src/composables/useHeroProfile.js';

// o nome da /profile troca o "VOCÊ" na mesa — vazio volta ao
// default, trim + teto de 12 chars (nome de seat não é parágrafo).

describe('useHeroProfile', () => {
  it('default é VOCÊ', () => {
    setHeroName('');
    expect(heroName.value).toBe(HERO_DEFAULT_NAME);
    expect(HERO_DEFAULT_NAME).toBe('VOCÊ');
  });

  it('trim + teto de 12 chars', () => {
    setHeroName('  Iago  ');
    expect(heroName.value).toBe('Iago');
    setHeroName('123456789012345');
    expect(heroName.value.length).toBe(12);
    setHeroName('');
  });

  it('rejeita não-string sem quebrar', () => {
    setHeroName(null);
    expect(heroName.value).toBe(HERO_DEFAULT_NAME);
  });
});
