<script setup>
import { useAnalytics } from '../composables/useAnalytics';
import { ref } from 'vue';

const { stats, sessionHistory, calculateMetrics } = useAnalytics();
const showDashboard = ref(true);
const metrics = calculateMetrics();
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
    <div class="bg-[#141922] border border-[#252B3B] w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-[#252B3B] flex justify-between items-center bg-[#1C2230]">
        <h2 class="text-[#E6EDF3] text-xl font-bold tracking-tight">Advanced Analytics <span class="text-[#7C93FF] text-sm font-mono ml-2">SESSION_REPORT</span></h2>
        <button @click="$emit('close')" class="text-[#8B949E] hover:text-white transition-colors text-2xl">&times;</button>
      </div>

      <div class="p-6 flex flex-col gap-8">
        <!-- Current Session Metrics -->
        <div>
          <h3 class="text-[#8B949E] text-xs font-semibold uppercase tracking-widest mb-4">Current Session Performance</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div v-for="(val, key) in metrics" :key="key" class="bg-[#0A0E14] border border-[#252B3B] p-4 rounded-lg">
              <div class="text-[#8B949E] text-[10px] uppercase font-bold mb-1">{{ key }}</div>
              <div class="text-[#E6EDF3] text-2xl font-mono font-bold">{{ val }}<span class="text-xs ml-1 text-[#7C93FF]">{{ key === 'aggro' ? '' : '%' }}</span></div>
            </div>
          </div>
        </div>

        <!-- Raw Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 class="text-[#8B949E] text-xs font-semibold uppercase tracking-widest mb-4">Aggregated Counts</h3>
            <div class="space-y-2">
              <div v-for="(val, key) in stats" :key="key" class="flex justify-between py-1 border-b border-[#252B3B]/50">
                <span class="text-[#8B949E] text-sm font-mono">{{ key }}</span>
                <span class="text-[#E6EDF3] text-sm font-mono font-bold">{{ val }}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-[#8B949E] text-xs font-semibold uppercase tracking-widest mb-4">Session History</h3>
            <div class="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              <div v-for="(session, idx) in sessionHistory" :key="idx" class="bg-[#0A0E14] border border-[#252B3B] p-3 rounded-lg text-xs font-mono">
                <div class="flex justify-between mb-2">
                  <span class="text-[#7C93FF] font-bold">SESSION_{{ sessionHistory.length - idx }}</span>
                  <span class="text-[#8B949E]">{{ new Date(session.date).toLocaleDateString() }}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 text-[#E6EDF3]">
                  <div>VPIP: {{ session.vpip }}%</div>
                  <div>PFR: {{ session.pfr }}%</div>
                  <div>Aggro: {{ session.aggro }}</div>
                </div>
              </div>
              <div v-if="sessionHistory.length === 0" class="text-[#8B949E] text-center py-8 italic">
                No previous sessions recorded.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-[#1C2230] border-t border-[#252B3B] flex justify-end">
        <button @click="$emit('close')" class="px-4 py-2 bg-[#252B3B] text-[#E6EDF3] rounded-md text-sm font-bold hover:bg-[#31394D] transition">
          Close Dashboard
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #0A0E14;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #252B3B;
  border-radius: 10px;
}
</style>
