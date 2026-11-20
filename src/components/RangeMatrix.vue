<script setup>
import { watch, onMounted } from 'vue';
import { rangeGame, Ranges, currentPosition } from '../composables/useRangeGame';
import { usePersistence } from '../composables/usePersistence';
import { useVillains } from '../composables/useVillains';
import RangeContext from './RangeContext.vue';
import RangeGrid from './RangeGrid.vue';
import RangeLegend from './RangeLegend.vue';
import RangeLibrary from './RangeLibrary.vue';

const { } = rangeGame();

onMounted(() => {
    // Restore saved library before any save() can overwrite it with empty state.
    const { loadAll } = usePersistence();
    const { villains } = useVillains();
    loadAll(Ranges, villains);
});

watch([currentPosition], () => {
});
</script>

<template>
    <div class="flex flex-col items-center p-8 select-none gap-8 bg-bg-primary min-h-screen">
        <RangeContext />
        <RangeGrid />
        <RangeLegend />
        <RangeLibrary />
    </div>
</template>

<style scoped>
.toast-enter-active {
    transition: opacity 200ms ease-out, transform 200ms ease-out;
}
.toast-leave-active {
    transition: opacity 200ms ease-in, transform 200ms ease-in;
}
.toast-enter-from, .toast-leave-to {
    opacity: 0;
    transform: translateX(16px);
}
</style>
