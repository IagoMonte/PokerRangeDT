<script setup>
import { computed } from 'vue';

const props = defineProps({
    card: {
        type: String,
        required: true
    },
    variant: {
        type: String,
        default: 'default'
    }
});

const cardDetails = computed(() => {
    const rank = props.card[0];
    const suit = props.card[1];
    const isRed = suit === '♥' || suit === '♦' || suit === 'h' || suit === 'd';
    return { rank, suit, colorClass: isRed ? 'text-action-fold' : 'text-text-primary' };
});

// Screen-reader name: card faces are text glyphs, so name the whole
// ("Ace of hearts") instead of spelling corner/center fragments.
const RANKS = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', T: '10' };
const SUITS = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs', s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
const ariaLabel = computed(() => {
    const rank = RANKS[cardDetails.value.rank] || cardDetails.value.rank;
    const suit = SUITS[cardDetails.value.suit];
    // Unknown suit (TD/DT placeholders pre-deal): a hidden card, not a name.
    if (!suit) return 'Face-down card';
    return `${rank} of ${suit}`;
});

// Size map per variant: hero (felt, large), mini (villain seats), default (board).
const size = computed(() => {
    if (props.variant === 'hero') return {
        box: 'hero-glow w-[var(--hero-card-w)] h-[var(--hero-card-h)] bg-gradient-to-b from-bg-tertiary to-bg-secondary border-border-active',
        corner: 'text-xs', cornerSuit: 'text-[10px]', center: 'text-2xl',
    };
    if (props.variant === 'mini') return {
        // Keep exposed villain cards consistent with the hero card treatment.
        box: 'w-[var(--villain-card-w)] h-[var(--villain-card-h)] bg-gradient-to-b from-bg-tertiary to-bg-secondary border-border-active',
        corner: 'text-[10px]', cornerSuit: 'text-[8px]', center: 'text-lg',
    };
    if (props.variant === 'board') return {
        // Community board: dark like every other face on the felt;
        // keeps the classic w-8 h-11 board footprint.
        box: 'w-8 h-11 bg-gradient-to-b from-bg-tertiary to-bg-secondary border-border-active',
        corner: 'text-[10px]', cornerSuit: 'text-[8px]', center: 'text-lg',
    };
    return {
        box: 'w-8 h-11 bg-white border-gray-300',
        corner: 'text-[10px]', cornerSuit: 'text-[8px]', center: 'text-lg',
    };
});
</script>

<template>
    <div role="img" :aria-label="ariaLabel" :class="[
        'flex flex-col items-center justify-center rounded border relative overflow-hidden shadow-sm',
        size.box
    ]">
        <div :class="['absolute top-1 left-1 font-bold leading-none', cardDetails.colorClass, size.corner ]">
            {{ cardDetails.rank }}
            <span :class="['block', size.cornerSuit ]">{{ cardDetails.suit }}</span>
        </div>
        <div :class="['flex-1 flex items-center justify-center', cardDetails.colorClass, size.center ]">
            {{ cardDetails.suit }}
        </div>
        <div :class="['absolute bottom-1 right-1 font-bold leading-none rotate-180', cardDetails.colorClass, size.corner ]">
            {{ cardDetails.rank }}
            <span :class="['block', size.cornerSuit ]">{{ cardDetails.suit }}</span>
        </div>
    </div>
</template>

<style scoped>
</style>
