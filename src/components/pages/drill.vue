<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useDrillSettings } from '../../composables/useDrillSettings';
import { usePersistence } from '../../composables/usePersistence';
import { notify } from '../../composables/useRangeMatrix';

const { addDrill, Drills, getDrills } = useDrillSettings();
const { saveDrills, loadDrills } = usePersistence();

onMounted(() => {
  try { loadDrills(); } catch { /* sem saves → built-ins */ }
});

const drillName = ref('');
const preflop = ref(true);
const postflop = ref(true);
const predictAlways = ref(false);
const hideAvatar = ref(false);
const actionTime = ref(30);
const hands = ref(20);
const villainDelayMs = ref(600);
const blindLevel = ref('0.1/0.2');
const stackDepth = ref('100bb');

const selectedDrill = ref('');
const existingDrills = computed(() => getDrills());

const openDropdown = ref(null);

const blindOptions = ['0.1/0.2', '0.5/1', '1/2', '2/5', '5/10', '10/20'];
const stackOptions = ['20bb', '50bb', '100bb', '200bb'];

const toggleDropdown = (id) => {
  openDropdown.value = openDropdown.value === id ? null : id;
};

const selectOption = (id, option) => {
  if (id === 'drill') {
      selectedDrill.value = option;
      loadDrillData(option);
  } else if (id === 'blinds') {
      blindLevel.value = option;
  } else if (id === 'stacks') {
      stackDepth.value = option;
  }
  openDropdown.value = null;
};

const loadDrillData = (name) => {
    const drill = Drills[name];
    if (drill) {
        drillName.value = name;
        preflop.value = drill.preflop;
        postflop.value = drill.posflop;
        predictAlways.value = drill.predictAlways ?? false;
        hideAvatar.value = drill.hideAvatar ?? false;
        actionTime.value = drill.ActionTime;
        hands.value = drill.hands ?? 20;
        villainDelayMs.value = drill.villainDelayMs ?? 600;
        blindLevel.value = `${drill.blinds[0]}/${drill.blinds[1]}`;
        stackDepth.value = `${drill.stacks}bb`;
    }
};

const clampInt = (v, min, max, fallback) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const handleCreateDrill = () => {
    if (!drillName.value.trim()) {
        notify('Give the drill a name', 'NEGATIVE');
        return;
    }
    
    const [sb, bb] = blindLevel.value.split('/').map(Number);
    const stacks = parseInt(stackDepth.value);

    addDrill(drillName.value, {
        preflop: preflop.value,
        posflop: postflop.value,
        predictAlways: predictAlways.value,
        hideAvatar: hideAvatar.value,
        ActionTime: clampInt(actionTime.value, 1, 300, 20),
        hands: clampInt(hands.value, 1, 1000, 1),
        villainDelayMs: clampInt(villainDelayMs.value, 0, 5000, 0),
        blinds: [sb, bb],
        stacks: stacks
    });
    saveDrills();
    notify(`Drill "${drillName.value}" saved`, 'POSITIVE');
};
</script>

<template>
  <div class="min-h-screen bg-bg-primary p-4 sm:p-8 flex justify-center items-start font-sans">
    <div class="w-full max-w-2xl bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl">
      <!-- Header -->
      <div class="p-4 sm:p-6 border-b border-border-subtle rounded-t-xl">
        <h1 class="text-lg sm:text-xl font-semibold text-text-primary">Drill Settings</h1>
        <p class="text-xs sm:text-sm text-text-secondary">Configure your practice session parameters</p>
      </div>

      <!-- Form -->
      <div class="p-4 sm:p-6 space-y-8">
        
        <!-- Drill Identification -->
        <section class="space-y-4">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Identification</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-[12px] font-medium text-text-secondary">Existing Drills</label>
              <div class="relative w-full">
                <button 
                  @click="toggleDropdown('drill')"
                  class="w-full bg-bg-tertiary border border-border-active rounded-md px-3 py-2 text-sm text-text-primary flex justify-between items-center min-h-[44px] focus:ring-2 focus:ring-action-primary outline-none transition-studio"
                >
                  {{ selectedDrill || 'Select a drill...' }}
                  <div class="text-text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </button>
                <div v-if="openDropdown === 'drill'" class="absolute z-50 w-full mt-1 bg-bg-secondary border border-border-subtle rounded-md shadow-2xl overflow-hidden">
                  <div 
                    v-for="drill in existingDrills" 
                    :key="drill"
                    @click="selectOption('drill', drill)"
                    class="px-3 py-2 min-h-[44px] flex items-center cursor-pointer transition-colors sl-hover text-sm text-text-primary border-b border-border-subtle last:border-b-0"
                  >
                    {{ drill }}
                  </div>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[12px] font-medium text-text-secondary">Custom Name</label>
              <input 
                v-model="drillName"
                type="text" 
                placeholder="Enter drill name..."
                class="bg-bg-tertiary border border-border-subtle rounded-md px-3 py-2 min-h-[44px] text-sm text-text-primary focus:border-border-active outline-none transition-studio"
              />
            </div>
          </div>
        </section>

        <!-- Game Rules -->
        <section class="space-y-4">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Rules & Timing</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            <div class="flex flex-col gap-2">
              <span class="hidden sm:block text-[12px] font-medium text-transparent select-none" aria-hidden="true">&nbsp;</span>
              <label for="preflop" class="flex items-center gap-3 min-h-[44px] group cursor-pointer">
              <input 
                v-model="preflop" 
                type="checkbox" 
                id="preflop" 
                class="w-5 h-5 rounded border-border-subtle bg-bg-tertiary text-action-primary focus:ring-action-primary"
              />
              <span class="text-sm text-text-primary cursor-pointer group-hover:text-text-primary transition-colors">Preflop</span>
              </label>
            </div>
            <div class="flex flex-col gap-2">
              <span class="hidden sm:block text-[12px] font-medium text-transparent select-none" aria-hidden="true">&nbsp;</span>
              <label for="postflop" class="flex items-center gap-3 min-h-[44px] group cursor-pointer">
              <input 
                v-model="postflop" 
                type="checkbox" 
                id="postflop" 
                class="w-5 h-5 rounded border-border-subtle bg-bg-tertiary text-action-primary focus:ring-action-primary"
              />
              <span class="text-sm text-text-primary cursor-pointer group-hover:text-text-primary transition-colors">Postflop</span>
              </label>
            </div>
            <div class="flex flex-col gap-2">
              <span class="hidden sm:block text-[12px] font-medium text-transparent select-none" aria-hidden="true">&nbsp;</span>
              <label for="predictAlways" class="flex items-center gap-3 min-h-[44px] group cursor-pointer">
              <input 
                v-model="predictAlways" 
                type="checkbox" 
                id="predictAlways" 
                class="w-5 h-5 rounded border-border-subtle bg-bg-tertiary text-action-primary focus:ring-action-primary"
              />
              <span class="text-sm text-text-primary cursor-pointer group-hover:text-text-primary transition-colors">Predict always</span>
              </label>
            </div>
            <div class="flex flex-col gap-2">
              <span class="hidden sm:block text-[12px] font-medium text-transparent select-none" aria-hidden="true">&nbsp;</span>
              <label for="hideAvatar" class="flex items-center gap-3 min-h-[44px] group cursor-pointer">
              <input 
                v-model="hideAvatar" 
                type="checkbox" 
                id="hideAvatar" 
                class="w-5 h-5 rounded border-border-subtle bg-bg-tertiary text-action-primary focus:ring-action-primary"
              />
              <span class="text-sm text-text-primary cursor-pointer group-hover:text-text-primary transition-colors">Hide villain avatars</span>
              </label>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[12px] font-medium text-text-secondary">Action Time (sec)</label>
              <input 
                v-model="actionTime"
                type="number"
                min="1"
                max="300"
                class="bg-bg-tertiary border border-border-subtle rounded-md px-3 py-2 min-h-[44px] text-sm text-text-primary font-mono focus:border-border-active outline-none transition-studio"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[12px] font-medium text-text-secondary">Hands per drill</label>
              <input 
                v-model="hands"
                type="number"
                min="1"
                max="1000"
                class="bg-bg-tertiary border border-border-subtle rounded-md px-3 py-2 min-h-[44px] text-sm text-text-primary font-mono focus:border-border-active outline-none transition-studio"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[12px] font-medium text-text-secondary">Villain delay (ms, 0 = instant)</label>
              <input 
                v-model="villainDelayMs"
                type="number"
                min="0"
                max="5000"
                step="100"
                class="bg-bg-tertiary border border-border-subtle rounded-md px-3 py-2 min-h-[44px] text-sm text-text-primary font-mono focus:border-border-active outline-none transition-studio"
              />
            </div>
          </div>
        </section>

        <!-- Table Configuration -->
        <section class="space-y-4">
          <h2 class="text-xs uppercase tracking-wider text-text-secondary font-bold">Table Config</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-[12px] font-medium text-text-secondary">Blinds</label>
              <div class="relative w-full">
                <button 
                  @click="toggleDropdown('blinds')"
                  class="w-full bg-bg-tertiary border border-border-active rounded-md px-3 py-2 text-sm text-text-primary font-mono flex justify-between items-center min-h-[44px] focus:ring-2 focus:ring-action-primary outline-none transition-studio"
                >
                  {{ blindLevel }}
                  <div class="text-text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </button>
                <div v-if="openDropdown === 'blinds'" class="absolute z-50 w-full mt-1 bg-bg-secondary border border-border-subtle rounded-md shadow-2xl overflow-hidden">
                  <div 
                    v-for="opt in blindOptions" 
                    :key="opt"
                    @click="selectOption('blinds', opt)"
                    class="px-3 py-2 min-h-[44px] flex items-center cursor-pointer transition-colors sl-hover text-sm text-text-primary font-mono border-b border-border-subtle last:border-b-0"
                  >
                    {{ opt }}
                  </div>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[12px] font-medium text-text-secondary">Stacks</label>
              <div class="relative w-full">
                <button 
                  @click="toggleDropdown('stacks')"
                  class="w-full bg-bg-tertiary border border-border-active rounded-md px-3 py-2 text-sm text-text-primary font-mono flex justify-between items-center min-h-[44px] focus:ring-2 focus:ring-action-primary outline-none transition-studio"
                >
                  {{ stackDepth }}
                  <div class="text-text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </button>
                <div v-if="openDropdown === 'stacks'" class="absolute z-50 w-full mt-1 bg-bg-secondary border border-border-subtle rounded-md shadow-2xl overflow-hidden">
                  <div 
                    v-for="opt in stackOptions" 
                    :key="opt"
                    @click="selectOption('stacks', opt)"
                    class="px-3 py-2 min-h-[44px] flex items-center cursor-pointer transition-colors sl-hover text-sm text-text-primary font-mono border-b border-border-subtle last:border-b-0"
                  >
                    {{ opt }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Footer Actions -->
      <div class="p-4 sm:p-6 bg-bg-tertiary/30 border-t border-border-subtle flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-xl">
        <button @click="selectedDrill = ''; drillName = ''" class="w-full sm:w-auto px-4 py-2 min-h-[44px] text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
          Clear / New
        </button>
        <button @click="handleCreateDrill" class="w-full sm:w-auto px-6 py-2 min-h-[44px] text-sm font-medium bg-action-primary text-bg-primary rounded-md hover:brightness-110 transition-studio">
          {{ selectedDrill ? 'Update Drill' : 'Create Drill' }}
        </button>
      </div>
    </div>
  </div>
</template>
