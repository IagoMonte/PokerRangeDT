<script setup>
import CardComponent from './CardComponent.vue';
import { VFX } from '../vfx.js';

defineProps({
    cards: {
        type: Array,
        default: () => []
    },
    isTurn: {
        type: Boolean,
        default: false
    },
    dealKey: {
        type: Number,
        default: 0
    }
});
</script>

<template>
    <!-- On the board: cards sit on the felt in front of the hero seat,
         % of the table container like the seats — resolution-independent. -->
    <div id="hero-cards"
        class="absolute left-1/2 -translate-x-1/2 top-[81%] flex gap-2 z-20"
        :class="{ 'hero-turn': isTurn }">
        <div :key="dealKey" class="flex gap-2 deal-in" :style="{ animationDuration: VFX.dur.deal + 'ms' }">
        <template v-if="cards && cards.length">
            <CardComponent
                v-for="(card, index) in cards"
                :key="index"
                :card="card"
                variant="hero"
            />
        </template>
        <div v-else class="w-[var(--hero-card-w)] h-[var(--hero-card-h)] invisible" aria-hidden="true" />
        </div>
    </div>
</template>

<style scoped>
/* Highlight the hero cards while it is their turn. */
.hero-turn :deep(.hero-glow) {
    animation: hero-pulse 2s infinite ease-out;
}
@keyframes hero-pulse {
    0%, 100% {
        border-color: #3A4255;
        box-shadow: 0 0 0 rgba(124, 147, 255, 0);
    }
    50% {
        border-color: #7C93FF;
        box-shadow: 0 0 18px rgba(124, 147, 255, 0.2);
    }
}
/* Deal-in keyframes live in style.css (shared with BoardDisplay/VillainHand). */
@media (prefers-reduced-motion: reduce) {
    .hero-turn :deep(.hero-glow) {
        animation: none;
        border-color: #7C93FF;
        box-shadow: 0 0 18px rgba(124, 147, 255, 0.2);
    }
}
</style>
