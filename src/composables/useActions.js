import { reactive } from 'vue'
import { potTotal } from '../engine/table.js'

export const BASIC_TOKENS = ['OR', 'CALL', '3B', '4B', 'FOLD', 'ALL-IN', 'LIMP'];

// 'fold' (lowercase) is the EMPTY sentinel = absence of action in Range Maps.
// Deliberately distinct from the 'FOLD' paint token. Do not unify without migrating stored ranges.
export const EMPTY_ACTION = 'fold';

export const actionConfig = reactive({
    "OR": "#3B82F6",
    "CALL": "#9CA3AF",
    "3B": "#22C55E",
    "4B": "#E5A84B",
    "FOLD": "#E06C75",
    "ALL-IN": "#EAB308",
    "LIMP": "#7DD3FC",
})

export const actionLines = reactive([]);

const COLOR_PALETTE = ['#F59E0B', '#EC4899', '#14B8A6', '#A855F7', '#84CC16', '#F97316', '#06B6D4', '#EF4444'];

// Cor padrão de uma ação/linha nova: a primeira da paleta que nenhuma outra usa,
// para a célula pintada não ficar igual a "OR" no grid.
export function nextFreeColor() {
    const used = new Set([...Object.values(actionConfig), ...actionLines.map((l) => l?.color)]
        .filter(Boolean).map((c) => String(c).toLowerCase()));
    return COLOR_PALETTE.find((c) => !used.has(c.toLowerCase())) ?? '#3B82F6';
}

export const SITUATION_ACTIONS = reactive({
    RFI: [EMPTY_ACTION, 'OR', 'LIMP'],
    XRFI: [EMPTY_ACTION, 'CALL', '3B', 'ALL-IN']
})

// ---------------------------------------------------------------------------
// Parsing + sequence validation (single owner; RangeMatrix/Builder consume)
// ---------------------------------------------------------------------------

// '3bb' | '2.5x' | '4' → { value, unit: 'bb' | 'x' | 'raw' }. Throws on invalid.
export function parseSize(raw) {
    if (typeof raw !== 'string') {
        throw new Error(`actions: invalid size "${raw}" (expected text like 3bb, 2.5x or 4)`);
    }
    const s = raw.trim().toUpperCase();
    let unit = 'raw';
    let num = s;
    if (s.endsWith('BB')) {
        unit = 'bb';
        num = s.slice(0, -2);
    } else if (s.endsWith('X')) {
        unit = 'x';
        num = s.slice(0, -1);
    }
    const value = Number(num);
    if (num === '' || !Number.isFinite(value) || value <= 0) {
        throw new Error(`actions: invalid size "${raw}" (expected a number > 0 with optional bb/x suffix)`);
    }
    return { value, unit };
}

// Sequence legality: only the impossible is rejected. A single token is always
// legal (atomic label — context may be implied, e.g. "3B" alone, "3B FOLD").
// Lines are facing-conditional plans; villain aggression is implicit, so 3B
// needs no earlier token (it lives in XRFI) and 4B needs an earlier OR
// (its 3B target is the implicit aggression — or an opening LIMP:
// the limp-trap-jam). For length >= 2: FOLD/ALL-IN are terminal; OR and LIMP
// only open (index 0 — "OR LIMP" and "OR → LIMP" are impossible: after an open
// there is aggression, and a limp is by definition a dry BB call with none);
// 3B/4B appear at most once (no re-raise at the same level); CALL is free
// (cold-call, facing, cross-street).
export function assertLegalTokens(tokens) {
    if (!Array.isArray(tokens) || tokens.length === 0) {
        throw new Error('actions: empty action sequence');
    }
    if (tokens.length === 1) return true;

    const openedLimp = tokens[0] === 'LIMP';
    const last = tokens.length - 1;
    for (let i = 0; i < last; i++) {
        if (tokens[i] === 'FOLD' || tokens[i] === 'ALL-IN') {
            throw new Error(`actions: nothing can come after ${tokens[i]} ("${tokens.join(' ')}")`);
        }
    }
    const seen = new Set();
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (i > 0 && t === 'OR') {
            throw new Error(`actions: OR can only open a sequence ("${tokens.join(' ')}")`);
        }
        if (i > 0 && t === 'LIMP') {
            throw new Error(`actions: LIMP can only open a sequence ("${tokens.join(' ')}")`);
        }
        if (t === '3B') {
            if (seen.has('3B')) {
                throw new Error(`actions: duplicate 3B in one sequence ("${tokens.join(' ')}")`);
            }
        }
        if (t === '4B') {
            if (seen.has('4B')) {
                throw new Error(`actions: duplicate 4B in one sequence ("${tokens.join(' ')}")`);
            }
            if (!seen.has('OR') && !openedLimp) {
                throw new Error(`actions: 4B needs an earlier OR or opening LIMP ("${tokens.join(' ')}")`);
            }
        }
        seen.add(t);
    }
    return true;
}

// "OR 3bb" | "OR 3B FOLD" → [{ token, size|null }]. Sizes attach to the
// preceding token and are not steps. Throws with the reason; see assertLegalTokens.
export function parseActionLine(input) {
    if (typeof input !== 'string' || input.trim() === '') {
        throw new Error('actions: empty action line');
    }
    const parts = input.trim().toUpperCase().split(/\s+/);
    if (!BASIC_TOKENS.includes(parts[0])) {
        throw new Error(`actions: must start with a valid token (${BASIC_TOKENS.join(', ')})`);
    }
    const steps = [{ token: parts[0], size: null }];
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (BASIC_TOKENS.includes(part)) {
            steps.push({ token: part, size: null });
            continue;
        }
        steps[steps.length - 1].size = parseSize(part);
    }
    assertLegalTokens(steps.map(s => s.token));
    return steps;
}

// Teto "CALL N" (etiqueta sized pinta o teto em bb/x/raw): "CALL 2" paga
// open até 2bb, acima folda. Sem size ou sem CALL → null (sem teto).
// Pura (nunca dá throw — etiqueta opaca não é teto).
export function parseCallCap(name) {
    if (typeof name !== 'string') return null;
    let steps;
    try {
        steps = parseActionLine(name);
    } catch {
        return null;
    }
    if (steps.length !== 1 || steps[0].token !== 'CALL' || steps[0].size == null) return null;
    // Convenção do drill: número nu em CALL ("CALL 2") é bb — é o que a
    // spec do usuário diz ("call para open até 2 bb") e o que dá sentido
    // aos dois tiers (2 vs 3.5); raw como chips mataria os dois vs open
    // padrão 2.5bb. Sufixos explícitos (bb/x) passam direto.
    const size = steps[0].size;
    if (size.unit === 'raw') return { value: size.value, unit: 'bb' };
    return size;
}

// Teto {value, unit} → bb numéricos (x = múltiplos do BB, raw = chips).
export function callCapToBb(cap, bb) {
    if (!cap || !(cap.value > 0)) return null;
    if (!Number.isFinite(Number(bb)) || Number(bb) <= 0) return null;
    if (cap.unit === 'bb' || cap.unit === 'x') return cap.value;
    return cap.value / Number(bb);
}

// Label → tokens. Base token devolve ele mesmo; action line devolve sua
// sequência; quick action ("3B FOLD", "OR 3bb") parseia para os tokens
// (size é detalhe de execução, não entra no range). Desconhecido volta [name].
export function tokensForAction(name, lines = actionLines) {
    if (!name) return []
    if (BASIC_TOKENS.includes(name)) return [name]
    const line = (lines || []).find(l => l && (l.id === name || l.name === name))
    if (line && Array.isArray(line.sequence)) return line.sequence.map(s => s.token)
    try {
        return parseActionLine(name).map(s => s.token)
    } catch {
        return [name]
    }
}

// ---------------------------------------------------------------------------
// Token → function (switch dispatch; table is injected, unwired by default)
// ---------------------------------------------------------------------------

// Step shape canônico: { token, size }. Salvos antigos do builder usam
// `value` — normaliza na escrita e na leitura, nunca quebra.
export function normalizeStep(step) {
    if (!step || typeof step.token !== 'string') return step;
    if (step.size !== undefined) return { token: step.token, size: step.size };
    if (step.value !== undefined) return { token: step.token, size: step.value };
    return { token: step.token, size: null };
}

const notWired = (fn) => () => {
    throw new Error(`actions: table.${fn} not wired yet (drill loop owns the table)`);
};

// Default table: every call throws. Fail loud until the drill loop wires the real one.
export const unwiredTable = {
    openRaise: notWired('openRaise'),
    call: notWired('call'),
    reRaise: notWired('reRaise'),
    fold: notWired('fold'),
    allIn: notWired('allIn'),
    limp: notWired('limp'),
};

// CHECK is a postflop action — there is no CHECK token. Explicit no-op until
// the postflop engine exists; the button points here instead of faking a token.
export function checkStub() {
    return undefined;
}

// Accepts a "OR 3bb" string, a single { token, size } step, or parsed steps.
// Runs each step against the table in order and returns the results.
export function executeAction(input, ctx = {}) {
    const { table = unwiredTable } = ctx;
    let steps;
    if (typeof input === 'string') {
        steps = parseActionLine(input);
    } else if (Array.isArray(input)) {
        steps = input;
    } else if (input && typeof input.token === 'string') {
        steps = [input];
    } else {
        throw new Error('actions: executeAction needs a line string, a step, or steps');
    }
    // Raw steps get the same gate as parsed lines: known tokens, legal order.
    for (const step of steps) {
        if (!step || !BASIC_TOKENS.includes(step.token)) {
            throw new Error(`actions: invalid step "${step && step.token}" (expected one of ${BASIC_TOKENS.join(', ')})`);
        }
    }
    assertLegalTokens(steps.map(s => s.token));
    return steps.map(({ token, size }) => {
        switch (token) {
            case 'OR': return table.openRaise(size);
            case 'CALL': return table.call(size);
            case '3B': return table.reRaise(size, 3);
            case '4B': return table.reRaise(size, 4);
            case 'FOLD': return table.fold();
            case 'ALL-IN': return table.allIn(size);
            case 'LIMP': return table.limp();
            default: throw new Error(`actions: unknown token "${token}"`);
        }
    });
}

// ---------------------------------------------------------------------------
// actionButtons → valid tokens (pure; actions never guesses table context)
// ---------------------------------------------------------------------------

const FACING_TO_AGGRO = { none: 'OR', open: '3B', '3b': '4B', '4b': 'ALL-IN', postflop: 'OR' };

export function resolveAggression(facing = 'none') {
    const token = FACING_TO_AGGRO[facing];
    if (!token) {
        throw new Error(`actions: unknown facing "${facing}" (expected none, open, 3b, 4b or postflop)`);
    }
    return token;
}

// Raise slider is a 0-100 percent; 100 means shove.
function parseSliderValue(value) {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0 || v > 100) {
        throw new Error(`actions: invalid raise value "${value}" (expected 0 < v <= 100)`);
    }
    return v;
}

// Absolute chip raise-to (from the slider/presets, computed off the live
// table by the component). Pure validation only — clamp lives with the table.
function parseChipsValue(value) {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) {
        throw new Error(`actions: invalid raise chips "${value}" (expected v > 0)`);
    }
    return v;
}

// Hero raise presets → absolute raise-to in chips, off the LIVE table:
// BB multiples for opens, pot fractions above (currentBet + toCall + frac×pot).
// Clamped to [minRaiseTo, stack] — the engine throws below min, so presets
// never hand it an illegal size (short stacks become short all-ins).
export const RAISE_PRESETS = [
    { label: '2.5x', kind: 'bb', mult: 2.5 },
    { label: '3x', kind: 'bb', mult: 3 },
    { label: '1/3 pot', kind: 'pot', frac: 1 / 3 },
    { label: '1/2 pot', kind: 'pot', frac: 1 / 2 },
    { label: '2/3 pot', kind: 'pot', frac: 2 / 3 },
    { label: 'pot', kind: 'pot', frac: 1 },
];

export function presetToChips(table, seat, preset) {
    if (!table) throw new Error('actions: preset needs the live table');
    const pot = potTotal(table);
    const tc = Math.max(0, table.currentBet - table.seats[seat].committed);
    // Múltiplos de bb escalam a maior aposta da mesa: contra um open, "3x" é um 3-bet de 3× o open.
    const raw = preset.kind === 'bb'
        ? preset.mult * Math.max(table.bb, table.currentBet)
        : table.currentBet + tc + preset.frac * pot;
    // Mesma grade do slider (bb/20): 2/3 do pote não vira 113.33.
    const grid = table.bb > 0 ? table.bb / 20 : 1;
    const snapped = Math.round(raw / grid) * grid;
    const min = table.currentBet + table.lastIncrement;
    const max = table.seats[seat].committed + table.seats[seat].stack;
    return Math.min(Math.max(+snapped.toFixed(4), min), max);
}

// A call for exactly the BB with no aggression ahead is an open-limp —
// except from the blinds (SB complete / BB check-through is separate business).
export function callIsLimp({ facing, toCallChips, bbChips, heroRole }) {
    return facing === 'none'
        && toCallChips === bbChips
        && heroRole !== 'SMALL_BLIND'
        && heroRole !== 'BIG_BLIND';
}

export function fromButtons(id, opts = {}) {    const { value = null, facing = 'none', unit = 'pct' } = opts;
    switch (id) {
        case 'fold':
            return { token: 'FOLD', size: null };
        case 'call':
            return { token: 'CALL', size: null };
        case 'check':
            return { token: null, run: checkStub, deferred: 'postflop' };
        case 'raise-confirm': {
            if (unit === 'chips') {
                return { token: resolveAggression(facing), size: { value: parseChipsValue(value), unit: 'chips' } };
            }
            const v = parseSliderValue(value);
            if (v === 100) return { token: 'ALL-IN', size: null };
            return { token: resolveAggression(facing), size: { value: v, unit: 'pct' } };
        }
        default:
            throw new Error(`actions: unknown button "${id}"`);
    }
}

export function useActions() {
    function addAction(name, color, currentSituation) {
        actionConfig[name] = color;
        if (SITUATION_ACTIONS[currentSituation] && !SITUATION_ACTIONS[currentSituation].includes(name)) {
            SITUATION_ACTIONS[currentSituation].push(name);
        }
    }

    function updateActionColor(name, color) {
        const line = actionLines.find(l => l.id === name || l.name === name);
        if (line) {
            line.color = color;
            return;
        }

        if (actionConfig[name] !== undefined) {
            actionConfig[name] = color;
        }
    }

    function toTokens(action) {
        return Array.isArray(action) ? action : [action];
    }

    function sameTokens(a, b) {
        return a.length === b.length && a.every((t, i) => t === b[i]);
    }

    // Remove a label dos ranges: mão pintada exatamente com ela sai inteira;
    // token base contido numa linha maior é só destacado (o resto fica).
    // sameTokens só para alvos multi-token: alvo de 1 token ("OR" vindo de
    // "OR 3BB") nukearia a base inteira — sized tem etiqueta própria e sai
    // só pelo match exato acima.
    function sweepRanges(Ranges, name, target) {
        for (const situationKey of ['RFI', 'XRFI']) {
            if (!Ranges[situationKey]) continue;
            for (const posKey in Ranges[situationKey]) {
                const range = Ranges[situationKey][posKey];
                for (const [hand, action] of range.entries()) {
                    const toks = toTokens(action);
                    if ((toks.length === 1 && toks[0] === name) || (target.length > 1 && sameTokens(toks, target))) {
                        range.delete(hand);
                    } else if (BASIC_TOKENS.includes(name) && toks.includes(name)) {
                        const rest = toks.filter(t => t !== name);
                        if (rest.length === 0) range.delete(hand);
                        else range.set(hand, rest);
                    }
                }
            }
        }
    }

    function removeAction(name, Ranges) {
        const lineIndex = actionLines.findIndex(l => l.id === name || l.name === name);
        if (lineIndex !== -1) {
            removeActionLine(name, Ranges);
            return;
        }

        delete actionConfig[name];

        for (const situation in SITUATION_ACTIONS) {
            SITUATION_ACTIONS[situation] = SITUATION_ACTIONS[situation].filter(a => a !== name);
        }

        sweepRanges(Ranges, name, tokensForAction(name));
    }

    function addActionLine(line) {
        if (!line || typeof line.name !== 'string' || line.name.trim() === '') {
            throw new Error('actions: action line needs a name');
        }
        if (actionLines.some(l => l && (l.id === line.id || l.name === line.name))) {
            throw new Error(`actions: duplicate action line "${line.name}"`);
        }
        if (!Array.isArray(line.sequence) || line.sequence.length === 0) {
            throw new Error(`actions: action line "${line.name}" needs at least one token`);
        }
        const tokens = [];
        const sequence = [];
        for (const step of line.sequence) {
            if (!step || !BASIC_TOKENS.includes(step.token)) {
                throw new Error(`actions: action line "${line.name}" has invalid token "${step && step.token}"`);
            }
            const norm = normalizeStep(step);
            if (norm.size !== undefined && norm.size !== null && String(norm.size).trim() !== '') {
                parseSize(String(norm.size));
            }
            tokens.push(norm.token);
            sequence.push(norm);
        }
        assertLegalTokens(tokens);
        actionLines.push({ ...line, sequence });
    }

    function removeActionLine(id, Ranges) {
        const found = actionLines.find(l => l.id === id || l.name === id);
        if (!found) return;
        const target = found.sequence.map(s => s.token);
        actionLines.splice(actionLines.indexOf(found), 1);

        sweepRanges(Ranges, found.name, target);
    }

    function isValidQuickAction(name) {
        try {
            parseActionLine(name);
            return true;
        } catch {
            return false;
        }
    }

    function getVillainAction(range, hand) {
        const action = range.get(hand);
        return action || 'fold';
    }

    return {
        actionConfig,
        actionLines,
        SITUATION_ACTIONS,
        addAction,
        updateActionColor,
        removeAction,
        addActionLine,
        removeActionLine,
        parseActionLine,
        parseSize,
        assertLegalTokens,
        executeAction,
        fromButtons,
        resolveAggression,
        callIsLimp,
        checkStub,
        isValidQuickAction,
        getVillainAction
    }
}
