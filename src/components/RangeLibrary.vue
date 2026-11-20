<script setup>
import { ref } from 'vue';
import { useRangeMatrix } from '../composables/useRangeMatrix';

const { exportToJSON, importFromJSON, notify } = useRangeMatrix();
const fileInput = ref(null);

const handleImport = (event) => {
    const target = event.target;
    if (!target.files || target.files.length === 0) return;

    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        try {
            importFromJSON(content);
            notify('Library imported successfully!', 'POSITIVE');
        } catch (err) {
            notify('Error importing library: ' + err);
        }
    };
    reader.readAsText(file);
};

const triggerFileInput = () => {
    if (fileInput.value) fileInput.value.click();
};
</script>

<template>
    <div class="flex gap-4">
        <button 
            @click="exportToJSON"
            class="px-4 py-2 min-h-[44px] bg-bg-tertiary text-text-primary rounded-lg text-sm font-medium border border-border-subtle hover:bg-border-active transition-colors shadow-sm"
        >
            Export Library
        </button>
        <button 
            @click="triggerFileInput"
            class="px-4 py-2 min-h-[44px] bg-bg-tertiary text-text-primary rounded-lg text-sm font-medium border border-border-subtle hover:bg-border-active transition-colors shadow-sm"
        >
            Import Library
        </button>
        <input 
            ref="fileInput"
            type="file" 
            accept=".json" 
            class="hidden" 
            @change="handleImport"
        />
    </div>
</template>
