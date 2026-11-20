<script setup>
import { ref, useId, watch, nextTick } from 'vue';

// Supports pointer and keyboard interaction without relying on a title tooltip.
const props = defineProps({
  text: { type: String, required: true },
  label: { type: String, default: 'Jargão' },
});

const open = ref(false);
const tipId = useId();
const tip = ref(null);
const shift = ref(0);

// O balão é centrado no "?"; perto da borda da tela ele sai do viewport.
// Mede depois de abrir e empurra o balão de volta para dentro (margem 8px).
watch(open, async (isOpen) => {
  shift.value = 0;
  if (!isOpen) return;
  await nextTick();
  const el = tip.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  if (r.left < 8) shift.value = 8 - r.left;
  else if (r.right > vw - 8) shift.value = vw - 8 - r.right;
});
let closeTimer = null;

const canHover = () => typeof window !== 'undefined'
  && window.matchMedia?.('(hover: hover)').matches;

// Em aparelho híbrido (touch + mouse) o media query diz "hover", mas o tap
// dispara mouseenter/focus antes do click; o tipo do ponteiro desfaz a ambiguidade.
let touching = false;
function onPointerDown(e) {
  touching = e.pointerType === 'touch' || e.pointerType === 'pen';
}

function hoverOpen() {
  if (touching || !canHover()) return;
  cancelClose();
  open.value = true;
}
function toggle() {
  open.value = !open.value;
}
function scheduleClose() {
  closeTimer = setTimeout(() => { open.value = false; }, 220);
}
function cancelClose() {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
}
function onKeydown(e) {
  if (e.key === 'Escape') { open.value = false; e.currentTarget?.blur?.(); }
}
</script>

<template>
  <span class="relative inline-flex align-middle">
    <button
      type="button"
      class="jargon-btn"
      :aria-label="label"
      :aria-expanded="open"
      :aria-describedby="tipId"
      @pointerdown="onPointerDown"
      @pointerenter="onPointerDown"
      @click="toggle"
      @mouseenter="hoverOpen"
      @mouseleave="scheduleClose"
      @focus="hoverOpen"
      @blur="open = false"
      @keydown="onKeydown"
    >?</button>
    <span
      v-if="open"
      ref="tip"
      :id="tipId"
      :style="shift ? { marginLeft: shift + 'px' } : null"
      role="tooltip"
      class="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-lg border border-border-active bg-bg-tertiary px-3 py-2 text-xs font-normal normal-case tracking-normal text-text-primary shadow-2xl"
    >{{ text }}</span>
  </span>
</template>

<style scoped>
.jargon-btn {
  position: relative;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-active);
  border-radius: 9999px;
  background: transparent;
  cursor: pointer;
}
/* Área de toque 44px invisível (20px visual + 12px por lado). */
.jargon-btn::after {
  content: '';
  position: absolute;
  inset: -12px;
}
.jargon-btn:hover,
.jargon-btn:focus-visible {
  color: var(--color-text-primary);
  border-color: var(--color-action-primary);
}
</style>
