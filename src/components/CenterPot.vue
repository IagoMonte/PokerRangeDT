<script setup>
// Center-table decision block: big POT plus the pending CALL in amber,
// shown only while the hero actually has something to call. Pure display.
// POT counts up (useAnimatedNumber) unless `instant` (instant villains).
import { watch } from 'vue';
import { fmtMoney } from '../composables/useDisplayUnit';
import { useAnimatedNumber } from '../composables/useAnimatedNumber';

const props = defineProps({
    pot: { type: Number, default: 0 },
    toCall: { type: Number, default: 0 },
    bb: { type: Number, default: 0 },
    instant: { type: Boolean, default: false },
});

const { displayed, set } = useAnimatedNumber();
watch(() => props.pot, (n) => set(n, props.instant), { immediate: true });
watch(() => props.instant, () => set(props.pot, props.instant));
</script>

<template>
    <div id="center-pot" aria-live="polite" class="absolute left-1/2 -translate-x-1/2 top-[43%] z-10 text-center pointer-events-none whitespace-nowrap">
        <div class="text-[10px] font-medium text-text-secondary uppercase tracking-wide">Pot</div>
        <div class="font-mono text-[28px] font-medium leading-none text-text-primary">{{ fmtMoney(displayed, bb) }}</div>
        <!-- Ao lado do pote (embaixo caía atrás do board pós-flop). Pote 0 = mão
             liquidada: o currentBet velho do engine não é mais valor a pagar. -->
        <div v-if="toCall > 0 && pot > 0" class="absolute top-0 left-full ml-4 text-left">
            <div class="text-[10px] font-medium text-action-raise uppercase tracking-wide">Call</div>
            <div class="font-mono text-[28px] font-medium leading-none text-action-raise">{{ fmtMoney(toCall, bb) }}</div>
        </div>
    </div>
</template>
