<template>
  <div class="min-h-screen bg-bg-primary text-text-primary p-4 sm:p-8 flex justify-center items-start font-sans">
    <div class="w-full max-w-2xl lg:max-w-6xl bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl">
      <div class="p-4 sm:p-6 border-b border-border-subtle rounded-t-xl">
        <h1 class="text-lg sm:text-xl font-semibold text-text-primary">Coach <JargonTip text="3-bet = re-raise pré-flop · open = primeira subida · WTSD = % das mãos que chegam ao showdown · W$SD = % ganhas no showdown · Agg = frequência de aposta/raise · gap VPIP–PFR = mãos jogadas menos mãos subidas." /></h1>
        <p class="text-xs sm:text-sm text-text-secondary">Insights sobre decisões — padrões que custam dinheiro, com as mãos onde aconteceram</p>
      </div>

      <div class="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <p v-if="hands.length > 0 && hands.length < 20" class="lg:col-span-2 max-w-[65ch] text-xs text-action-raise font-mono border border-action-raise/40 rounded-md px-3 py-2">
          Amostra pequena ({{ hands.length }} mãos) — cada regra exige 8–20; sem amostra, silêncio.
        </p>

        <section v-for="ins in insights" :key="ins.code" class="space-y-2 lg:col-span-2">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">{{ ins.title }}</h2>
          <p class="text-sm text-text-primary max-w-[65ch]">{{ ins.text }}</p>
          <div class="grid gap-2 lg:grid-cols-2">
            <HandRow v-for="(h, i) in ins.handRefs" :key="i" :hand="h" @open="selectedHand = $event" />
          </div>
        </section>

        <p v-if="insights.length === 0" class="lg:col-span-2 max-w-[65ch] text-xs text-text-secondary italic">
          {{ hands.length === 0 ? 'Sem mãos ainda — jogue um drill (20+ mãos desbloqueiam todos os insights).' : 'Nenhum leak detectado na amostra atual. Continue jogando.' }}
        </p>
      </div>
      <!-- Hand log formato solver (mesmo modal do /profile) -->
      <div v-if="selectedText" @click.self="selectedHand = null" class="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur p-4">
        <div class="bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
          <div class="flex items-center justify-between gap-2 p-4 border-b border-border-subtle">
            <h3 class="text-sm font-bold text-text-primary">Hand #{{ selectedHand?.handNo ?? '?' }}</h3>
            <div class="flex gap-2">
              <button ref="hhCloseBtn" @click="selectedHand = null" class="px-4 min-h-[44px] text-sm text-text-secondary hover:text-text-primary transition-colors">Close</button>
              <button @click="copyMtt" class="px-4 min-h-[44px] text-sm border border-border-active rounded text-text-secondary hover:text-text-primary transition-colors">{{ mttLabel }}</button>
              <button @click="copyHh" class="px-4 min-h-[44px] min-w-[44px] text-sm bg-action-primary text-bg-primary font-bold rounded hover:brightness-110 transition-all">{{ copyLabel }}</button>
            </div>
          </div>
          <pre class="overflow-auto p-4 font-mono text-xs text-text-primary whitespace-pre-wrap">{{ selectedText }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useAnalytics } from '../../composables/useAnalytics';
import { computeMetrics } from '../../engine/profileStats.js';
import { runCoach } from '../../engine/coach.js';
import { formatHandHistory, formatHandMTT } from '../../engine/handHistory.js';
import HandRow from '../HandRow.vue';
import JargonTip from '../JargonTip.vue';

const { hands } = useAnalytics();

onMounted(() => {
  // Instances sync via localStorage on mount (mesmo padrão do /profile).
  try {
    const raw = localStorage.getItem('poker_analytics_hands');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) hands.value = parsed;
    }
  } catch { /* sem mãos salvas → vazio honesto */ }
});

const metrics = computed(() => computeMetrics(hands.value || []));
const insights = computed(() => runCoach(metrics.value, hands.value || []));

// Log solver da mão selecionada (mesmo padrão do /profile).
const selectedHand = ref(null);
const selectedText = computed(() => selectedHand.value ? formatHandHistory(selectedHand.value) : null);
// MTT 9-max p/ análise no GTOW (cash 9-max não tem solução e é rejeitado).
const selectedMTT = computed(() => selectedHand.value ? formatHandMTT(selectedHand.value) : null);
const hhCloseBtn = ref(null);
const copyLabel = ref('Copy');
const mttLabel = ref('Copy MTT');
watch(selectedHand, async (h) => {
  copyLabel.value = 'Copy';
  mttLabel.value = 'Copy MTT';
  if (h) {
    await nextTick();
    hhCloseBtn.value?.focus();
  }
});
async function copyHh() {
  if (!selectedText.value) return;
  try {
    await navigator.clipboard.writeText(selectedText.value);
    copyLabel.value = 'Copied ✓';
  } catch {
    copyLabel.value = 'Copy failed';
  }
}
async function copyMtt() {
  if (!selectedMTT.value) return;
  try {
    await navigator.clipboard.writeText(selectedMTT.value);
    mttLabel.value = 'Copied ✓';
  } catch {
    mttLabel.value = 'Copy failed';
  }
}
</script>
