<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    type: {
        type: String,
        required: true,
        validator: (value) => ['POSITIVE', 'NEGATIVE'].includes(value)
    },
    message: {
        type: String,
        default: 'Good Play!'
    },
    duration: {
        type: Number,
        default: 2000
    }
});

const visible = ref(false);
const emit = defineEmits(['completed']);

const colors = computed(() => {
    return props.type === 'POSITIVE' 
        ? 'text-emerald-400 border-emerald-500 bg-emerald-500/10 shadow-emerald-500/20' 
        : 'text-rose-400 border-rose-500 bg-rose-500/10 shadow-rose-500/20';
});

const trigger = () => {
    visible.value = true;
    setTimeout(() => {
        visible.value = false;
        emit('completed');
    }, props.duration);
};

// Expose trigger method to parent
defineExpose({ trigger });
</script>

<template>
    <Transition name="fade">
        <div v-if="visible" 
             class="fixed top-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full border-2 font-bold text-xl transition-all duration-300"
             :class="colors">
            <div class="flex items-center gap-3">
                <span v-if="type === 'POSITIVE'" class="text-2xl">✓</span>
                <span v-if="type === 'NEGATIVE'" class="text-2xl">✗</span>
                {{ message }}
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
    transition: opacity 0.4s ease, transform 0.4s ease;
}
.fade-enter-from, .fade-leave-to {
    opacity: 0;
    transform: translate(-50%, -20px);
}
</style>
