<script setup>
import { onMounted, onUnmounted } from 'vue';
import { rangeGame, Ranges } from '../composables/useRangeGame';
import { useRangeMatrix } from '../composables/useRangeMatrix';

const { 
    currentPosition 
} = rangeGame();

const {
    ranks,
    getHandLabel,
    getCellColor,
    getContrastColor,
    handleMouseDown,
    handleGridTouchStart,
    handleMouseEnter,
    handleMouseLeave,
    handleTouchMove,
    handleMouseUp,
    handleTouchEnd,
    isHandInSelection
} = useRangeMatrix();

onMounted(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
});

onUnmounted(() => {
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('touchmove', handleTouchMove);
});
</script>

<template>
    <div class="w-full max-w-[420px] lg:max-w-[560px] grid grid-cols-13 gap-[2px] lg:gap-1 bg-bg-secondary p-2 rounded-lg shadow-xl border border-border-subtle" style="touch-action: none;" @touchstart.prevent="handleGridTouchStart">
        <div 
            v-for="(rowRank, rowIndex) in ranks" 
            :key="rowRank" 
            class="contents"
        >
            <div 
                v-for="(colRank, colIndex) in ranks" 
                :key="colRank"
                :data-hand="getHandLabel(rowRank, colRank)"
                :data-row="rowIndex"
                :data-col="colIndex"
                @mousedown="handleMouseDown(rowIndex, colIndex, getHandLabel(rowRank, colRank))"
                @mouseenter="handleMouseEnter(rowIndex, colIndex, getHandLabel(rowRank, colRank))"
                @mouseleave="handleMouseLeave"
                :class="[
                    'w-full aspect-square flex items-center justify-center text-[10px] lg:text-xs font-medium cursor-pointer transition-all duration-100 border border-transparent rounded-[4px] sl-hover sl-active',
                    !currentPosition ? 'opacity-30 cursor-not-allowed' : '',
                    getContrastColor(getCellColor(getHandLabel(rowRank, colRank))),
                    isHandInSelection(rowIndex, colIndex, getHandLabel(rowRank, colRank)) ? 'ring-1 ring-action-primary ring-inset z-10' : ''
                ]"
                :style="{ backgroundColor: getCellColor(getHandLabel(rowRank, colRank)) }"
            >
                {{ getHandLabel(rowRank, colRank) }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.grid-cols-13 {
    grid-template-columns: repeat(13, minmax(0, 1fr));
}
</style>
