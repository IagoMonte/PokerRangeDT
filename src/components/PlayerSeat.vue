<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import RoleBadge from './RoleBadge.vue';
import VillainHand from './VillainHand.vue';
import { seatAvatarLabel } from '../infra/positions';
import { fmtMoney } from '../composables/useDisplayUnit';
import { VFX, plaqueLabel } from '../vfx.js';

// Touch interactions toggle the popover; pointer hover opens it.
const canHover = ref(false);
// A short delay lets the pointer reach the popover before it closes.
let closeTimer = null;
function cancelClose() {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = null;
}
function scheduleClose() {
    cancelClose();
    closeTimer = setTimeout(() => {
        closeTimer = null;
        emit('close');
    }, 220);
}
onMounted(() => {
    canHover.value = window.matchMedia?.('(hover: hover)').matches ?? false;
});
onUnmounted(() => cancelClose());

const emit = defineEmits(['predict', 'select', 'peek', 'close']);
const props = defineProps({
    position: {
        type: Object,
        required: true,
        validator: (value) => typeof value === 'object' && 'x' in value && 'y' in value
    },
    name: {
        type: String,
        default: 'Player'
    },
    balance: {
        type: [String, Number],
        default: '1000'
    },
    index: {
        type: [Number],
        required: true
    },
    ButtonPosition: {
        type: Object,
        required: true,
        validator: (value) => typeof value === 'object' && 'x' in value && 'y' in value
    },
    hero: {
        type: Boolean,
        required: true
    },
    role: {
        type: String,
        default: ''
    },
    sb: {
        type: Number,
        default: 0
    },
    bb: {
        type: Number,
        default: 0
    },
    isActor: {
        type: Boolean,
        default: false
    },
    dimmed: {
        type: Boolean,
        default: false
    },
    allIn: {
        type: Boolean,
        default: false
    },
    actionToken: {
        type: String,
        default: ''
    },
    actionKey: {
        type: Number,
        default: 0
    },
    plaque: {
        type: Object,
        default: null
    },
    bet: {
        type: Number,
        default: 0
    },
    postflop: {
        type: Boolean,
        default: false
    },
    holeCards: {
        type: Array,
        default: () => []
    },
    revealed: {
        type: Boolean,
        default: false
    },
    winner: {
        type: Boolean,
        default: false
    },
    showdownKey: {
        type: [Number, String],
        default: 0
    },
    folded: {
        type: Boolean,
        default: false
    },
    selected: {
        type: Boolean,
        default: false
    },
    hintPredict: {
        type: Boolean,
        default: false
    },
    hideAvatar: {
        type: Boolean,
        default: false
    }
});

// Keep a pending close timer from affecting another seat's popover.
watch(() => props.selected, (s) => {
    if (!s) cancelClose();
});

function onHoverAvatar() {
    if (!canHover.value) return;
    cancelClose();
    emit('peek', props.index);
}

// Place top-seat popovers below the seat to keep them inside the table.
const belowSeat = () => (props.position?.y ?? 50) < 30;

// Use a name initial without exposing range or position information.
const avatarLabel = computed(() => seatAvatarLabel({ name: props.name, index: props.index }));
// Add inner padding near table edges without moving the seat anchor.
const edgePad = computed(() => {
    const x = props.position?.x ?? 50;
    if (x < 10) return 'pl-4';
    if (x > 90) return 'pr-4';
    return '';
});

const ACTION_PULSE = {
    CALL: '#5FB4A5',
    LIMP: '#5FB4A5',
    OR: '#E5A84B',
    '3B': '#E5A84B',
    '4B': '#E5A84B',
    'ALL-IN': '#C678DD',
    FOLD: '#E06C75',
};
</script>

<template>
    <!-- 
    The root element must use absolute positioning and bind its style 
    to the received 'position' prop.
    The parent container using this component MUST have position: relative.
  -->
    <div :style="{ left: position.x + '%', top: position.y + '%', transform: 'translate(-50%, -50%)' }"
        class="absolute flex flex-col items-center w-20 transition-studio"
        :class="[{ 'opacity-40': dimmed }, selected ? 'z-30' : 'z-20', edgePad]"
        @keydown.escape="cancelClose(); emit('select', -1)"
        @mouseenter="cancelClose()"
        @mouseleave="canHover && scheduleClose()">

        <!-- Villain hole cards: backs while live, faces on showdown reveal.
             Folded seats muck (backs disappear); hero uses PlayerHand. -->
        <VillainHand v-if="!hero && !dimmed && holeCards.length >= 2"
            :cards="holeCards" :revealed="revealed" :winner="winner" :showdown-key="showdownKey"
            class="absolute -top-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none" />

        <!-- Avatar: botão só p/ vilão vivo. Com mouse, hover abre o popover;
             no touch, tap alterna (ver canHover acima). -->
        <button
            v-if="!hero && !folded"
            @click="canHover ? emit('peek', index) : emit('select', index)"
            @mouseenter="onHoverAvatar"
            :aria-expanded="selected"
            :aria-label="hintPredict ? `Ações de ${name} — Predict range aqui` : `Ações de ${name}`"
            :title="`Ações de ${name}`"
            class="flex flex-col w-15 text-center align-text-bottom h-15 rounded-full border-2 bg-bg-secondary overflow-hidden relative items-center justify-center font-bold text-text-primary transition-studio cursor-pointer hover:border-action-primary"
            :class="[
                allIn ? 'border-action-allin seat-allin' : isActor ? 'border-action-primary seat-actor' : selected ? 'border-action-primary' : 'border-border-subtle',
                hintPredict && !selected ? 'hint-pulse' : ''
            ]">
            {{ avatarLabel }}
            <div class="absolute bottom-0 w-full bg-black/50 text-white text-[10px] flex justify-center gap-1">
            </div>
        </button>
        <!-- Avatar estático: herói e folded -->
        <div
            v-else
            class="flex flex-col w-15 text-center align-text-bottom h-15 rounded-full border-2 bg-bg-secondary overflow-hidden relative items-center justify-center font-bold text-text-primary transition-studio"
            :class="[
                allIn ? 'border-action-allin seat-allin' : isActor ? 'border-action-primary seat-actor' : 'border-border-subtle'
            ]">
            {{ avatarLabel }}
            <div class="absolute bottom-0 w-full bg-black/50 text-white text-[10px] flex justify-center gap-1">
            </div>
        </div>

        <!-- Predict: só o botão, flutuando para dentro da mesa (sem card).
             Fecha via overlay da mesa, Escape, Predict ou o schedule de
             220ms no mouseleave. -->
        <Transition name="seat-pop">
        <button v-if="selected && !hero && !folded"
            @click="cancelClose(); emit('predict', index)"
            aria-label="Predict range"
            :class="[
                'predict-hit absolute left-1/2 -translate-x-1/2 z-40 px-1.5 py-px font-mono text-[10px] font-medium bg-action-primary text-bg-primary rounded shadow-2xl hover:brightness-110 transition-all whitespace-nowrap',
                belowSeat() ? 'top-full translate-y-1' : 'bottom-full -translate-y-1',
            ]"
        >
            Predict
        </button>
        </Transition>

        <!-- One-shot action pulse, remounted per action via key -->
        <div v-if="ACTION_PULSE[actionToken] && actionKey > 0" :key="'pulse-' + actionKey"
            class="seat-pulse pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-15 h-15 rounded-full border-2"
            :style="{ borderColor: ACTION_PULSE[actionToken], animationDuration: VFX.dur.pulse + 'ms' }"></div>

        <!-- Live bet chip: current committed, toward-pot overlay, no layout shift -->
        <div v-if="bet > 0"
            class="absolute top-0 right-0 z-30 px-1.5 py-0.5 rounded-full bg-bg-tertiary border border-border-active font-mono text-[10px] font-medium text-text-primary whitespace-nowrap">
            {{ fmtMoney(bet, bb) }}
        </div>
  
  
        <!-- Player Name -->
        <div class="text-[12px] mt-1 text-text-secondary text-center max-w-full truncate">{{ name }}</div>

        <!-- Player Balance -->
        <div class="text-[11px] font-mono text-text-primary text-center max-w-full truncate">{{ fmtMoney(balance, bb) }}</div>

        <!-- Last-action plaque: dry verb, persists until the hand resets -->
        <div v-if="plaque && ACTION_PULSE[plaque.token]"
            class="mt-0.5 px-1.5 py-px rounded border font-mono text-[10px] font-medium whitespace-nowrap bg-bg-secondary"
            :style="{ borderColor: ACTION_PULSE[plaque.token], color: ACTION_PULSE[plaque.token] }">
            {{ plaqueLabel(plaque.token) }}
        </div>


        <!-- Pós-flop o badge de blind viraria uma "ficha" fantasma ao lado do seat. -->
        <RoleBadge v-if="!hideAvatar || hero" :role="role" :position="ButtonPosition" :sb="sb" :bb="bb" :has-bet="bet > 0 || postflop" />
    </div>
</template>


<style scoped>
/* Action choreography: transform/opacity only, ease-out in.
   Duration comes from VFX.dur.pulse via inline animation-duration. */
.seat-actor {
    box-shadow: 0 0 14px rgba(124, 147, 255, 0.35);
}
.seat-allin {
    box-shadow: 0 0 16px rgba(198, 120, 221, 0.45);
}
.seat-pulse {
    animation: seat-pulse 200ms ease-out;
}
/* Expand the Predict touch target without changing its visible size. */
.predict-hit {
    position: absolute;
}
.predict-hit::after {
    content: '';
    position: absolute;
    inset: -13px -4px;
}
/* Animate opacity only so the popover's positioning transform is preserved. */
.seat-pop-enter-active {
    transition: opacity 150ms ease-out;
}
.seat-pop-leave-active {
    transition: opacity 120ms ease-in;
}
.seat-pop-enter-from {
    opacity: 0;
}
.seat-pop-leave-to {
    opacity: 0;
}
@keyframes seat-pulse {
    0% { transform: translateX(-50%) scale(1); opacity: 0.9; }
    100% { transform: translateX(-50%) scale(1.6); opacity: 0; }
}
/* The hint pulse adds emphasis without changing the avatar's color or position. */
.hint-pulse {
    animation: hint-pulse 2.4s ease-out infinite;
}
@keyframes hint-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(124, 147, 255, 0); }
    50% { box-shadow: 0 0 12px 2px rgba(124, 147, 255, 0.45); }
}
@media (prefers-reduced-motion: reduce) {
    .seat-pulse { display: none; }
}
</style>
