import { reactive, ref } from 'vue'
import { HAND_RANKINGS, getComboCount, RFI_BLUFF_RANKING, XRFI_BLUFF_RANKING, FOURBET_RANKING } from '../infra/handRankings'
import { POSITION_TO_RANGE_KEY, POSITION_MODS } from '../infra/positions'
import { BASIC_TOKENS, parseActionLine, parseCallCap } from './useActions'

export const Ranges = reactive({
  RFI: {
    UTG: new Map(),
    MP: new Map(),
    CO: new Map(),
    BTN: new Map(),
    SB: new Map(),
  },
  XRFI: {
    UTG: new Map(),
    MP: new Map(),
    CO: new Map(),
    BTN: new Map(),
    SB: new Map(),
    BB: new Map(),
  },
  actions: {}
})

export const currentSituation = ref('RFI')
export const currentPosition = ref('')

export function calculateRangeFromPercentage(percentage, bluffFreq = 0, bluffRanking = RFI_BLUFF_RANKING) {
  // Escala única decimal 0-1 (gtobase.md §3.4). percentage/bluffFreq fora dela são erro de chamador.
  if (percentage <= 0) return new Set()
  if (percentage >= 1) return new Set(HAND_RANKINGS)

  const TOTAL_COMBOS = 1326
  const targetCombos = Math.round(percentage * TOTAL_COMBOS)
  const bluffCombosTarget = Math.round(targetCombos * bluffFreq)
  const valueCombosTarget = targetCombos - bluffCombosTarget

  const selectedHands = new Set()
  let currentCombos = 0

  for (const hand of HAND_RANKINGS) {
    const combos = getComboCount(hand)
    // gtobase.md §4: booleano por mão — inclui sse aproxima do alvo (empate inclui).
    // break preserva o prefixo do ranking (mais forte primeiro); desvio final ≤ 6.
    if (Math.abs(currentCombos + combos - valueCombosTarget) <= Math.abs(currentCombos - valueCombosTarget)) {
      selectedHands.add(hand)
      currentCombos += combos
    } else {
      break
    }
  }

  // Alvo > 0 nunca volta vazio: garante a primeira mão do ranking.
  if (valueCombosTarget > 0 && selectedHands.size === 0) {
    selectedHands.add(HAND_RANKINGS[0])
    currentCombos += getComboCount(HAND_RANKINGS[0])
  }

  if (bluffCombosTarget > 0) {
    let bluffCombos = 0
    for (const hand of bluffRanking) {
      if (selectedHands.has(hand)) continue
      const combos = getComboCount(hand)
      if (Math.abs(bluffCombos + combos - bluffCombosTarget) <= Math.abs(bluffCombos - bluffCombosTarget)) {
        selectedHands.add(hand)
        bluffCombos += combos
      } else {
        break
      }
    }
    // Sem fallback aleatório: se o ranking esgotar, o alvo fica incompleto (documentado).
  }

  return selectedHands
}

// Canonical: every range line is an array of tokens (e.g. ['OR'], ['OR', '4B']).
// Legacy single-element labels ("3B FOLD") expand via parse (registry-free);
// 'fold' means absence and drops out.
function normLine(v) {
  if (!v) return []
  const arr = Array.isArray(v) ? [...v] : [v]
  if (arr.length === 1 && typeof arr[0] === 'string') {
    const t = arr[0]
    if (t.toLowerCase() === 'fold') return []
    if (!BASIC_TOKENS.includes(t)) {
      try {
        return parseActionLine(t).map(s => s.token)
      } catch {
        // Etiqueta opaca (nome de linha): mantém, engine só lê tokens conhecidos.
      }
    }
  }
  return arr
}

// Teto "CALL N" da etiqueta pintada (crua, sem trim): "CALL 2" → cap 2bb.
// Lê o rótulo cru do Map (sem normLine — a normalização come o size).
// Pura — etiqueta opaca/sem size volta null (sem teto).
export function getXrfiCallCap(POS, hand) {
  const posKey = POSITION_TO_RANGE_KEY[POS]
  if (!posKey || !hand) return null
  const v = Ranges.XRFI[posKey]?.get(hand)
  const label = Array.isArray(v) && v.length === 1 && typeof v[0] === 'string' ? v[0] : null
  if (!label) return null
  return parseCallCap(label)
}

// Raw painted line for one hand (NO stat trim — the study answer key).
// Returns { rfi, xrfi } token arrays or null when unpainted/empty.
export function getRawPaintedLine(POS, hand) {
  const posKey = POSITION_TO_RANGE_KEY[POS]
  if (!posKey || !hand) return { rfi: null, xrfi: null }
  const raw = (map) => {
    const v = map?.get(hand)
    if (!v) return null
    const line = normLine(v)
    return line.length > 0 ? line : null
  }
  return {
    rfi: raw(Ranges.RFI[posKey]),
    xrfi: raw(Ranges.XRFI[posKey]),
  }
}

export function rangeGame() {

  function normMap(map) {
    const out = new Map()
    for (const [hand, v] of map) {
      const line = normLine(v)
      if (line.length > 0) out.set(hand, line)
    }
    return out
  }

  function getRangePos(POS) {
    const posKey = POSITION_TO_RANGE_KEY[POS]
    if (!posKey) return { rfi: new Map(), xrfi: new Map() }

    const baseRfi = Ranges.RFI[posKey] || new Map()
    const baseXrfi = Ranges.XRFI[posKey] || new Map()
    const modPercent = POSITION_MODS[POS] || 0
    const extraCombosTarget = Math.round((modPercent / 100) * 1326)

    if (extraCombosTarget === 0) {
      return { rfi: baseRfi, xrfi: baseXrfi }
    }

    const rfiCopy = new Map(baseRfi)
    let rfiCombosAdded = 0
    for (const hand of HAND_RANKINGS) {
      if (rfiCopy.has(hand)) continue
      const combos = getComboCount(hand)
      // gtobase.md §4: booleano por mão (empate inclui); break preserva o prefixo.
      if (Math.abs(rfiCombosAdded + combos - extraCombosTarget) <= Math.abs(rfiCombosAdded - extraCombosTarget)) {
        rfiCopy.set(hand, ['OR'])
        rfiCombosAdded += combos
      } else {
        break
      }
    }

    const xrfiCopy = new Map(baseXrfi)
    let xrfiCombosAdded = 0
    for (const hand of HAND_RANKINGS) {
      if (xrfiCopy.has(hand)) continue
      const combos = getComboCount(hand)
      if (Math.abs(xrfiCombosAdded + combos - extraCombosTarget) <= Math.abs(xrfiCombosAdded - extraCombosTarget)) {
        xrfiCopy.set(hand, ['CALL'])
        xrfiCombosAdded += combos
      } else {
        break
      }
    }

    return { rfi: rfiCopy, xrfi: xrfiCopy }
  }
  
  
  function getModRange({ POS, RFI = 0, threeBet = 0, fourBet = 0, bluff = 0, call = null }) {
    const posKey = POSITION_TO_RANGE_KEY[POS]
    if (!posKey) return { rfi: new Map(), xrfi: new Map() }

    // Call-only band: hands that call an open but never 3-bet (the station's
    // food). Defaults to threeBet = today's behavior; bigger values extend the
    // xrfi set down the ranking with ['CALL'] lines (no 3B tag).
    const callFreq = Math.max(call ?? threeBet, threeBet)

    const baseRange = getRangePos(POS)
    const baseRfi = normMap(baseRange.rfi)
    const baseXrfi = normMap(baseRange.xrfi)
    // RFI has no 3B: strip the token (a 3B faces a raise, it never opens).
    // Emptied lines drop out like unpainted hands (a lone FOLD is absence).
    for (const [hand, line] of baseRfi) {
      const rest = line.filter(t => t !== '3B')
      if (rest.length === 0 || (rest.length === 1 && rest[0].toLowerCase() === 'fold')) baseRfi.delete(hand)
      else baseRfi.set(hand, rest)
    }
    const rfiResult = new Map()
    const xrfiResult = new Map()

    if (RFI > 0) {
      const rfiTarget = Math.round(RFI * 1326)
      const bluffTarget = Math.round(rfiTarget * bluff * 0.33)
      const valueTarget = rfiTarget - bluffTarget

      const rfiBase = new Map(baseRfi)
      let rfiCombos = 0
      for (const hand of rfiBase.keys()) rfiCombos += getComboCount(hand)

      if (rfiCombos < valueTarget) {
        for (const hand of HAND_RANKINGS) {
          if (rfiBase.has(hand)) continue
          const combos = getComboCount(hand)
          // gtobase.md §4: booleano por mão (empate inclui); break preserva o prefixo.
          if (Math.abs(rfiCombos + combos - valueTarget) <= Math.abs(rfiCombos - valueTarget)) {
            rfiBase.set(hand, ['OR'])
            rfiCombos += combos
          } else {
            break
          }
        }
        // Alvo > 0 nunca volta vazio.
        if (valueTarget > 0 && rfiBase.size === 0) {
          rfiBase.set(HAND_RANKINGS[0], ['OR'])
          rfiCombos += getComboCount(HAND_RANKINGS[0])
        }
      } else if (rfiCombos > valueTarget) {
        const sorted = [...rfiBase.keys()].sort((a, b) => HAND_RANKINGS.indexOf(b) - HAND_RANKINGS.indexOf(a))
        for (const hand of sorted) {
          const combos = getComboCount(hand)
          // Remove só se aproximar (empate mantém — conservador).
          if (Math.abs(rfiCombos - combos - valueTarget) < Math.abs(rfiCombos - valueTarget)) {
            rfiCombos -= combos
            rfiBase.delete(hand)
          } else {
            break
          }
        }
      }

      if (bluffTarget > 0) {
        let bluffCombos = 0
        for (const hand of RFI_BLUFF_RANKING) {
          if (rfiBase.has(hand)) continue
          if (baseRfi.has(hand)) continue
          const combos = getComboCount(hand)
          if (Math.abs(bluffCombos + combos - bluffTarget) <= Math.abs(bluffCombos - bluffTarget)) {
            rfiBase.set(hand, ['OR'])
            bluffCombos += combos
          } else {
            break
          }
        }
        // Sem fallback aleatório: ranking esgotado → alvo incompleto (documentado).
      }

      for (const [hand, actions] of rfiBase) {
        rfiResult.set(hand, actions)
      }

      if (fourBet > 0 && rfiBase.size > 0) {
        let totalRfiCombos = 0
        for (const hand of rfiBase.keys()) totalRfiCombos += getComboCount(hand)

        const fourBetCombosTarget = Math.round(fourBet * totalRfiCombos)
        let fourBetCombos = 0

        for (const hand of FOURBET_RANKING) {
          if (!rfiBase.has(hand)) continue
          if (fourBetCombos >= fourBetCombosTarget) break

          const actions = rfiResult.get(hand) || ['OR']
          // Never append past a terminal line (FOLD/ALL-IN end the plan).
          if (!actions.includes('4B') && !actions.includes('FOLD') && !actions.includes('ALL-IN')) actions.push('4B')
          rfiResult.set(hand, actions)
          fourBetCombos += getComboCount(hand)
        }
      }
    }

    if (threeBet > 0 || callFreq > 0) {
      const xrfiTarget = Math.round(threeBet * 1326)
      const bluffTarget = Math.round(xrfiTarget * bluff * 0.67)
      const valueTarget = xrfiTarget - bluffTarget

      const xrfiBase = new Map(baseXrfi)
      let xrfiCombos = 0
      for (const hand of xrfiBase.keys()) xrfiCombos += getComboCount(hand)

      if (xrfiCombos < valueTarget) {
        for (const hand of HAND_RANKINGS) {
          if (xrfiBase.has(hand)) continue
          const combos = getComboCount(hand)
          // gtobase.md §4: booleano por mão (empate inclui); break preserva o prefixo.
          if (Math.abs(xrfiCombos + combos - valueTarget) <= Math.abs(xrfiCombos - valueTarget)) {
            xrfiBase.set(hand, ['CALL'])
            xrfiCombos += combos
          } else {
            break
          }
        }
        // Alvo > 0 nunca volta vazio.
        if (valueTarget > 0 && xrfiBase.size === 0) {
          xrfiBase.set(HAND_RANKINGS[0], ['CALL'])
          xrfiCombos += getComboCount(HAND_RANKINGS[0])
        }
      } else if (xrfiCombos > valueTarget) {
        const sorted = [...xrfiBase.keys()].sort((a, b) => HAND_RANKINGS.indexOf(b) - HAND_RANKINGS.indexOf(a))
        for (const hand of sorted) {
          const combos = getComboCount(hand)
          // Remove só se aproximar (empate mantém — conservador).
          if (Math.abs(xrfiCombos - combos - valueTarget) < Math.abs(xrfiCombos - valueTarget)) {
            xrfiCombos -= combos
            xrfiBase.delete(hand)
          } else {
            break
          }
        }
      }

      if (bluffTarget > 0) {
        let bluffCombos = 0
        for (const hand of XRFI_BLUFF_RANKING) {
          if (xrfiBase.has(hand)) continue
          // Banda nunca reescreve mão pintada: trim tirou p/ bater o stat,
          // ressuscitar como ['CALL'] mataria a etiqueta ("3B FOLD"→CALL).
          if (baseXrfi.has(hand)) continue
          const combos = getComboCount(hand)
          if (Math.abs(bluffCombos + combos - bluffTarget) <= Math.abs(bluffCombos - bluffTarget)) {
            xrfiBase.set(hand, ['CALL'])
            bluffCombos += combos
          } else {
            break
          }
        }
        // Sem fallback aleatório: ranking esgotado → alvo incompleto (documentado).
      }

      // Call-only extension band (only when call is explicitly bigger than
      // threeBet — the default path stays byte-identical to before).
      const callOnly = new Set()
      const callTarget = Math.round(callFreq * 1326)
      let callCombos = 0
      for (const hand of xrfiBase.keys()) callCombos += getComboCount(hand)
      if (call !== null && call > threeBet && callCombos < callTarget) {
        for (const hand of HAND_RANKINGS) {
          if (xrfiBase.has(hand)) continue
          // Idem banda de blefe: mão pintada cortada pelo trim fica fora.
          if (baseXrfi.has(hand)) continue
          const combos = getComboCount(hand)
          if (Math.abs(callCombos + combos - callTarget) <= Math.abs(callCombos - callTarget)) {
            xrfiBase.set(hand, ['CALL'])
            callOnly.add(hand)
            callCombos += combos
          } else {
            break
          }
        }
      }

      for (const [hand, actions] of xrfiBase) {
        if (callOnly.has(hand)) {
          xrfiResult.set(hand, ['CALL'])
        } else if (baseXrfi.has(hand)) {
          xrfiResult.set(hand, actions)
        } else {
          // Engine-completed core is the 3B population (disjoint from flats).
          xrfiResult.set(hand, ['3B'])
        }
      }
    }

    // Tetos "CALL N" sobreviventes: etiqueta crua → cap; trim tira a mão
    // junto (sem cap órfão). Engine-completadas nunca têm teto.
    const xrfiCaps = new Map()
    for (const [hand, v] of baseRange.xrfi || []) {
      if (!xrfiResult.has(hand)) continue
      const label = Array.isArray(v) && v.length === 1 && typeof v[0] === 'string' ? v[0] : null
      const cap = label ? parseCallCap(label) : null
      if (cap) xrfiCaps.set(hand, cap)
    }

    return { rfi: rfiResult, xrfi: xrfiResult, xrfiCaps }
  }

  return {
    Ranges,
    currentSituation,
    currentPosition,
    getModRange,
    getRangePos
  }
}
