// Pick do vilão p/ predict obrigatório (drill predictAlways). Puro:
// entra contexto da mão, sai seat ou -1 (sem vilão na mão = skip honesto).
// Pós-flop HU → o vilão; multiway → aleatório entre os vivos (folded fora,
// all-in dentro); pré-flop → último agressor vilão (herói não conta);
// sem agressor vilão → aleatório entre os vivos.

const AGGRO_TOKENS = new Set(['OR', '3B', '4B', 'ALL-IN']);

function entrySeat(e) {
  if (Array.isArray(e)) return e[0];
  return e?.seat;
}

function entryToken(e) {
  if (Array.isArray(e)) return e[1];
  return e?.token;
}

export function pickPredictSeat({
  reachedPostflop = false,
  liveVillains = [],
  preflopActions = [],
  heroSeat = 0,
  rng = Math.random,
} = {}) {
  const live = (liveVillains || []).filter((s) => s !== heroSeat);
  if (live.length === 0) return -1;
  if (reachedPostflop) {
    if (live.length === 1) return live[0];
    return live[Math.floor((rng ? rng() : Math.random()) * live.length)];
  }
  for (let i = (preflopActions || []).length - 1; i >= 0; i--) {
    const e = preflopActions[i];
    if (AGGRO_TOKENS.has(entryToken(e)) && entrySeat(e) !== heroSeat) {
      const s = entrySeat(e);
      if (live.includes(s)) return s;
    }
  }
  if (live.length === 1) return live[0];
  return live[Math.floor((rng ? rng() : Math.random()) * live.length)];
}
