import { reactive } from 'vue';

const Drills = reactive({
    "10s preflop": {
        preflop: true,
        posflop: false,
        ActionTime: 10,
        blinds: [10, 20],
        stacks: 100,
        hands: 20,
        villainDelayMs: 600,
        predictAlways: false
    },
    "fulldrill 20s": {
        preflop: true,
        posflop: true,
        ActionTime: 20,
        blinds: [0.1, 0.2],
        stacks: 50,
        hands: 20,
        villainDelayMs: 600,
        predictAlways: false
    },
    "postflop 10s": {
        preflop: false,
        posflop: true,
        ActionTime: 10,
        blinds: [0.1, 0.2],
        stacks: 50,
        hands: 20,
        villainDelayMs: 600,
        predictAlways: false
    }
});

const ActiveDrill = reactive({
    name: null,
    settings: null
});

export { Drills, ActiveDrill };

// Roteador de modo (puro): flags do drill → ramo do runHand.
// 'invalid' (nenhuma rua) cai no path full por compatibilidade —
// o chamador só ramifica pre-only / post-only explicitamente.
export function resolveDrillMode(settings) {
    const pre = !!settings?.preflop;
    const post = !!settings?.posflop;
    if (pre && !post) return 'pre-only';
    if (!pre && post) return 'post-only';
    if (pre && post) return 'full';
    return 'invalid';
}

export function useDrillSettings() {
    function getDrills() {
        return Object.keys(Drills);
    }

    function getStack(name) {
        if (!Drills[name]) return 0;
        return Drills[name].stacks * Drills[name].blinds[1];
    }

    function getBlinds(name) {
        if (!Drills[name]) return [0, 0];
        return Drills[name].blinds;
    }

    function getSettings(name) {
        if (!Drills[name]) return null;
        const { preflop, posflop, ActionTime, hands, villainDelayMs } = Drills[name];
        return { preflop, posflop, ActionTime, hands, villainDelayMs };
    }

    function addDrill(name, settings) {
        Drills[name] = settings;
    }

    function setActiveDrill(name) {
        ActiveDrill.name = name;
        ActiveDrill.settings = Drills[name];
    }

    return {
        Drills,
        ActiveDrill,
        getDrills,
        getStack,
        getBlinds,
        getSettings,
        addDrill,
        setActiveDrill
    };
}
