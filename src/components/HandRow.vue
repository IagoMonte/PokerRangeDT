<script setup>
import { computed } from 'vue';
import { fmtMoney } from '../composables/useDisplayUnit';
import { ActiveDrill } from '../composables/useDrillSettings';

// Linha do histórico de mãos (profile + sidebar usam o mesmo renderer).
// Só abre o log solver quando o registro tem sequência de ações (`lines`);
// registro antigo cai na linha-resumo sem quebrar.
const props = defineProps({
  hand: { type: Object, required: true },
  openable: { type: Boolean, default: true },
});
const emit = defineEmits(['open']);

const bb = computed(() => ActiveDrill.settings?.blinds?.[1] ?? 20);
const canOpen = computed(() => {
  if (!props.openable) return false;
  const l = props.hand?.lines || {};
  return ['preflop', 'flop', 'turn', 'river'].some((s) => Array.isArray(l[s]) && l[s].length > 0);
});

const pre = computed(() => {
  const p = props.hand?.preflop;
  return p ? `${p.token} vs ${p.facing}` : 'no hero action';
});
const post = computed(() => (props.hand?.postflop || [])
  .map((a) => `${(a.street || '?').slice(0, 1).toUpperCase()}:${a.op}`).join(' '));
const delta = computed(() => props.hand?.result?.heroDelta ?? 0);
const deltaText = computed(() => fmtMoney(delta.value, bb.value));
const detail = computed(() => {
  const h = props.hand || {};
  return `${h.drill || '—'} · ${h.date ? h.date.slice(0, 10) : '—'}${post.value ? ` · ${post.value}` : ''}${h.result?.showdown ? (h.result?.won ? ' · WON SD' : ' · LOST SD') : ''}`;
});
</script>

<template>
  <component
    :is="canOpen ? 'button' : 'div'"
    :type="canOpen ? 'button' : undefined"
    :aria-label="canOpen ? `Open hand history ${hand?.role || ''} ${pre}` : undefined"
    @click="canOpen && emit('open', hand)"
    class="w-full text-left bg-bg-tertiary border border-border-subtle rounded-md px-3 py-2 font-mono text-xs min-h-[44px] transition-colors sl-hover"
    :class="canOpen ? 'cursor-pointer hover:border-action-primary' : ''"
  >
    <div class="flex justify-between text-text-primary font-bold">
      <span>{{ hand?.role || '—' }} · {{ pre }}</span>
      <span :class="delta >= 0 ? 'text-action-call' : 'text-action-fold'">{{ deltaText }}</span>
    </div>
    <div class="text-text-secondary mt-0.5">{{ detail }}</div>
  </component>
</template>
