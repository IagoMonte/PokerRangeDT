import { actionConfig, actionLines, SITUATION_ACTIONS, BASIC_TOKENS, tokensForAction, normalizeStep, parseActionLine } from './useActions'
import { Drills } from './useDrillSettings'

const CONFIG_VERSION = 1

export function usePersistence() {
    function saveDrills() {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('drills', JSON.stringify(Drills))
        }
    }

    function loadDrills() {
        if (typeof localStorage === 'undefined') return
        const data = localStorage.getItem('drills')
        if (data) {
            try {
                const parsed = JSON.parse(data)
                Object.assign(Drills, parsed)
            } catch (e) {
                console.error("Failed to load drills from localStorage", e)
            }
        }
    }

    function serializeRanges(Ranges) {
        const serialized = {}
        for (const situation of ['RFI', 'XRFI']) {
            if (!Ranges[situation]) continue
            serialized[situation] = {}
            for (const posKey in Ranges[situation]) {
                serialized[situation][posKey] = Array.from(Ranges[situation][posKey].entries())
            }
        }
        return serialized
    }

    function normalizeLine(v) {
        const arr = Array.isArray(v) ? v : [v]
        // Etiqueta legada de 1 elemento ("3B FOLD", nome de linha) expande
        // para tokens; o resto já está no formato canônico.
        if (arr.length === 1 && typeof arr[0] === 'string'
            && !BASIC_TOKENS.includes(arr[0]) && arr[0].toLowerCase() !== 'fold') {
            const t = arr[0]
            // Quick-action com size ("OR 3BB"): preserva a etiqueta (a cor e
            // o nome voltam no reload). Engine expande na leitura; linha
            // nomeada continua expandindo (sequência pertence à linha).
            const isLine = actionLines.some(l => l && (l.id === t || l.name === t))
            if (!isLine) {
                try {
                    parseActionLine(t)
                    return arr
                } catch { /* cai no expand abaixo */ }
            }
            return tokensForAction(t)
        }
        return arr
    }

    function deserializeRanges(data, Ranges) {
        for (const situation of ['RFI', 'XRFI']) {
            if (!data[situation]) continue
            for (const posKey in data[situation]) {
                if (!Ranges[situation][posKey]) {
                    Ranges[situation][posKey] = new Map()
                }
                Ranges[situation][posKey] = new Map(
                    data[situation][posKey].map(([hand, v]) => [hand, normalizeLine(v)])
                )
            }
        }
    }

    // Saves antigos carregam um campo `state` que nada lê; descartado ao carregar.
    const serializeVillains = (villains) => villains.map(({ state, ...v }) => v)
    const deserializeVillains = (data) => data.map(({ state, ...v }) => v)

    function saveAll(Ranges, villains) {
        if (typeof localStorage === 'undefined') return

        if (Ranges) {
            localStorage.setItem('poker_ranges', JSON.stringify(serializeRanges(Ranges)))
        }
        if (villains) {
            localStorage.setItem('villains_data', JSON.stringify(serializeVillains(villains.value)))
        }
        localStorage.setItem('poker_actions_config', JSON.stringify(actionConfig))
        localStorage.setItem('poker_situations_actions', JSON.stringify(SITUATION_ACTIONS))
        localStorage.setItem('poker_action_lines', JSON.stringify(actionLines))
    }

    function loadAll(Ranges, villains) {
        if (typeof localStorage === 'undefined') return

        // Ações/linhas ANTES dos ranges: o normalizeLine expande etiquetas
        // legadas ("3B FOLD", nome de linha) e precisa do registro carregado.
        const actionsData = localStorage.getItem('poker_actions_config')
        if (actionsData) {
            try {
                const parsed = JSON.parse(actionsData)
                Object.assign(actionConfig, parsed)
            } catch (e) {
                console.error("Failed to load actions from localStorage", e)
            }
        }

        const situationsData = localStorage.getItem('poker_situations_actions')
        if (situationsData) {
            try {
                const parsed = JSON.parse(situationsData)
                Object.assign(SITUATION_ACTIONS, parsed)
            } catch (e) {
                console.error("Failed to load situations from localStorage", e)
            }
        }

        const linesData = localStorage.getItem('poker_action_lines')
        if (linesData) {
            try {
                const parsed = JSON.parse(linesData)
                // Migração de shape: steps antigos {token,value} → {token,size}.
                for (const line of parsed) {
                    if (line && Array.isArray(line.sequence)) {
                        line.sequence = line.sequence.map(normalizeStep)
                    }
                }
                // Preserve array identity while replacing persisted lines.
                actionLines.splice(0, actionLines.length, ...parsed)
            } catch (e) {
                console.error("Failed to load action lines from localStorage", e)
            }
        }

        const rangesData = localStorage.getItem('poker_ranges')
        if (rangesData && Ranges) {
            try {
                const parsed = JSON.parse(rangesData)
                deserializeRanges(parsed, Ranges)
            } catch (e) {
                console.error("Failed to load ranges from localStorage", e)
            }
        }

        const villainsData = localStorage.getItem('villains_data')
        if (villainsData && villains) {
            try {
                const parsed = JSON.parse(villainsData)
                const target = villains.value !== undefined ? villains : { value: villains }
                target.value = deserializeVillains(parsed)
                if (villains.value === undefined) {
                    villains = target
                }
            } catch (e) {
                console.error("Failed to load villains from localStorage", e)
            }
        }
    }

    function exportToJSON(Ranges, villains) {
        const data = JSON.stringify({
            ranges: serializeRanges(Ranges),
            villains: serializeVillains(villains.value),
            actions: actionConfig
        }, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'poker_villains_library.json'
        link.click()
        URL.revokeObjectURL(url)
    }

    // Config completa (Profile): ranges + villains + cores + drills + linhas.
    // build/apply são puros p/ teste; export/import só cuidam do arquivo.
    function buildConfigPayload(Ranges, villains) {
        return {
            version: CONFIG_VERSION,
            ranges: serializeRanges(Ranges),
            villains: serializeVillains(villains.value),
            actions: actionConfig,
            situationsActions: SITUATION_ACTIONS,
            actionLines,
            drills: Drills
        }
    }

    function applyConfigPayload(Ranges, villains, data) {
        let parsed
        try {
            parsed = typeof data === 'string' ? JSON.parse(data) : data
        } catch {
            throw new Error('config: invalid JSON')
        }
        if (!parsed || parsed.version !== CONFIG_VERSION) {
            throw new Error(`config: unsupported version ${parsed?.version ?? '?'} (expected ${CONFIG_VERSION})`)
        }
        // Formato inteiro validado antes de aplicar qualquer parte: arquivo ruim não importa pela metade.
        const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
        const shapes = { actions: isObj, situationsActions: isObj, actionLines: Array.isArray, ranges: isObj, villains: Array.isArray, drills: isObj }
        for (const [key, ok] of Object.entries(shapes)) {
            if (parsed[key] !== undefined && !ok(parsed[key])) {
                throw new Error(`config: malformed "${key}"`)
            }
        }
        // Ações/linhas ANTES dos ranges (mesma ordem do loadAll): normalizeLine
        // precisa do registro carregado.
        if (parsed.actions) Object.assign(actionConfig, parsed.actions)
        if (parsed.situationsActions) Object.assign(SITUATION_ACTIONS, parsed.situationsActions)
        if (Array.isArray(parsed.actionLines)) {
            const lines = parsed.actionLines.map(line =>
                line && Array.isArray(line.sequence)
                    ? { ...line, sequence: line.sequence.map(normalizeStep) }
                    : line
            )
            actionLines.splice(0, actionLines.length, ...lines)
        }
        if (parsed.ranges) deserializeRanges(parsed.ranges, Ranges)
        if (parsed.villains) villains.value = deserializeVillains(parsed.villains)
        if (parsed.drills) Object.assign(Drills, parsed.drills)
        saveDrills()
        saveAll(Ranges, villains)
    }

    function exportConfigJSON(Ranges, villains) {
        const data = JSON.stringify(buildConfigPayload(Ranges, villains), null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'poker_config_full.json'
        link.click()
        URL.revokeObjectURL(url)
    }

    function importConfigJSON(Ranges, villains, data) {
        applyConfigPayload(Ranges, villains, data)
    }

    function importFromJSON(Ranges, villains, data) {
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data
            if (parsed.ranges) {
                deserializeRanges(parsed.ranges, Ranges)
            }
            if (parsed.villains) {
                villains.value = deserializeVillains(parsed.villains)
            }
            if (parsed.actions) {
                Object.assign(actionConfig, parsed.actions)
            }
        } catch (e) {
            console.error("Failed to import from JSON", e)
            throw e
        }
    }

    return {
        saveAll,
        loadAll,
        saveDrills,
        loadDrills,
        exportToJSON,
        importFromJSON,
        buildConfigPayload,
        applyConfigPayload,
        exportConfigJSON,
        importConfigJSON,
        normalizeLine
    }
}
