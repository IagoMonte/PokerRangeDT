<script setup>
import { ref, computed, watch } from 'vue';
import { rangeGame, currentSituation, currentPosition } from '../composables/useRangeGame';
import { useRangeMatrix } from '../composables/useRangeMatrix';
import { USER_EDITABLE_POSITIONS } from '../infra/positions';

const { clearCurrentRange } = useRangeMatrix();

const availablePositions = computed(() => {
    if (currentSituation.value === 'RFI') {
        return USER_EDITABLE_POSITIONS.filter(pos => pos !== 'BB');
    }
    return USER_EDITABLE_POSITIONS;
});

watch(currentSituation, () => {
    if (currentPosition.value && !availablePositions.value.includes(currentPosition.value)) {
        currentPosition.value = '';
    }
});
</script>

<template>
    <div class="flex flex-col gap-4 bg-bg-secondary p-4 rounded-xl shadow-lg border border-border-subtle w-full max-w-[720px]">
        <div class="flex flex-col sm:flex-row gap-4">
            <div class="flex flex-col gap-2 flex-1">
                <span id="situation-label" class="text-[10px] font-bold text-text-secondary uppercase">Situation</span>
                <div role="group" aria-labelledby="situation-label" class="grid grid-cols-2 gap-2">
                    <button
                        v-for="s in ['RFI', 'XRFI']"
                        :key="s"
                        @click="currentSituation = s"
                        :aria-pressed="currentSituation === s"
                        :class="['min-h-[44px] rounded-md border font-mono text-sm font-bold transition-colors sl-hover sl-active', currentSituation === s ? 'bg-action-primary text-bg-primary border-action-primary' : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:text-text-primary hover:border-border-active']"
                    >{{ s }}</button>
                </div>
                <p class="text-[11px] text-text-secondary">RFI = first to raise · XRFI = facing a raise.</p>
            </div>

            <div class="flex flex-col gap-2 flex-1">
                <label class="text-[10px] font-bold text-text-secondary uppercase">Position</label>
                <select 
                    v-model="currentPosition" 
                    class="bg-bg-tertiary text-text-primary text-sm rounded px-2 py-1 min-h-[44px] border border-border-subtle focus:outline-none focus:border-action-primary w-full"
                >
                    <option value="" disabled>Select Position</option>
                    <option v-for="pos in availablePositions" :key="pos" :value="pos">{{ pos }}</option>
                </select>
            </div>
        </div>

        <div class="flex justify-end">
            <button 
                @click="clearCurrentRange" 
                :disabled="!currentPosition"
                class="px-3 py-1 min-h-[44px] bg-action-fold text-bg-primary text-[10px] font-bold rounded border border-action-fold hover:brightness-110 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
                RESET RANGE
            </button>
        </div>
    </div>
</template>
