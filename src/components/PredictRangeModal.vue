<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RANKS } from '../constants/poker';

// Sem dica: o modal nunca recebe o gabarito. Todas as 169 mãos são
// neutras e clicáveis; o score é calculado no submit pelo parent,
// que guarda o snapshot do residual. Props só de exibição.
const props = defineProps({
  seatLabel: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['close', 'submit']);

const selectedHands = ref(new Set());
const modalBox = ref(null);

const ranks = RANKS;

// Pintura por arrasto (mesmo modelo do matrix): mousedown alterna a
// célula e fixa o estado do gesto; mouseenter com botão preso pinta as
// demais com esse estado; mouseup solta. Arrastar a partir de célula
// selecionada desseleciona em faixa.
const isDragging = ref(false);
const dragSelect = ref(true);

function setHand(hand, select) {
  if (select) selectedHands.value.add(hand);
  else selectedHands.value.delete(hand);
}

function handleMouseDown(hand) {
  isDragging.value = true;
  dragSelect.value = !selectedHands.value.has(hand);
  setHand(hand, dragSelect.value);
}

function handleMouseEnter(hand) {
  if (!isDragging.value) return;
  setHand(hand, dragSelect.value);
}

function handleMouseUp() {
  isDragging.value = false;
}

function handleGridTouchStart(event) {
  if (event.cancelable) event.preventDefault();
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  if (!touch) return;
  const probes = [[0, 0], [10, 0], [-10, 0], [0, 10], [0, -10]];
  for (const [dx, dy] of probes) {
    const el = document.elementFromPoint(touch.clientX + dx, touch.clientY + dy);
    const cell = el?.closest?.('[data-hand]');
    if (cell) {
      handleMouseDown(cell.getAttribute('data-hand'));
      return;
    }
  }
}

function handleTouchMove(event) {
  if (!isDragging.value) return;
  const touch = event.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!element) return;
  // closest(): o vão entre células devolve o container — subir até a
  // célula evita que o arrasto morra no gap de 2px.
  const hand = (element.closest?.('[data-hand]') || element).getAttribute('data-hand');
  if (hand) setHand(hand, dragSelect.value);
}

function handleTouchEnd() {
  handleMouseUp();
}

function getHandLabel(rowRank, colRank) {
  if (rowRank === colRank) return rowRank + rowRank;
  const rowIdx = ranks.indexOf(rowRank);
  const colIdx = ranks.indexOf(colRank);
  if (rowIdx < colIdx) {
    return rowRank + colRank + 's';
  } else {
    return colRank + rowRank + 'o';
  }
}

function isSelected(hand) {
  return selectedHands.value.has(hand);
}

const counter = computed(() => {
  return `${selectedHands.value.size}`;
});

const submit = () => {
  if (selectedHands.value.size > 0) {
    emit('submit', { selectedHands: new Set(selectedHands.value) });
  }
};

// Escape para fechar
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    selectedHands.value.clear();
    emit('close');
  }
};

// Foco entra no modal ao abrir: Escape funciona e o relógio do herói
// já está pausado pelo parent (predictOpen desabilita as ações).
// Listeners de fim de gesto no window como no RangeGrid (o mouse pode
// soltar fora de qualquer célula).
onMounted(() => {
  modalBox.value?.focus();
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
  <!-- R0: Teleport p/ body — o modal vivia dentro do .game-stage (scale =
       stacking context), então seu z alto competia só dentro do z-10 do
       feltro e a sidebar (z-40 no nível da página) pintava por cima.
       No body, z-50 = mesma camada do modal HH (profile/coach). -->
  <Teleport to="body">
  <div 
    ref="modalBox"
    class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
    @keydown="handleKeydown"
    tabindex="0"
    role="dialog"
    aria-modal="true"
    aria-label="Predict range"
  >
    <div class="bg-bg-secondary border border-border-subtle rounded-lg w-full max-w-md mx-auto overflow-hidden shadow-2xl">
      <!-- Header -->
      <div class="p-5 border-b border-border-subtle">
        <h3 class="text-lg font-semibold text-text-primary mb-2 text-center">Predict Range{{ seatLabel ? ` — ${seatLabel}` : '' }}</h3>
        <p class="text-sm text-text-secondary text-center">
          Selecione as mãos que você acha que o vilão tem agora ({{ counter }} selecionadas).
        </p>
      </div>

      <!-- Grid 13×13: tudo neutro, sem dica do gabarito -->
      <div class="p-4 bg-bg-primary" @touchstart.prevent="handleGridTouchStart">
        <div class="grid gap-[2px]" style="grid-template-columns: repeat(13, minmax(0, 1fr));">
          <div 
            v-for="(rowRank, rowIndex) in ranks" 
            :key="rowRank" 
            class="contents"
          >
            <div 
              v-for="(colRank, colIndex) in ranks" 
              :key="colRank"
              :data-hand="getHandLabel(rowRank, colRank)"
              :class="[
                'aspect-square flex items-center justify-center text-[10px] font-medium cursor-pointer transition-all duration-100 border rounded-[2px] select-none sl-hover sl-active',
                isSelected(getHandLabel(rowRank, colRank))
                  ? 'bg-action-primary border-action-primary text-bg-primary'
                  : 'bg-bg-secondary border-border-subtle text-text-secondary hover:border-border-active',
              ]"
              style="touch-action: none;"
              @mousedown="handleMouseDown(getHandLabel(rowRank, colRank))"
              @mouseenter="handleMouseEnter(getHandLabel(rowRank, colRank))"
            >
              {{ getHandLabel(rowRank, colRank) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 bg-bg-tertiary/30 border-t border-border-subtle flex justify-end gap-3">
        <button 
          @click="() => { selectedHands.clear(); emit('close'); }"
          class="px-4 py-2 min-h-[44px] text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
        <button 
          @click="submit"
          :disabled="selectedHands.size === 0"
          class="px-6 py-2 min-h-[44px] text-sm font-medium bg-action-primary text-bg-primary rounded-md hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Submit Prediction
        </button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<style scoped>
div[tabindex="0"]:focus {
  outline: none;
}
</style>
