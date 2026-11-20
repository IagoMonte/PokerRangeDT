<script setup>
import { computed } from 'vue';
import HandRow from './HandRow.vue';

// Painel lateral só-leitura das últimas mãos (lista simples; o detalhe
// solver vive no modal da /profile). Nunca mexe na vez do herói.
const props = defineProps({
  open: { type: Boolean, default: false },
  hands: { type: Array, default: () => [] },
  docked: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const recent = computed(() => [...(props.hands || [])].slice(-10).reverse());
</script>

<template>
  <!-- Overlay (<1280): Teleport p/ body — dentro do palco escalado o drawer
       nunca alcançaria a borda da tela (fica o gutter do scale-to-fit).
       Colado à esquerda da viewport; nav (z-50) continua por cima. -->
  <Teleport to="body">
  <div v-if="open && !docked" @click.self="emit('close')" class="fixed inset-0 z-40 min-[1280px]:hidden">
    <aside aria-label="Hand history" class="absolute left-0 top-16 bottom-0 w-[300px] max-w-[85vw] bg-bg-secondary border-r border-border-subtle shadow-2xl flex flex-col">
      <div class="flex items-center justify-between gap-2 p-4 border-b border-border-subtle">
        <h3 class="text-sm font-bold text-text-primary">Hands</h3>
        <button @click="emit('close')" class="px-4 min-h-[44px] min-w-[44px] text-sm text-text-secondary hover:text-text-primary transition-colors">Close</button>
      </div>
      <div class="overflow-auto p-3 space-y-2">
        <HandRow v-for="(h, i) in recent" :key="`${h.date || ''}-${i}`" :hand="h" :openable="false" />
        <p v-if="recent.length === 0" class="text-xs text-text-secondary italic">No hands yet.</p>
      </div>
    </aside>
  </div>
  </Teleport>
  <aside v-if="open && docked" aria-label="Hand history" class="hidden min-[1280px]:flex absolute left-0 top-0 bottom-0 z-10 w-[300px] flex-none bg-bg-secondary border-r border-border-subtle flex-col">
    <div class="flex items-center justify-between gap-2 p-4 border-b border-border-subtle">
      <h3 class="text-sm font-bold text-text-primary">Hands</h3>
      <button @click="emit('close')" class="px-4 min-h-[44px] min-w-[44px] text-sm text-text-secondary hover:text-text-primary transition-colors sl-hover">Close</button>
    </div>
    <div class="overflow-auto p-3 space-y-2">
      <HandRow v-for="(h, i) in recent" :key="`d-${h.date || ''}-${i}`" :hand="h" :openable="false" />
      <p v-if="recent.length === 0" class="text-xs text-text-secondary italic">No hands yet.</p>
    </div>
  </aside>
</template>
