<script setup>
import { ref } from 'vue';
import { useRangeMatrix } from '../composables/useRangeMatrix';
import { BASIC_TOKENS, assertLegalTokens, parseSize, nextFreeColor } from '../composables/useActions';

const { addActionLine } = useRangeMatrix();

const emit = defineEmits(['close', 'saved']);

const lineName = ref('');
const lineColor = ref(nextFreeColor());
const sequence = ref([]);
const lineError = ref('');

const addToken = (token) => {
    sequence.value.push({ token, size: '' });
    lineError.value = '';
};

const removeToken = (index) => {
    sequence.value.splice(index, 1);
};

const handleSave = () => {
    if (!lineName.value || sequence.value.length === 0) return;

    try {
        for (const step of sequence.value) {
            if (step.size !== undefined && step.size !== null && String(step.size).trim() !== '') {
                parseSize(String(step.size));
            }
        }
        assertLegalTokens(sequence.value.map(s => s.token));
    } catch (err) {
        lineError.value = err.message;
        return;
    }

    const newLine = {
        id: `line_${Date.now()}`,
        name: lineName.value,
        color: lineColor.value,
        sequence: [...sequence.value],
    };

    // Nome duplicado e shape: addActionLine valida — erro aqui vira
    // mensagem, nunca throw na cara do usuário (fail loud visível).
    try {
        addActionLine(newLine);
    } catch (err) {
        lineError.value = err.message;
        return;
    }
    emit('saved');
    emit('close');
};
</script>

<template>
    <div class="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-2xl w-full max-w-lg flex flex-col gap-6 text-white">
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-bold">Build Action Line</h3>
            <button @click="$emit('close')" aria-label="Close builder" class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-400 hover:text-white">✕</button>
        </div>

        <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
                <label class="text-xs text-gray-400 uppercase font-bold">Line Name</label>
                <input 
                    v-model="lineName" 
                    placeholder="e.g. Aggro UTG" 
                    class="bg-gray-800 text-white text-sm rounded px-3 py-2 min-h-[44px] border border-gray-600 focus:outline-none focus:border-blue-500"
                />
            </div>
            <div class="flex flex-col gap-2">
                <label class="text-xs text-gray-400 uppercase font-bold">Color</label>
                <div class="flex gap-2 items-center">
                    <input 
                        v-model="lineColor" 
                        type="color" 
                        aria-label="Line color"
                        class="w-11 h-11 bg-transparent border-none cursor-pointer"
                    />
                    <span class="text-xs text-gray-400 font-mono">{{ lineColor }}</span>
                </div>
            </div>
        </div>

        <div class="flex flex-col gap-3">
            <label class="text-xs text-gray-400 uppercase font-bold">Tokens (Sequence)</label>
            <div class="flex flex-wrap gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700 min-h-[60px]">
                <div 
                    v-for="(item, index) in sequence" 
                    :key="index" 
                    class="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded border border-gray-600"
                >
                    <span class="font-bold text-blue-400 text-xs">{{ item.token }}</span>
                    <input 
                        v-if="['OR', 'CALL', '3B', '4B'].includes(item.token)"
                        v-model="item.size"
                        placeholder="bb"
                        aria-label="Size in big blinds"
                        class="w-12 min-h-[44px] bg-gray-900 text-white text-xs rounded px-1 py-0.5 border border-gray-600 focus:outline-none focus:border-blue-500"
                    />
                    <button @click="removeToken(index)" aria-label="Remove token" class="ml-1 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-gray-400 hover:text-red-400 text-xs">✕</button>
                </div>
                <div v-if="sequence.length === 0" class="text-gray-500 text-xs italic">No tokens added yet...</div>
            </div>
            <p v-if="lineError" class="text-red-400 text-xs font-bold italic">{{ lineError }}</p>
        </div>

            <div class="flex flex-wrap gap-2">
            <button 
                v-for="token in BASIC_TOKENS" 
                :key="token"
                @click="addToken(token)"
                class="px-3 py-1 min-h-[44px] min-w-[44px] bg-gray-700 text-xs font-bold rounded hover:bg-gray-600 transition-colors border border-gray-600"
            >
                + {{ token }}
            </button>
            </div>
            <p class="text-[11px] text-gray-400">OR = open raise · 3B = re-raise · 4B = re-re-raise · CALL = match the bet.</p>

        <div class="flex gap-3 mt-4">
            <button 
                @click="$emit('close')"
                class="flex-1 px-4 py-2 min-h-[44px] bg-gray-700 text-white rounded-lg text-sm font-bold hover:bg-gray-600 transition-colors"
            >
                Cancel
            </button>
            <button 
                @click="handleSave"
                :disabled="!lineName || sequence.length === 0"
                class="flex-1 px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Save Line
            </button>
        </div>
    </div>
</template>
