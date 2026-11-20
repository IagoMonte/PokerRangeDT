<script setup>
// Table status card: rounded panel with two rows: BLINDS | HAND, TIMER.
// POT lives in CenterPot only. Pure display — values arrive as props.
import { fmtMoney } from '../composables/useDisplayUnit';
defineProps({
    sb: { type: Number, default: 0 },
    bb: { type: Number, default: 0 },
    handNo: { type: Number, default: 0 },
    handsTotal: { type: Number, default: 0 },
    heroTimeLeft: { type: Number, default: 0 },
});
</script>

<template>
    <div id="table-status" aria-live="polite"
        class="absolute left-1/2 -translate-x-1/2 top-[18%] z-20 bg-bg-secondary/80 border border-border-subtle rounded-lg px-4 py-2 text-center">
        <div class="flex items-center justify-center gap-3">
            <div class="flex flex-col">
                <span class="text-[10px] font-medium text-text-secondary uppercase tracking-wide">Blinds</span>
                <span class="font-mono text-sm text-text-primary">{{ fmtMoney(sb, bb) }}/{{ fmtMoney(bb, bb) }}</span>
            </div>
            <div class="w-px self-stretch bg-border-subtle"></div>
            <div class="flex flex-col">
                <span class="text-[10px] font-medium text-text-secondary uppercase tracking-wide">Hand</span>
                <span class="font-mono text-sm text-text-primary">{{ handNo > 0 ? handNo + '/' + handsTotal : '–/–' }}</span>
            </div>
        </div>
        <div class="mt-1 flex flex-col border-t border-border-subtle pt-1">
            <span class="text-[10px] font-medium text-text-secondary uppercase tracking-wide">Timer</span>
            <span class="font-mono text-sm" :class="heroTimeLeft > 0 ? 'text-action-raise font-bold' : 'text-text-secondary'">
                {{ heroTimeLeft > 0 ? heroTimeLeft.toFixed(0) + 's' : '–' }}
            </span>
        </div>
    </div>
</template>
