<script setup>
import CardComponent from './CardComponent.vue';
import { VFX } from '../vfx.js';

// Community board on the felt: 5 slots always, empty = dashed outline,
// dealt = white face-up cards with a flop cascade (stagger per index).
// Stable per-card keys: streets mount only their new cards, a new hand
// (revealKey) remounts everything.
defineProps({
    cards: {
        type: Array,
        default: () => []
    },
    shown: {
        type: Number,
        default: 0
    },
    revealKey: {
        type: [Number, String],
        default: 0
    }
});
</script>

<template>
    <div class="flex gap-1.5 items-center justify-center" data-testid="board">
        <template v-for="i in 5" :key="revealKey + '-' + i">
            <div v-if="i <= shown && cards[i - 1]" class="deal-in"
                :style="{ animationDuration: VFX.dur.deal + 'ms', animationDelay: ((i - 1) * 50) + 'ms' }">
                <CardComponent :card="cards[i - 1]" variant="board" />
            </div>
            <div v-else class="w-8 h-11 rounded border border-dashed border-border-active bg-bg-primary/40" aria-hidden="true" />
        </template>
    </div>
</template>
