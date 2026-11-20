<script setup>
import { ref } from 'vue';

const isVisible = ref(false);
const intensity = ref(0); // 0 to 1

const trigger = (type) => {
    isVisible.value = true;
    intensity.value = type === 'POSITIVE' ? 0.2 : 0.4;
    
    setTimeout(() => {
        isVisible.value = false;
        intensity.value = 0;
    }, 400);
};

defineExpose({ trigger });
</script>

<template>
    <Transition name="flash">
        <div v-if="isVisible" 
             class="fixed inset-0 pointer-events-none z-[90] transition-all duration-300"
             :style="{ 
                 backgroundColor: intensity === 0.2 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 63, 94, 0.4)',
                 boxShadow: `inset 0 0 100px ${intensity === 0.2 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`
             }">
        </div>
    </Transition>
</template>

<style scoped>
.flash-enter-active, .flash-leave-active {
    transition: opacity 0.3s ease;
}
.flash-enter-from, .flash-leave-to {
    opacity: 0;
}
</style>
