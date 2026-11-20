<script setup>
import CardComponent from './CardComponent.vue';
import { VFX } from '../vfx.js';

// Show card backs until the hand is revealed at showdown.
defineProps({
    cards: {
        type: Array,
        default: () => []
    },
    revealed: {
        type: Boolean,
        default: false
    },
    showdownKey: {
        type: [Number, String],
        default: 0
    },
    winner: {
        type: Boolean,
        default: false
    }
});
</script>

<template>
    <div class="flex items-center justify-center" :class="{ 'villain-winner': winner && revealed }">
        <!-- Animate cards as they are revealed. -->
        <div :key="showdownKey + '-' + (revealed ? 'up' : 'down')" class="flex -space-x-3"
            :class="revealed && cards.length >= 2 ? 'reveal-flip' : 'deal-in'"
            :style="{ animationDuration: (revealed && cards.length >= 2 ? 200 : VFX.dur.deal) + 'ms' }">
            <template v-if="revealed && cards.length >= 2">
                <CardComponent :card="cards[0]" variant="mini" class="-rotate-6" />
                <CardComponent :card="cards[1]" variant="mini" class="rotate-6" />
            </template>
            <template v-else>
                <div class="card-back -rotate-6" aria-hidden="true">♠</div>
                <div class="card-back rotate-6" aria-hidden="true">♠</div>
            </template>
        </div>
    </div>
</template>

<style scoped>
/* Keep card backs visually distinct from revealed card faces. */
.card-back {
    width: var(--villain-card-w);
    height: var(--villain-card-h);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    line-height: 1;
    color: var(--color-border-active);
    background: linear-gradient(to bottom, var(--color-bg-tertiary), var(--color-bg-secondary));
    border: 1px solid var(--color-border-active);
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}
/* Winner reveal: same action-primary glow vocabulary as hero-turn. */
.villain-winner {
    filter: drop-shadow(0 0 6px rgba(124, 147, 255, 0.55));
}
/* Reveal cards with a brief ease-out flip. */
.reveal-flip {
    animation-name: reveal-flip;
    animation-timing-function: ease-out;
    animation-fill-mode: both;
    backface-visibility: hidden;
}
@keyframes reveal-flip {
    from { transform: rotateY(90deg); opacity: 0; }
    to { transform: rotateY(0deg); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
    .villain-winner { filter: none; }
    .reveal-flip { animation: none; }
}
</style>
