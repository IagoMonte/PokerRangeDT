<script setup>
import { useDrillSettings } from '../composables/useDrillSettings';

const { 
    stakes, 
    stackDepth, 
    drillType, 
    STAKES_OPTIONS, 
    DEPTH_OPTIONS, 
    DRILL_TYPE_OPTIONS 
} = useDrillSettings();
</script>

<template>
    <div class="flex flex-wrap items-center gap-6 p-4 bg-slate-900/50 border border-slate-700 rounded-xl backdrop-blur-sm text-white font-mono">
        <!-- Stakes -->
        <div class="flex flex-col gap-1.5">
            <label class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Stakes</label>
            <select 
                v-model="stakes" 
                class="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:border-slate-500"
            >
                <option v-for="opt in STAKES_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
            </select>
        </div>

        <!-- Stack Depth -->
        <div class="flex flex-col gap-1.5">
            <label class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Depth</label>
            <select 
                v-model="stackDepth" 
                class="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:border-slate-500"
            >
                <option v-for="opt in DEPTH_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
            </select>
        </div>

        <!-- Drill Type -->
        <div class="flex flex-col gap-1.5">
            <label class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Drill Type</label>
            <select 
                v-model="drillType" 
                class="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:border-slate-500"
            >
                <option v-for="opt in DRILL_TYPE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
            </select>
        </div>
    </div>
</template>
