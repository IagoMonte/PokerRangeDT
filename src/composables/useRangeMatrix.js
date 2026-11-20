import { ref, computed } from 'vue'
import { Ranges, currentSituation, currentPosition } from './useRangeGame'
import { useActions, SITUATION_ACTIONS, EMPTY_ACTION, BASIC_TOKENS, parseActionLine, tokensForAction } from './useActions'
import { usePersistence } from './usePersistence'
import { useVillains } from './useVillains'
import { RANKS } from '../constants/poker'

// Shared non-blocking notice (replaces blocking alert() so UX and automation never freeze).
// Module-level on purpose: every component calling useRangeMatrix() sees the same notice.
export const notice = ref(null)
let noticeTimer = null

export function notify(message, type = 'NEGATIVE') {
  notice.value = { message, type, key: Date.now() }
  if (noticeTimer) clearTimeout(noticeTimer)
  // Success notices are shorter than error notices.
  noticeTimer = setTimeout(() => {
    notice.value = null
  }, type === 'POSITIVE' ? 2000 : 4000)
}

// Clear pending feedback when a new decision starts.
export function clearNotice() {
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = null
  notice.value = null
}

// Keep orphaned labels visually distinct from fold and configured actions.
const ORPHAN_COLOR = "#C678DD"

export function useRangeMatrix() {
  const {
    actionConfig,
    actionLines,
    addAction,
    updateActionColor,
    removeAction,
    addActionLine,
    removeActionLine,
    isValidQuickAction
  } = useActions()

  const {
    saveAll,
    exportToJSON,
    importFromJSON
  } = usePersistence()

  const { villains } = useVillains()

  function save() {
    saveAll(Ranges, villains)
  }

  const actions = computed(() => {
    const baseActions = SITUATION_ACTIONS[currentSituation.value] || [EMPTY_ACTION]
    const availableBase = baseActions.filter(action =>
      action === EMPTY_ACTION || actionConfig[action] !== undefined
    )
    return [...availableBase, ...actionLines.map(line => line.name)]
  })

  const isDragging = ref(false)
  const currentHoverHand = ref(null)
  const dragActionName = ref(null)

  const ranks = RANKS

  function getActiveRange() {
    if (!currentPosition.value) return new Map()

    const situation = currentSituation.value
    const posKey = currentPosition.value

    if (!Ranges[situation] || !Ranges[situation][posKey]) {
      return new Map()
    }

    return Ranges[situation][posKey]
  }

  function getActionFromRange(range, hand) {
    return labelForTokens(range.get(hand))
  }

  // Tokens → etiqueta de exibição. Etiqueta legada de 1 elemento (ex: "3B FOLD"
  // ou nome de linha) passa direto; tokens acham o dono (linha nomeada, depois
  // quick action); sem dono, join com espaço.
  function labelForTokens(value) {
    const tokens = Array.isArray(value) ? value : (value ? [value] : [])
    if (tokens.length === 0) return 'fold'
    if (tokens.length === 1) {
      const t = tokens[0]
      if (!t || t === 'fold' || t === EMPTY_ACTION) return 'fold'
      if (BASIC_TOKENS.includes(t) || actionConfig[t] !== undefined) return t
      if (actionLines.some(l => l.id === t || l.name === t)) return t
      if ((SITUATION_ACTIONS[currentSituation.value] || []).includes(t)) return t
    }
    const named = actionLines.find(l => Array.isArray(l.sequence)
      && l.sequence.length === tokens.length
      && l.sequence.every((s, i) => s.token === tokens[i]))
    if (named) return named.name
    for (const name of actions.value) {
      if (name === EMPTY_ACTION || BASIC_TOKENS.includes(name)) continue
      const tt = tokensForAction(name)
      if (tt.length === tokens.length && tt.every((t, i) => t === tokens[i])) return name
    }
    return tokens.join(' ')
  }

  function getActionForHand(hand) {
    const range = getActiveRange()
    return getActionFromRange(range, hand)
  }

  // Valor gravado no Map: quick-action com size ("OR 3BB") preserva a
  // ETIQUETA (display round-trips: cor e nome voltam). O engine expande na
  // leitura (normLine/normalizeLine), então decisão nunca vê size. Linha
  // nomeada grava tokens (sequência pertence à linha, não à célula).
  function paintValueFor(name) {
    if (!name || name === 'fold' || name === EMPTY_ACTION) return null
    if (BASIC_TOKENS.includes(name)) return [name]
    if (actionLines.some(l => l && (l.id === name || l.name === name))) {
      return tokensForAction(name)
    }
    try {
      parseActionLine(name)
      return [name]
    } catch {
      return tokensForAction(name)
    }
  }

  function setHandAction(hand, actionName) {
    const range = getActiveRange()
    if (actionName === 'fold' || !actionName) {
      range.delete(hand)
    } else {
      const value = paintValueFor(actionName)
      if (value === null) range.delete(hand)
      else range.set(hand, value)
    }
    save()
  }

  function cycleHandAction(hand) {
    const range = getActiveRange()
    const currentAction = getActionForHand(hand)

    // Single owner: base tokens come from central SITUATION_ACTIONS via actions.
    const availableActions = actions.value

    const currentIdx = availableActions.indexOf(currentAction)
    if (currentIdx === -1) {
      // Ownerless paint: explicit fresh start (erase). Never silent: the
      // orphan is visible beforehand (own color) and recoverable (export
      // keeps its group) — the click only confirms the restart.
      range.delete(hand)
      save()
      return
    }
    const nextIdx = (currentIdx + 1) % availableActions.length
    const nextAction = availableActions[nextIdx]

    if (nextAction === EMPTY_ACTION) {
      range.delete(hand)
    } else {
      const value = paintValueFor(nextAction)
      if (value === null || value.length === 0) range.delete(hand)
      else range.set(hand, value)
    }
    save()
  }

  function clearCurrentRange() {
    const range = getActiveRange()
    range.clear()
    save()
  }

  function handleAddAction(name, color) {
    addAction(name, color, currentSituation.value)
    save()
  }

  function handleUpdateActionColor(name, color) {
    updateActionColor(name, color)
    save()
  }

  function handleRemoveAction(name) {
    removeAction(name, Ranges)
    save()
  }

  function handleAddActionLine(line) {
    addActionLine(line)
    save()
  }

  function handleRemoveActionLine(id) {
    removeActionLine(id, Ranges)
    save()
  }

  function handleExportToJSON() {
    exportToJSON(Ranges, villains)
  }

  function handleImportFromJSON(data) {
    importFromJSON(Ranges, villains, data)
    save()
  }

  function exportRange() {
    const range = getActiveRange()
    const result = {}

    // Single owner: same action list as painting.
    const availableActions = actions.value

    availableActions.forEach(action => {
      if (action === EMPTY_ACTION) return
      result[action] = Array.from(range.entries())
        .filter(([_, act]) => labelForTokens(act) === action)
        .map(([hand, _]) => hand)
    })

    // Ownerless paints are never dropped: each keeps its group under its
    // own label (lossless round-trip; the label is the recovery key).
    for (const [hand, act] of range.entries()) {
      const label = labelForTokens(act)
      if (!availableActions.includes(label)) {
        if (!result[label]) result[label] = []
        result[label].push(hand)
      }
    }

    return result
  }

  function getActionColor(actionName) {
    if (actionName === 'fold') return "#111827"

    const line = actionLines.find(l => l.name === actionName)
    if (line) return line.color

    if (actionConfig[actionName] !== undefined) return actionConfig[actionName]

    // Ownerless label: distinct from fold bg AND every configured action
    // (an orphan that looks like fold is silent data loss).
    return ORPHAN_COLOR
  }

  function getActionDisplayName(actionName) {
    if (!actionName) return 'fold'
    if (actionName === 'fold') return 'Fold'

    const line = actionLines.find(l => l.name === actionName)
    if (line) return line.name

    return actionName
  }

  const getHandLabel = (rowRank, colRank) => {
    if (rowRank === colRank) return rowRank + rowRank
    const rowIdx = ranks.indexOf(rowRank)
    const colIdx = ranks.indexOf(colRank)
    if (rowIdx < colIdx) {
      return rowRank + colRank + 's'
    } else {
      return colRank + rowRank + 'o'
    }
  }

  const getCellColor = (hand) => {
    if (!currentPosition.value) return "#111827"
    const actionName = getActionForHand(hand)
    return getActionColor(actionName)
  }

  const getContrastColor = (hexColor) => {
    if (!hexColor) return 'text-text-primary'

    const color = hexColor.replace('#', '')

    let r, g, b
    if (color.length === 3) {
      r = parseInt(color[0] + color[0], 16)
      g = parseInt(color[1] + color[1], 16)
      b = parseInt(color[2] + color[2], 16)
    } else {
      r = parseInt(color.substring(0, 2), 16)
      g = parseInt(color.substring(2, 4), 16)
      b = parseInt(color.substring(4, 6), 16)
    }

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    return luminance > 0.5 ? 'text-bg-primary' : 'text-text-primary'
  }

  const isHandInSelection = (row, col, hand) => {
    return currentHoverHand.value === hand
  }

  const handleMouseDown = (row, col, hand) => {
    if (!currentPosition.value) {
      notify('Please select a position first!')
      return
    }
    isDragging.value = true

    cycleHandAction(hand)
    dragActionName.value = getActionForHand(hand)
  }

  // Fat-finger: resolve a mão sob o ponto, com sonda em cruz (±10px)
  // p/ o dedo que cai no vão de 2px entre células. elementFromPoint
  // devolve o dono do ::after, e closest() sobe até [data-hand] — sem
  // áreas sobrepostas (viés de paint-order), sem célula maior.
  const resolveTouchHand = (clientX, clientY) => {
    if (typeof document === 'undefined' || !document.elementFromPoint) return null
    const probes = [[0, 0], [10, 0], [-10, 0], [0, 10], [0, -10]]
    for (const [dx, dy] of probes) {
      const el = document.elementFromPoint(clientX + dx, clientY + dy)
      const cell = el?.closest?.('[data-hand]')
      if (cell) {
        const row = parseInt(cell.getAttribute('data-row'))
        const col = parseInt(cell.getAttribute('data-col'))
        const hand = cell.getAttribute('data-hand')
        if (!isNaN(row) && !isNaN(col) && hand) return { row, col, hand }
      }
    }
    return null
  }

  // Delegate touch handling to the container so gaps between cells remain interactive.
  const handleGridTouchStart = (event) => {
    if (event.cancelable) event.preventDefault()
    if (!currentPosition.value) {
      notify('Please select a position first!')
      return
    }
    const touch = event.touches?.[0] || event.changedTouches?.[0]
    if (!touch) return
    const hit = resolveTouchHand(touch.clientX, touch.clientY)
    if (!hit) return
    isDragging.value = true

    cycleHandAction(hit.hand)
    dragActionName.value = getActionForHand(hit.hand)
  }

  const handleMouseEnter = (row, col, hand) => {
    currentHoverHand.value = hand
    if (!isDragging.value) return
    setHandAction(hand, dragActionName.value)
  }

  const handleMouseLeave = () => {
    currentHoverHand.value = null
  }

  const handleTouchMove = (event) => {
    if (!isDragging.value) return

    const touch = event.touches[0]
    const element = document.elementFromPoint(touch.clientX, touch.clientY)
    if (!element) return

    // closest(): o vão entre células devolve o container — subir até a
    // célula evita que o arrasto morra no gap de 2px.
    const cell = element.closest?.('[data-hand]') || element
    const row = parseInt(cell.getAttribute('data-row'))
    const col = parseInt(cell.getAttribute('data-col'))
    const hand = cell.getAttribute('data-hand')

    if (!isNaN(row) && !isNaN(col) && hand) {
      currentHoverHand.value = hand
      setHandAction(hand, dragActionName.value)
    }
  }

  const handleMouseUp = () => {
    isDragging.value = false
    dragActionName.value = null
    currentHoverHand.value = null
  }

  const handleTouchEnd = () => {
    handleMouseUp()
  }

  return {
    ranks,
    actions,
    actionConfig,
    actionLines,
    isValidQuickAction,
    isDragging,
    dragActionName,
    getHandLabel,
    getCellColor,
    getContrastColor,
    isHandInSelection,
    handleMouseDown,
    handleGridTouchStart,
    handleMouseEnter,
    handleTouchMove,
    handleMouseUp,
    handleTouchEnd,
    handleMouseLeave,
    getActionForHand,
    getActionColor,
    getActionDisplayName,
    setHandAction,
    cycleHandAction,
    clearCurrentRange,
    exportRange,
    addAction: handleAddAction,
    updateActionColor: handleUpdateActionColor,
    removeAction: handleRemoveAction,
    addActionLine: handleAddActionLine,
    removeActionLine: handleRemoveActionLine,
    exportToJSON: handleExportToJSON,
    importFromJSON: handleImportFromJSON,
    notice,
    notify
  }
}
