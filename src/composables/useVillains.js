import { ref } from 'vue'

// Researched presets (PreflopTrainer archetypes: Nit VPIP 8-12, TAG 15-22,
// LAG 28-40; 2+2 reg baselines for 3B/4B). Clicking a preset only fills the
// sliders — the user saves via Save Profile.
export const VILLAIN_PRESETS = {
    Tight: { RFI: 0.12, '3BET': 0.05, '4BET': 0.02, BLUFF: 0.15, CALL: 0.05 },
    Balanced: { RFI: 0.20, '3BET': 0.08, '4BET': 0.03, BLUFF: 0.30, CALL: 0.08 },
    Loose: { RFI: 0.32, '3BET': 0.12, '4BET': 0.05, BLUFF: 0.50, CALL: 0.12 },
    Station: { RFI: 0.08, '3BET': 0.03, '4BET': 0.01, BLUFF: 0.10, CALL: 0.40 },
    Maniac: { RFI: 0.45, '3BET': 0.15, '4BET': 0.06, BLUFF: 0.60, CALL: 0.15 },
}

const villains = ref([
    {
        stats: { NAME: 'VILLAIN-1', RFI: 0.22, "3BET": 0.08, "4BET": 0.05, BLUFF: 0.30, CALL: 0.08 }
    },
    ...Array(7).fill(null).map((_, i) => ({
        stats: { NAME: `VILLAIN-${i+2}`, RFI: 0.22, "3BET": 0.08, "4BET": 0.05, BLUFF: 0.30, CALL: 0.08 }
    }))
])

export function useVillains() {
    function getVillains(index) {
        return villains.value[index].stats.NAME
    }

    function applyPreset(index, name) {
        const preset = VILLAIN_PRESETS[name];
        if (!preset) {
            throw new Error(`villains: unknown preset "${name}"`);
        }
        if (!villains.value[index]) {
            throw new Error(`villains: no villain at index ${index}`);
        }
        Object.assign(villains.value[index].stats, preset);
    }

    return {
        villains,
        getVillains,
        applyPreset
    }
}
