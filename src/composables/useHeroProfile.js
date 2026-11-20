import { ref } from 'vue';

// Hero identity: the name typed on /profile replaces the "VOCÊ" seat.
// Persisted (poker_hero_name); empty/invalid falls back to the default.
// Same storage guard as useDisplayUnit (tests run without localStorage).
export const HERO_DEFAULT_NAME = 'VOCÊ';
const KEY = 'poker_hero_name';
const MAX_LEN = 12;

function load() {
  if (typeof localStorage === 'undefined') return HERO_DEFAULT_NAME;
  const raw = localStorage.getItem(KEY);
  const name = typeof raw === 'string' ? raw.trim().slice(0, MAX_LEN) : '';
  return name || HERO_DEFAULT_NAME;
}

export const heroName = ref(load());

export function setHeroName(n) {
  const name = typeof n === 'string' ? n.trim().slice(0, MAX_LEN) : '';
  heroName.value = name || HERO_DEFAULT_NAME;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(KEY, heroName.value);
    } catch {
      // Quota/privado: nome da sessão segue, só não persiste.
    }
  }
}

export function useHeroProfile() {
  return { heroName, setHeroName, HERO_DEFAULT_NAME };
}
