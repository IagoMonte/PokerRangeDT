<template>
  <div class="min-h-screen bg-bg-primary text-text-primary p-4 sm:p-8 flex justify-center items-start font-sans">
    <div class="w-full max-w-2xl lg:max-w-[1440px] bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl">
      <div class="p-4 sm:p-6 border-b border-border-subtle rounded-t-xl">
        <h1 class="text-lg sm:text-xl font-semibold text-text-primary">Profile</h1>
        <p class="text-xs sm:text-sm text-text-secondary">Your numbers — what you played, not what you painted</p>
      </div>

      <div class="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <!-- Identity -->
        <section class="space-y-4">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Hero Name</h2>
          <input
            type="text"
            :value="heroName"
            maxlength="12"
            @input="e => setHeroName(e.target.value)"
            class="w-full bg-bg-tertiary border border-border-subtle rounded-md px-3 py-2 min-h-[44px] text-sm text-text-primary focus:border-border-active outline-none"
          />
          <p class="text-xs text-text-secondary">Replaces “VOCÊ” at the table from the next drill on.</p>
        </section>

        <!-- Config -->
        <section class="space-y-4">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Config</h2>
          <div class="flex flex-wrap gap-3">
            <button @click="exportConfig" class="px-4 min-h-[44px] text-sm bg-action-primary text-bg-primary font-bold rounded hover:brightness-110 transition-all">Export config</button>
            <button @click="configInput?.click()" class="px-4 min-h-[44px] text-sm border border-border-active rounded text-text-secondary hover:text-text-primary transition-colors">Import config</button>
            <input ref="configInput" type="file" accept="application/json,.json" class="hidden" @change="importConfig" />
          </div>
          <p class="text-xs text-text-secondary" aria-live="polite">{{ configMsg || 'Ranges, villains, colors, drills and action lines in one JSON.' }}</p>
        </section>

        <!-- Filters -->
        <section class="space-y-4">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Filters</h2>
          <div class="flex flex-wrap gap-2 items-center">
            <input
              type="date"
              :value="day"
              @input="e => day = e.target.value"
              class="bg-bg-tertiary border border-border-subtle rounded-md px-3 py-2 min-h-[44px] text-sm text-text-primary font-mono"
              aria-label="Filter by day"
            />
            <button
              v-if="day"
              @click="day = ''"
              class="px-3 py-2 min-h-[44px] text-xs text-text-secondary hover:text-text-primary border border-border-subtle rounded-md"
            >Clear day</button>
            <select
              :value="drill"
              @change="e => drill = e.target.value"
              class="bg-bg-tertiary border border-border-subtle rounded-md px-3 py-2 min-h-[44px] text-sm text-text-primary"
              aria-label="Filter by drill"
            >
              <option value="all">All drills</option>
              <option v-for="d in drills" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div v-if="roles.length > 0">
            <details class="bg-bg-tertiary border border-border-subtle rounded-md px-3">
              <summary class="min-h-[44px] flex items-center cursor-pointer text-xs text-text-secondary hover:text-text-primary font-mono">Role detail ({{ roles.length }})</summary>
              <div class="flex flex-wrap gap-2 pb-3">
              <button
                v-for="r in roles"
                :key="r"
                @click="toggleRole(r)"
                :class="['px-2.5 py-1.5 rounded-md border font-mono text-xs transition-colors min-h-[44px] sl-hover sl-active', pickedRoles.includes(r) ? 'bg-action-primary text-bg-primary font-bold border-action-primary' : 'border-border-subtle text-text-secondary hover:text-text-primary']"
                :aria-pressed="pickedRoles.includes(r)"
              >{{ r }}</button>
              </div>
            </details>
          </div>
          <p v-else class="text-xs text-text-secondary italic">No roles recorded yet — play a drill.</p>
        </section>

        <p v-if="isSampleSmall" class="lg:col-span-2 text-xs text-action-raise font-mono border border-action-raise/40 rounded-md px-3 py-2">
          Small sample ({{ metrics.hands }} hands) — treat every % as noise below ~200 hands.
        </p>

        <!-- KPIs -->
        <section class="space-y-4 lg:col-span-2">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Overview</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div v-for="k in kpis" :key="k.label" class="bg-bg-tertiary border border-border-subtle rounded-md px-3 py-2">
              <div class="text-[10px] uppercase font-bold text-text-secondary">{{ k.label }}</div>
              <div class="font-mono text-lg text-text-primary font-bold">{{ k.value }}</div>
            </div>
          </div>
        </section>

        <!-- Preflop -->
        <section class="space-y-2">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Preflop</h2>
          <p class="text-[11px] text-text-secondary">RFI = first-in raise · 3B = re-raise vs open · 4B = re-raise vs 3-bet.</p>
          <div class="bg-bg-tertiary border border-border-subtle rounded-md divide-y divide-border-subtle/60">
            <div v-for="r in preflopRows" :key="r.label" class="flex justify-between px-3 py-1.5">
              <span class="text-xs text-text-secondary">{{ r.label }}</span>
              <span class="font-mono text-xs text-text-primary font-bold">{{ r.value }}</span>
            </div>
          </div>
        </section>

        <!-- Postflop -->
        <section class="space-y-2">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Postflop</h2>
          <div class="bg-bg-tertiary border border-border-subtle rounded-md divide-y divide-border-subtle/60">
            <div v-for="r in postflopRows" :key="r.label" class="flex justify-between px-3 py-1.5">
              <span class="text-xs text-text-secondary">{{ r.label }}</span>
              <span class="font-mono text-xs text-text-primary font-bold">{{ r.value }}</span>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div v-for="s in ['flop', 'turn', 'river']" :key="s" class="bg-bg-tertiary border border-border-subtle rounded-md px-3 py-2">
              <div class="text-[10px] uppercase font-bold text-text-secondary mb-1">{{ s }} ({{ metrics.postflop.byStreet[s].n }})</div>
              <div class="font-mono text-xs text-text-primary">+EV {{ pct1(metrics.postflop.byStreet[s].plusEv) }}</div>
              <div class="font-mono text-xs text-text-secondary">Δ {{ fmtChips(metrics.postflop.byStreet[s].deltaAvg) }}</div>
            </div>
          </div>
        </section>

        <!-- EV & Equity -->
        <section class="space-y-2">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">EV &amp; Equity</h2>
          <div class="bg-bg-tertiary border border-border-subtle rounded-md divide-y divide-border-subtle/60">
            <div v-for="r in evRows" :key="r.label" class="flex justify-between px-3 py-1.5">
              <span class="text-xs text-text-secondary">{{ r.label }}</span>
              <span class="font-mono text-xs text-text-primary font-bold">{{ r.value }}</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <span v-for="b in ['BUCKET_A', 'BUCKET_B', 'BUCKET_C', 'BUCKET_D']" :key="b" class="font-mono text-xs px-2.5 py-1.5 rounded-md border border-border-subtle text-text-secondary">
              {{ b.replace('BUCKET_', '') }}: {{ pct1(pct(metrics.postflop.buckets[b], metrics.postflop.n)) }}
            </span>
          </div>
          <p class="text-[11px] text-text-secondary">A = monsters · B = strong + big draws · C = medium · D = air.</p>
        </section>

        <!-- Predict -->
        <section class="space-y-2">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Predict Range</h2>
          <div class="bg-bg-tertiary border border-border-subtle rounded-md divide-y divide-border-subtle/60">
            <div class="flex justify-between px-3 py-1.5">
              <span class="text-xs text-text-secondary">Guesses</span>
              <span class="font-mono text-xs text-text-primary font-bold">{{ predicts.n }}</span>
            </div>
            <div class="flex justify-between px-3 py-1.5">
              <span class="text-xs text-text-secondary">Avg score</span>
              <span class="font-mono text-xs text-text-primary font-bold">{{ predictAvg }}</span>
            </div>
          </div>
        </section>

        <!-- Streak and records summarize practice consistency. -->
        <section class="space-y-2">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Streak &amp; Records</h2>
          <div class="bg-bg-tertiary border border-border-subtle rounded-md divide-y divide-border-subtle/60">
            <div v-for="r in streakRows" :key="r.label" class="flex justify-between px-3 py-1.5">
              <span class="text-xs text-text-secondary">{{ r.label }}</span>
              <span class="font-mono text-xs text-text-primary font-bold">{{ r.value }}</span>
            </div>
          </div>
        </section>

        <!-- Results -->
        <section class="space-y-2 lg:col-span-2">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Results</h2>
          <div class="bg-bg-tertiary border border-border-subtle rounded-md divide-y divide-border-subtle/60">
            <div v-for="r in resultRows" :key="r.label" class="flex justify-between px-3 py-1.5">
              <span class="text-xs text-text-secondary">{{ r.label }}</span>
              <span class="font-mono text-xs text-text-primary font-bold">{{ r.value }}</span>
            </div>
          </div>
        </section>

        <!-- History (registros reais; vazio honesto, sem mock) -->
        <section class="space-y-2 lg:col-span-2">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Hand History</h2>
          <div class="grid gap-2 lg:grid-cols-2">
            <HandRow v-for="(h, i) in historyRows" :key="i" :hand="h" @open="selectedHand = $event" />
            <p v-if="historyRows.length === 0" class="text-xs text-text-secondary italic">No hands yet — play a drill to unlock history.</p>
          </div>
        </section>
      </div>
      <!-- Hand log formato solver -->
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
import { useHeroProfile } from '../../composables/useHeroProfile';
import { ActiveDrill } from '../../composables/useDrillSettings';
import { computeMetrics, filterHands } from '../../engine/profileStats.js';
import { computeStreak, personalBests } from '../../engine/engagement.js';
import { formatHandHistory, formatHandMTT } from '../../engine/handHistory.js';
import { fmtMoney } from '../../composables/useDisplayUnit';
import { usePersistence } from '../../composables/usePersistence';
import { useVillains } from '../../composables/useVillains';
import { Ranges } from '../../composables/useRangeGame';
import HandRow from '../HandRow.vue';

const { stats, hands } = useAnalytics();
const { heroName, setHeroName } = useHeroProfile();

const { loadAll, loadDrills, exportConfigJSON, importConfigJSON } = usePersistence();
const { villains } = useVillains();
const configInput = ref(null);
const configMsg = ref('');

function exportConfig() {
  try {
    loadAll(Ranges, villains); // profile não carrega ranges/villains/drills sozinho
    loadDrills();
    exportConfigJSON(Ranges, villains);
    configMsg.value = 'Config exported.';
  } catch (e) {
    configMsg.value = `Export failed: ${e.message}`;
  }
}

async function importConfig(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    loadDrills(); // preserva drills salvos: o payload faz merge sobre eles
    importConfigJSON(Ranges, villains, await file.text());
    configMsg.value = 'Config imported.';
  } catch (err) {
    configMsg.value = `Import failed: ${err.message}`;
  }
}

const day = ref('');
const drill = ref('all');
const pickedRoles = ref([]);

onMounted(() => {
  // Instances sync via localStorage on mount (same pattern as predicts).
  try {
    const raw = localStorage.getItem('poker_analytics_hands');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) hands.value = parsed;
    }
  } catch { /* sem mãos salvas → histórico vazio honesto */ }
});

const bb = computed(() => ActiveDrill.settings?.blinds?.[1] ?? 20);
const drills = computed(() => [...new Set((hands.value || []).map(h => h.drill).filter(Boolean))]);
const roles = computed(() => [...new Set((hands.value || []).map(h => h.role).filter(Boolean))]);

function toggleRole(r) {
  pickedRoles.value = pickedRoles.value.includes(r)
    ? pickedRoles.value.filter(x => x !== r)
    : [...pickedRoles.value, r];
}

const filtered = computed(() => filterHands(hands.value || [], { day: day.value, roles: pickedRoles.value, drill: drill.value }));
const metrics = computed(() => computeMetrics(filtered.value));
const isSampleSmall = computed(() => metrics.value.hands > 0 && metrics.value.hands < 20);

const pct1 = (v) => `${Number(v || 0).toFixed(1)}%`;
const pct = (n, d) => (d > 0 ? (n / d) * 100 : 0);
const fmtChips = (v) => fmtMoney(Number(v) || 0, bb.value);
const predicts = computed(() => stats.value.predicts || { n: 0, sumPrecision: 0 });
const predictAvg = computed(() => predicts.value.n > 0 ? `${(predicts.value.sumPrecision / predicts.value.n).toFixed(1)}%` : '—');

// Streaks and records are derived from hand and prediction history.
const streak = computed(() => computeStreak(hands.value || []));
const bests = computed(() => personalBests(hands.value || [], stats.value?.predicts?.history || []));
const streakRows = computed(() => [
  { label: 'Day streak', value: streak.value.streak > 0 ? `${streak.value.streak}d${streak.value.today ? '' : ' (ontem)'}` : '—' },
  { label: 'Hands', value: `${bests.value.total}${bests.value.nextMilestone ? ` → ${bests.value.nextMilestone}` : ' ★'}` },
  { label: 'Best predict', value: bests.value.bestPredict === null ? '—' : `${bests.value.bestPredict}` },
  { label: 'Best day PnL', value: bests.value.bestDay ? `${fmtChips(bests.value.bestDay.pnl)} (${bests.value.bestDay.day})` : '—' },
]);

const kpis = computed(() => [
  { label: 'Hands', value: String(metrics.value.hands) },
  { label: 'VPIP', value: pct1(metrics.value.preflop.vpip) },
  { label: 'PFR', value: pct1(metrics.value.preflop.pfr) },
  { label: '+EV', value: pct1(metrics.value.postflop.plusEv) },
  { label: 'PnL', value: fmtChips(metrics.value.results.pnl) },
  { label: 'Predict', value: predictAvg.value },
]);

const preflopRows = computed(() => {
  const p = metrics.value.preflop;
  return [
    { label: 'RFI (first-in)', value: `${pct1(p.rfi)} (${p.rfiOpp} opp)` },
    { label: '3B vs open', value: `${pct1(p.threeB)} (${p.vsOpen} opp)` },
    { label: '4B vs 3b', value: `${pct1(p.fourB)} (${p.vs3b} opp)` },
    { label: 'Fold vs open / 3b / 4b', value: `${pct1(p.foldVsOpen)} / ${pct1(p.foldVs3b)} / ${pct1(p.foldVs4b)}` },
    { label: 'Limp', value: pct1(p.limp) },
    { label: 'Call vs open', value: pct1(p.callVsOpen) },
    { label: 'All-in freq', value: pct1(p.allin) },
    { label: 'Line adherence', value: pct1(p.adherence) },
  ];
});

const postflopRows = computed(() => {
  const p = metrics.value.postflop;
  return [
    { label: 'Check / Call / Fold / Raise', value: `${pct1(p.check)} / ${pct1(p.call)} / ${pct1(p.fold)} / ${pct1(p.raise)} (${p.n})` },
    { label: 'Agg freq', value: pct1(p.aggFreq) },
    { label: 'Fold to bet', value: `${pct1(p.foldToBet)} (${p.facedBet} faced)` },
    { label: '+EV decisions', value: pct1(p.plusEv) },
    { label: '+EV contested (facing bet)', value: `${pct1(p.contestedPlusEv)} (${p.contestedN})` },
  ];
});

const evRows = computed(() => {
  const p = metrics.value.postflop;
  return [
    { label: 'EV chosen (avg)', value: fmtChips(p.evChosenAvg) },
    { label: 'EV best (avg)', value: fmtChips(p.evBestAvg) },
    { label: 'Leak Δ (avg)', value: fmtChips(p.deltaAvg) },
    { label: 'Equity (avg)', value: pct1(p.equityAvg * 100) },
    { label: 'Outs (avg)', value: p.outsAvg.toFixed(1) },
  ];
});

const resultRows = computed(() => {
  const r = metrics.value.results;
  return [
    { label: 'PnL total', value: fmtChips(r.pnl) },
    { label: 'WTSD (went to showdown)', value: `${pct1(r.wtsd)} (${r.showdowns}/${r.wtsdN})` },
    { label: 'W$SD (won at showdown)', value: pct1(r.wsd) },
    { label: 'Showdown / non-showdown', value: `${fmtChips(r.sdPnl)} / ${fmtChips(r.nonSdPnl)}` },
    { label: 'Biggest won / lost', value: `${fmtChips(r.maxWon)} / ${fmtChips(r.maxLost)}` },
  ];
});

const historySource = computed(() => filtered.value.slice(-20).reverse());
const historyRows = computed(() => historySource.value);

// Log solver da mão selecionada (só abre com sequência de ações;
// registro antigo retorna null e a linha nem é clicável).
const selectedHand = ref(null);
const selectedText = computed(() => selectedHand.value ? formatHandHistory(selectedHand.value) : null);
// MTT 9-max p/ análise no GTOW (cash 9-max não tem solução e é rejeitado).
const selectedMTT = computed(() => selectedHand.value ? formatHandMTT(selectedHand.value) : null);
const hhCloseBtn = ref(null);
const copyLabel = ref('Copy');
const mttLabel = ref('Copy MTT');
// Foco no Close ao abrir (mesmo padrão do Play again).
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
