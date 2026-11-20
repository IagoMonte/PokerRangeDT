<script setup>
import { ref, onMounted } from 'vue';
import { useDrillSettings } from '../composables/useDrillSettings';
import { usePersistence } from '../composables/usePersistence';

const emit = defineEmits(['start']);

const { getDrills, setActiveDrill, Drills } = useDrillSettings();
const { loadDrills } = usePersistence();
const drills = ref([]);
const selectedDrill = ref('');
const hands = ref(20);
const villainDelayMs = ref(600);

onMounted(() => {
  // Drills custom sobrevivem em localStorage — carrega antes de listar
  // (sem isso, recarregar a página "apagava" os criados).
  try { loadDrills(); } catch { /* sem saves → built-ins */ }
  drills.value = getDrills();
});

const onSelectDrill = () => {
    const d = Drills[selectedDrill.value];
    if (!d) return;
    hands.value = d.hands ?? 20;
    villainDelayMs.value = d.villainDelayMs ?? 600;
};

const start = () => {
    if (!selectedDrill.value) return;
    setActiveDrill(selectedDrill.value);
    // Popup overrides are run-local only: never written back to Drills
    // (and therefore never to localStorage). /drill owns the saved values.
    emit('start', {
        hands: Math.max(1, Math.floor(Number(hands.value) || 1)),
        villainDelayMs: Math.max(0, Math.floor(Number(villainDelayMs.value) || 0)),
    });
};
</script>

<template>
  <div class="absolute inset-0 z-30 flex items-end justify-center sm:items-center sm:p-4">
    <div class="bg-bg-secondary p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-8 rounded-t-xl sm:rounded-xl rounded-b-none sm:rounded-b-xl shadow-lg border border-border-subtle w-full sm:max-w-sm">
      <h2 class="text-2xl font-semibold text-text-primary mb-6">Start Drill</h2>
      
      <div class="mb-6">
        <label class="block text-text-secondary text-sm mb-2" for="drill-select">Select Drill</label>
        <select 
          v-model="selectedDrill"
          @change="onSelectDrill"
          id="drill-select" 
          class="w-full bg-bg-tertiary text-text-primary border border-border-subtle rounded px-4 py-3 focus:border-action-primary"
        >
          <option value="" disabled>Select a drill</option>
          <option v-for="drill in drills" :key="drill" :value="drill">{{ drill }}</option>
        </select>
      </div>
      
      <div class="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label class="block text-text-secondary text-sm mb-2" for="drill-hands">Hands</label>
          <input
            v-model.number="hands"
            id="drill-hands"
            type="number"
            min="1"
            class="w-full bg-bg-tertiary text-text-primary border border-border-subtle rounded px-4 py-3 focus:border-action-primary"
          />
        </div>
        <div>
          <label class="block text-text-secondary text-sm mb-2" for="drill-delay">Villain delay (ms)</label>
          <input
            v-model.number="villainDelayMs"
            id="drill-delay"
            type="number"
            min="0"
            step="100"
            class="w-full bg-bg-tertiary text-text-primary border border-border-subtle rounded px-4 py-3 focus:border-action-primary"
          />
        </div>
      </div>
      
      <button
        @click="start"
        autofocus
        class="w-full bg-action-primary text-bg-primary font-bold py-3 rounded hover:brightness-110 transition-all"
      >
        Start
      </button>
    </div>
  </div>
</template>

