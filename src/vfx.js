// Action choreography: feature flags + pure event mirror.
// The driver emits {type:'turn'|'action', seat, token?, size?, allIn?};
// play.vue folds them into a reactive mirror via reduceVfxEvent.
// Pure reducer (no Vue) so the mapping event → seat state is unit-testable.

export const VFX = {
    // FlyingToken kill-switch: false = component never mounts, the rest
    // of the choreography (ring/pulse/dim) is unaffected.
    flyingToken: true,
    // Single rhythm source (ms). CSS keyframes read these via inline
    // animation-duration; the count-up composable reads dur.countUp.
    dur: { pulse: 400, flight: 900, countUp: 600, deal: 500, street: 600, linger: 1200 },
};

export function createVfxMirror() {
    return { actor: -1, folded: [], allIn: [], lastAction: null, plaques: {}, key: 0 };
}

// User motion preference (not drill speed): reduced-motion skips the pot
// count-up and the settle pauses. typeof-guard keeps node tests happy.
export function prefersReducedMotion() {
    return typeof matchMedia !== 'undefined'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Plaque display: dry verbs only (FOLD/CALL/CHECK/RAISE/ALL-IN).
// Engine tokens stay intact in the mirror — this is the last step before paint.
const PLAQUE_LABEL = {
    FOLD: 'FOLD',
    CALL: 'CALL',
    LIMP: 'CALL',
    CHECK: 'CHECK',
    OR: 'RAISE',
    '3B': 'RAISE',
    '4B': 'RAISE',
    'ALL-IN': 'ALL-IN',
};

export function plaqueLabel(token) {
    return PLAQUE_LABEL[token] ?? token;
}

export function reduceVfxEvent(m, e) {
    if (!e || typeof e.seat !== 'number') return m;
    if (e.type === 'turn') {
        m.actor = e.seat;
    } else if (e.type === 'action') {
        m.key += 1;
        m.lastAction = { seat: e.seat, token: e.token, size: e.size ?? null, key: m.key };
        // Plaque: latest action per seat, cleared only on hand reset.
        m.plaques[e.seat] = { token: e.token, size: e.size ?? null };
        if (e.token === 'FOLD' && !m.folded.includes(e.seat)) m.folded.push(e.seat);
        if (e.allIn && !m.allIn.includes(e.seat)) m.allIn.push(e.seat);
    }
    return m;
}
