<script setup>
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue';
import { fromButtons, callIsLimp, presetToChips, RAISE_PRESETS } from '../composables/useActions';
import { displayUnit } from '../composables/useDisplayUnit';
import { pctToChips } from '../engine/preflop';
import { toCall, minRaiseTo } from '../engine/table';

// Buttons never touch the table: they map to a { token, sizeChips } decision
// and hand it to the drill loop (via onDecision). The preflop engine is the
// single place that applies decisions.
const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  table: {
    type: Object,
    default: null
  },
  heroSeat: {
    type: Number,
    default: 0
  },
  facing: {
    type: String,
    default: 'none'
  },
  heroRole: {
    type: String,
    default: ''
  },
  onDecision: {
    type: Function,
    default: null
  }
});

// Pair each action's color with an icon and text label.
const actions = [
  { id: 'fold', label: 'Fold', color: 'border-l-action-fold', key: 'f', icon: 'M18 6 6 18 M6 6l12 12' },
  { id: 'check', label: 'Check', color: 'border-l-text-secondary', key: 'k', icon: 'M20 6 9 17l-5-5' },
  { id: 'call', label: 'Call', color: 'border-l-action-call', key: 'c', icon: 'M5 9h14 M5 15h14' },
  { id: 'raise', label: 'Raise', color: 'border-l-action-raise', key: 'r', icon: 'M12 19V5 M5 12l7-7 7 7' },
];

const isRaiseSliderOpen = ref(false);
const raiseAmount = ref(0); // chips (absolute raise-to, off the live table)

// Slider bounds: min-raise … stack. Display in bb (ALL-IN at the top).
const sliderMin = computed(() => props.table ? minRaiseTo(props.table) : 0);
const sliderMax = computed(() => {
  if (!props.table) return 100;
  const s = props.table.seats[props.heroSeat];
  return s.committed + s.stack;
});
// Passo escalado pelo big blind (20 → 1 ficha; 0.2 → 0.01): passo fixo de 1 era 5bb em stakes pequenos.
const sliderStep = computed(() => (props.table?.bb > 0 ? props.table.bb / 20 : 1));
// O topo do slider nem sempre cai na grade do passo: a última posição é o all-in.
const atSliderTop = (v) => Number(v) > sliderMax.value - sliderStep.value;
const raiseIsAllIn = computed(() => !!props.table && atSliderTop(raiseAmount.value));
const raiseLabel = computed(() => {
  if (raiseIsAllIn.value) return 'ALL-IN';
  if (displayUnit.value !== 'bb') return String(+raiseAmount.value.toFixed(2));
  if (!props.table || !props.table.bb) return String(+raiseAmount.value.toFixed(2));
  return `${+((raiseAmount.value) / props.table.bb).toFixed(1)}bb`;
});

const heroToCall = computed(() => {
  if (!props.table) return null;
  try {
    return toCall(props.table, props.heroSeat);
  } catch {
    return null;
  }
});

// CHECK só existe com nada a pagar (o engine dá throw em CHECK com aposta);
// CALL só existe com algo a pagar (senão seria um check disfarçado).
const checkDisabled = computed(() => heroToCall.value !== null && heroToCall.value > 0);
const callDisabled = computed(() => heroToCall.value === 0);

const handleAction = (actionId, value = null, unit = 'pct') => {
  if (actionId === 'check' && checkDisabled.value) return;
  if (actionId === 'call' && callDisabled.value) return;
  // Open-limp: call for exactly the BB with nothing ahead (never the blinds).
  if (actionId === 'call' && props.table && callIsLimp({
    facing: props.facing,
    toCallChips: toCall(props.table, props.heroSeat),
    bbChips: props.table.bb,
    heroRole: props.heroRole,
  })) {
    if (props.onDecision) props.onDecision({ token: 'LIMP', size: null });
    return;
  }
  // Slider pinned at the top is a shove, not a raise-to.
  if (actionId === 'raise-confirm' && unit === 'chips' && props.table && atSliderTop(value)) {
    if (props.onDecision) props.onDecision({ token: 'ALL-IN', size: null });
    closeSlider(false);
    return;
  }
  const mapped = fromButtons(actionId, { value, facing: props.facing, unit });
  // CHECK is the postflop dry pass (and the preflop BB option): the engines
  // apply it — the button delivers the token instead of swallowing the click.
  if (mapped.token === null) {
    if (props.onDecision) props.onDecision({ token: 'CHECK', size: null });
    return;
  }
  let size = null;
  if (mapped.size) {
    if (!props.table) {
      throw new Error(`actionButtons: cannot size "${mapped.token}" without the live table`);
    }
    size = mapped.size.unit === 'chips'
      ? Math.min(Math.max(mapped.size.value, sliderMin.value), sliderMax.value)
      : pctToChips(props.table, props.heroSeat, mapped.size.value);
  }
  if (props.onDecision) props.onDecision({ token: mapped.token, size });
  // Confirm ends the hero turn: the slider must not survive the decision.
  // No focus steal (backToRaise=false) — the buttons disable right after.
  if (actionId === 'raise-confirm') closeSlider(false);
};

const onRaiseClick = () => {
  isRaiseSliderOpen.value = !isRaiseSliderOpen.value;
  // Sane default on open: standard 2.5x (clamped to [min-raise, stack]).
  if (isRaiseSliderOpen.value && props.table) {
    raiseAmount.value = presetToChips(props.table, props.heroSeat, RAISE_PRESETS[0]);
  }
};

const selectPreset = (preset) => {
  if (!props.table) return;
  raiseAmount.value = presetToChips(props.table, props.heroSeat, preset);
};

// Keyboard: hero turn moves focus to the first action so the turn is
// announced and operable without a mouse. Slider opens focused on the
// input, Escape closes it and returns focus to Raise.
const actionBtns = ref([]);
const raiseBtn = ref(null);
const sliderInput = ref(null);
const sliderBox = ref(null);

watch(() => props.disabled, async (off) => {
  // A vez acabou (decisão ou relógio): o painel de raise não pode sobreviver à mão seguinte.
  if (off) closeSlider(false);
  if (!off) {
    await nextTick();
    actionBtns.value[0]?.focus({ preventScroll: true });
  }
});

watch(isRaiseSliderOpen, async (open) => {
  await nextTick();
  if (open) sliderInput.value?.focus({ preventScroll: true });
});

const closeSlider = (backToRaise = true) => {
  isRaiseSliderOpen.value = false;
  if (backToRaise) raiseBtn.value?.focus({ preventScroll: true });
};

const onSliderKeydown = (e) => {
  if (e.key === 'Escape') closeSlider();
};

// Atalhos de teclado: só na vez do hero, fora de inputs, com slider
// fechado. Slider aberto mantém só o Escape nativo (acima).
const onGlobalKeydown = (e) => {
  if (props.disabled || isRaiseSliderOpen.value) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  const k = (e.key || '').toLowerCase();
  const hit = actions.find(a => a.key === k);
  if (!hit || e.metaKey || e.ctrlKey || e.altKey) return;
  e.preventDefault();
  if (hit.id === 'raise') onRaiseClick();
  else handleAction(hit.id);
};

onMounted(() => window.addEventListener('keydown', onGlobalKeydown));
onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown));
</script>

<template>
  <div class="relative flex flex-col items-center gap-6 w-full">
    <!-- Raise Slider -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div v-if="isRaiseSliderOpen" ref="sliderBox" @keydown="onSliderKeydown" class="absolute bottom-full mb-6 flex flex-col items-center gap-4 p-6 bg-bg-secondary border border-border-active rounded-lg shadow-2xl max-w-[400px] z-50">
        <div class="flex items-center gap-4 w-full">
          <span class="font-mono text-[18px] text-text-primary w-24 text-right">
            {{ raiseLabel }}
          </span>
          <input
            ref="sliderInput"
            type="range"
            v-model.number="raiseAmount"
            :min="sliderMin"
            :max="sliderMax"
            :step="sliderStep"
            aria-label="Raise size"
            :aria-valuetext="raiseLabel"
            :disabled="disabled"
            class="w-full h-2 bg-border-subtle rounded-lg appearance-none cursor-pointer accent-action-primary"
          />
        </div>

        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="preset in RAISE_PRESETS"
            :key="preset.label"
            @click="selectPreset(preset)"
            :disabled="disabled"
            class="px-3 py-1 min-h-[44px] min-w-[44px] text-xs font-mono bg-bg-tertiary border border-border-active text-text-secondary hover:text-text-primary hover:border-action-primary rounded transition-colors"
          >
            {{ preset.label }}
          </button>
        </div>

        <div class="flex gap-3 mt-2">
          <button
            @click="closeSlider()"
            class="px-4 py-2 min-h-[44px] text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleAction('raise-confirm', raiseAmount, 'chips')"
            :disabled="disabled"
            class="px-6 py-2 min-h-[44px] text-sm bg-action-primary text-bg-primary font-bold rounded hover:brightness-110 transition-all"
          >
            Confirm Raise
          </button>
        </div>
      </div>
    </Transition>

    <!-- Action Buttons: original proportions/gaps; the dock (parent bar)
         owns the full-width finish. -->
    <div :class="['flex gap-3 h-16 items-center w-full max-w-full px-3', disabled ? 'opacity-40' : '']">
      <button
        v-for="(action, i) in actions"
        :key="action.id"
        :ref="(el) => { actionBtns[i] = el; if (action.id === 'raise') raiseBtn = el; }"
        @click="action.id === 'raise' ? onRaiseClick() : handleAction(action.id)"
        :disabled="disabled || (action.id === 'check' && checkDisabled) || (action.id === 'call' && callDisabled)"
        :aria-keyshortcuts="action.key"
        :title="`${action.label} (${action.key.toUpperCase()})`"
        :class="[
          'relative flex-1 min-w-0 min-h-[48px] px-2 transition-all duration-150 active:scale-98',
          'bg-bg-tertiary border border-border-active hover:bg-border-subtle',
          'border-l-[3px]',
          action.color,
          'text-text-primary text-sm font-medium rounded-sm cursor-pointer disabled:cursor-default overflow-hidden'
        ]"
      >
        <span class="inline-flex items-center justify-center gap-1 whitespace-nowrap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="action.icon" />
          </svg>
          {{ action.label }}
          <kbd class="kbd-hint absolute top-1 right-1 font-mono text-[9px] leading-none text-text-secondary/70 border border-border-active rounded px-0.5 py-px" aria-hidden="true">{{ action.key.toUpperCase() }}</kbd>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Atalho de teclado: fora do fluxo (canto) p/ nunca cortar ícone+label —
   a proporção é invariante à escala do palco, inline sempre cortava.
   Só com teclado/mouse real (touch não tem atalho p/ exibir). */
.kbd-hint {
  display: none;
}
@media (hover: hover) and (pointer: fine) {
  .kbd-hint {
    display: inline-block;
  }
}
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 28px;
  height: 28px;
  background: #7C93FF;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(124, 147, 255, 0.5);
  border: 2px solid white;
}

input[type='range']::-moz-range-thumb {
  width: 28px;
  height: 28px;
  background: #7C93FF;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(124, 147, 255, 0.5);
  border: 2px solid white;
}
</style>
