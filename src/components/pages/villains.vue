<template>
  <div class="min-h-screen bg-bg-primary text-text-primary p-4 sm:p-8 flex justify-center items-start font-sans">
    <div class="w-full max-w-2xl bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl">
      <!-- Header -->
      <div class="p-4 sm:p-6 border-b border-border-subtle rounded-t-xl">
        <h1 class="text-lg sm:text-xl font-semibold text-text-primary">Villain Settings</h1>
        <p class="text-xs sm:text-sm text-text-secondary">Configure villain profiles and stats</p>
      </div>

      <div class="p-4 sm:p-6 space-y-8">
        <!-- Villain Selection -->
        <section class="space-y-4">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Villain Profile</h2>
          <div class="relative w-full">
            <button 
              @click="isOpen = !isOpen"
              class="w-full bg-bg-tertiary border border-border-active rounded-md px-3 py-2 min-h-[44px] text-sm text-text-primary flex justify-between items-center focus:ring-2 focus:ring-action-primary outline-none transition-studio"
            >
              {{ villains[selectedVillainIndex]?.stats.NAME }}
              <div class="text-text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </button>
            
            <div v-if="isOpen" class="absolute z-50 w-full mt-1 bg-bg-secondary border border-border-subtle rounded-md shadow-2xl overflow-hidden">
              <div 
                v-for="(villain, index) in villains" 
                :key="index"
                @click="selectVillain(index)"
                class="px-3 py-2 min-h-[44px] flex items-center cursor-pointer transition-colors sl-hover text-sm text-text-primary border-b border-border-subtle last:border-b-0"
              >
                {{ getVillains(index) }}
              </div>
            </div>
          </div>
        </section>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Presets Section -->
          <section class="space-y-4">
            <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Presets</h2>
            <div class="flex flex-col gap-2">
              <button
                v-for="(desc, name) in presetDescriptions"
                :key="name"
                @click="applyPreset(selectedVillainIndex, name)"
                class="w-full text-left px-3 py-2 min-h-[44px] rounded-md bg-bg-tertiary border border-border-subtle hover:border-border-active text-text-primary transition-studio sl-hover sl-active">
                <span class="text-sm font-medium">{{ name }}</span>
                <span class="block text-xs text-text-secondary">{{ desc }}</span>
              </button>
            </div>
          </section>

          <!-- Sliders Section -->
          <section class="space-y-4">
            <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Adjust Stats</h2>
            <p class="text-[11px] text-text-secondary">RFI = open frequency · 3BET/4BET = re-raise frequency · BLUFF = bluff weight · CALL = call band.</p>
            
            <div v-for="stat in ['RFI', '3BET', '4BET', 'BLUFF', 'CALL']" :key="stat" class="flex flex-col gap-2">
              <div class="flex justify-between items-center">
                <span class="text-xs font-medium text-text-secondary">{{ stat }}</span>
                <span class="font-mono text-action-primary text-xs">{{ (villains[selectedVillainIndex]?.stats[stat] * 100).toFixed(0) }}%</span>
              </div>
              <input
  type="range"
  min="0"
  max="100"
  :value="Math.round((villains[selectedVillainIndex]?.stats[stat] || 0) * 100)"
  @input="e => updateStat(stat, e.target.value / 100)"
  class="w-full h-1.5 bg-border-subtle rounded-lg appearance-none cursor-pointer accent-action-primary"
/>
            </div>
          </section>
        </div>

        <!-- Editable Name -->
        <section class="space-y-4">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Villain Name</h2>
          <input 
  type="text" 
  :value="villains[selectedVillainIndex]?.stats.NAME" 
  @input="e => villains[selectedVillainIndex].stats.NAME = e.target.value"
  class="w-full bg-bg-tertiary border border-border-subtle rounded-md px-3 py-2 min-h-[44px] text-sm text-text-primary focus:border-border-active outline-none transition-studio" 
/>
        </section>
      </div>

      <!-- Footer Actions -->
      <div class="p-4 sm:p-6 bg-bg-tertiary/30 border-t border-border-subtle flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-xl">
        <button @click="cancelEdits" class="w-full sm:w-auto px-4 py-2 min-h-[44px] text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
          Cancel
        </button>
        <button 
  @click="saveVillains"
  class="w-full sm:w-auto px-6 py-2 min-h-[44px] text-sm font-medium bg-action-primary text-bg-primary rounded-md hover:brightness-110 transition-studio"
>
  Save Profile
</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useVillains } from '../../composables/useVillains';
import { usePersistence } from '../../composables/usePersistence';

const { villains, getVillains, applyPreset } = useVillains();
const { saveAll, loadAll } = usePersistence();
const selectedVillainIndex = ref(0);
const isOpen = ref(false);

const presetDescriptions = {
  Tight: 'Low RFI, Low Aggression',
  Balanced: 'Standard GTO Approach',
  Loose: 'High RFI, High Aggression',
  Station: 'Calls everything, rarely raises',
  Maniac: 'Maximum pressure, wide ranges',
};

onMounted(() => {
  loadAll(null, villains);
});

// Descarta as edições não salvas: volta aos perfis gravados.
const cancelEdits = () => {
  loadAll(null, villains);
};

const selectVillain = (index) => {
  selectedVillainIndex.value = index;
  isOpen.value = false;
};

const updateStat = (stat, value) => {
  const index = selectedVillainIndex.value;
  if (villains.value[index]) {
    villains.value[index].stats[stat] = Number(value.toFixed(2));
  }
};

const saveVillains = () => {
  saveAll(null, villains);
};
</script>

<style scoped>
input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--color-action-primary);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 0 4px rgba(124, 147, 255, 0.2);
}

input[type='range']::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--color-action-primary);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 0 4px rgba(124, 147, 255, 0.2);
}
</style>
