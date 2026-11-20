<script setup>
import { useRangeMatrix } from '../composables/useRangeMatrix';

const { notice } = useRangeMatrix();
</script>

<template>
    <Transition name="toast">
        <div v-if="notice" role="status"
             class="fixed top-20 right-6 z-[100] flex items-center gap-3 bg-bg-tertiary border border-border-subtle rounded-lg px-4 py-3 shadow-xl max-w-xs"
             :class="notice.type === 'POSITIVE' ? 'border-l-[3px] border-l-action-call' : 'border-l-[3px] border-l-action-fold'">
            <span class="text-base leading-none"
                  :class="notice.type === 'POSITIVE' ? 'text-action-call' : 'text-action-fold'">{{ notice.type === 'POSITIVE' ? '✓' : '✗' }}</span>
            <span class="text-sm font-medium text-text-primary">{{ notice.message }}</span>
        </div>
    </Transition>
</template>

<style scoped>
.toast-enter-active {
    transition: opacity 200ms ease-out, transform 200ms ease-out;
}
.toast-leave-active {
    transition: opacity 200ms ease-in, transform 200ms ease-in;
}
.toast-enter-from,
.toast-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}
</style>
