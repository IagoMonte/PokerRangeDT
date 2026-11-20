<script setup>
import { ref, onMounted } from 'vue';
import { fmtMoney } from '../composables/useDisplayUnit';
import { VFX } from '../vfx.js';

// One-shot flying action token: seat → pot center, then unmounts itself.
// Props in, nothing out, no shared state. Kill-switch: VFX.flyingToken
// (parent never mounts this when false). Reduced-motion: never mounts.
const props = defineProps({
    flight: { type: Object, required: true }, // {seat, token, size, key, pos:{x,y}}
    bb: { type: Number, default: 0 },
});

const gone = ref(
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

const TOKEN_STYLE = {
    CALL: '#5FB4A5',
    LIMP: '#5FB4A5',
    OR: '#E5A84B',
    '3B': '#E5A84B',
    '4B': '#E5A84B',
    'ALL-IN': '#C678DD',
};

onMounted(() => {
    // Safety: never linger (e.g. animationend swallowed by tab switch).
    setTimeout(() => { gone.value = true; }, VFX.dur.flight + 600);
});
</script>

<template>
    <div v-if="!gone"
        class="flying-token pointer-events-none absolute z-30 flex items-center gap-1 px-2 py-1 rounded-md bg-bg-secondary border font-mono text-xs whitespace-nowrap"
        :style="{
            left: `calc(${flight.pos.x}% )`,
            top: `${flight.pos.y}%`,
            borderColor: TOKEN_STYLE[flight.token] || '#3A4255',
            color: TOKEN_STYLE[flight.token] || '#E6EDF3',
            animationDuration: VFX.dur.flight + 'ms',
            '--fx-x0': `${flight.pos.x}%`,
            '--fx-y0': `${flight.pos.y}%`,
        }"
        @animationend="gone = true">
        <span class="font-bold">{{ flight.token }}</span>
        <span v-if="flight.size">{{ fmtMoney(flight.size, bb) }}</span>
    </div>
</template>

<style scoped>
.flying-token {
    transform: translate(-50%, -50%);
    animation: token-fly 450ms ease-in forwards; /* duration overridden inline from VFX.dur.flight */
}
@keyframes token-fly {
    0% { left: var(--fx-x0); top: var(--fx-y0); opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
    15% { opacity: 1; }
    100% { left: 50%; top: 43%; opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
}
</style>
