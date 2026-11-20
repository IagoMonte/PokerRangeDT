<script setup>
import { computed } from 'vue';
import { fmtMoney } from '../composables/useDisplayUnit';

const props = defineProps({
    role: {
        type: String,
        required: true
    },
    position: {
        type: Object,
        required: true
    },
    sb: {
        type: Number,
        default: 0
    },
    bb: {
        type: Number,
        default: 0
    },
    hasBet: {
        type: Boolean,
        default: false
    }
});

const visibleRoles = ['BUTTON', 'SMALL_BLIND', 'BIG_BLIND', 'BTN', 'SB', 'BB'];

const badgeText = computed(() => {    const map = {
        'BUTTON': 'B',
        'SMALL_BLIND': fmtMoney(props.sb, props.bb),
        'BIG_BLIND': fmtMoney(props.bb, props.bb),
        'BTN': 'B',
        'SB': fmtMoney(props.sb, props.bb),
        'BB': fmtMoney(props.bb, props.bb)
    };
    return map[props.role] ?? '';
});
</script>

<template>
    <!-- Blind-amount badges hide once the seat has a live bet chip (which
         carries the live value); the dealer button always stays. -->
    <div v-if="visibleRoles.includes(role) && !(hasBet && role !== 'BUTTON' && role !== 'BTN')"
          :style="{ left: position.x + '%', top: position.y + '%', transform: 'translate(-50%, -50%)' }"
          class="absolute w-full flex justify-center">

        <div class="w-6 h-6 bg-bg-tertiary flex justify-center items-center text-[10px] font-mono font-medium text-text-primary rounded-[50%] border border-border-active">
            {{ badgeText }}
        </div>
    </div>
</template>
