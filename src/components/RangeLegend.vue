<script setup>
import { ref } from 'vue';
import { useRangeMatrix } from '../composables/useRangeMatrix';
import { parseActionLine, nextFreeColor, actionConfig } from '../composables/useActions';
import ActionLineBuilder from './ActionLineBuilder.vue';

const {
    actions,
    getActionColor,
    getActionDisplayName,
    addAction, 
    updateActionColor,
    removeAction,
} = useRangeMatrix();

const isAddingAction = ref(false);
const isBuildingLine = ref(false);
const showHelp = ref(false);
const newActionName = ref('');
const newActionColor = ref(nextFreeColor());
const actionError = ref('');

const handleCreateAction = () => {
    if (!newActionName.value) return;

    try {
        parseActionLine(newActionName.value);
    } catch (err) {
        actionError.value = err.message;
        return;
    }

    const name = newActionName.value.trim().toUpperCase();
    if (actionConfig[name] !== undefined) {
        actionError.value = `Action "${name}" already exists`;
        return;
    }

    addAction(name, newActionColor.value);
    newActionName.value = '';
    newActionColor.value = nextFreeColor();
    actionError.value = '';
    isAddingAction.value = false;
};
</script>

<template>
    <div class="flex flex-col items-center gap-4">
        <div class="flex flex-wrap justify-center gap-4 text-[12px] font-medium">
            <div 
                v-for="action in actions" 
                :key="action" 
                class="group flex items-center gap-2 bg-bg-secondary px-2 py-1 min-h-[44px] rounded border border-border-subtle hover:border-border-active transition-colors sl-hover"
            >
                <div class="relative w-6 h-6 rounded overflow-hidden cursor-pointer group/color">
                    <div 
                        class="w-full h-full"
                        :style="{ backgroundColor: getActionColor(action) }"
                    ></div>
                    <input 
                        type="color" 
                        :value="getActionColor(action)"
                        @input="updateActionColor(action, $event.target.value)"
                        class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                </div>
                <span class="text-text-secondary">{{ getActionDisplayName(action) }}</span>
                <button 
                    v-if="action !== 'fold'"
                    @click="removeAction(action)"
                    class="ml-1 px-3 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-text-secondary hover:text-action-fold opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                >
                    ✕
                </button>
            </div>
            <button 
                @click="isAddingAction = true"
                aria-label="Add action"
                class="flex items-center justify-center w-11 h-11 bg-bg-tertiary text-text-primary rounded-full hover:bg-border-active transition-colors font-bold border border-border-subtle"
            >
                +
            </button>
        </div>

        <div v-if="isAddingAction || isBuildingLine" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div v-if="!isBuildingLine" class="bg-bg-secondary border border-border-subtle p-6 rounded-xl shadow-2xl w-full max-w-xs flex flex-col gap-4">
                <h3 class="text-text-primary font-bold text-center">Add Action</h3>
                
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-2 p-3 bg-bg-tertiary rounded-lg border border-border-subtle">
                        <div class="flex justify-between items-center">
                            <label class="text-[10px] text-text-secondary uppercase font-bold">Quick Action</label>
                            <button 
                                @click="showHelp = true"
                                class="icon-hit w-5 h-5 flex items-center justify-center bg-bg-secondary text-text-secondary rounded-full hover:bg-border-active hover:text-text-primary transition-colors text-[10px] font-bold border border-border-subtle"
                                aria-label="Help: action rules and tokens"
                            >
                                ?
                            </button>
                        </div>
                        <div class="flex gap-2">
                            <input 
                                v-model="newActionName" 
                                @keyup.enter="handleCreateAction"
                                placeholder="e.g. OR 3bb" 
                                class="flex-1 bg-bg-primary text-text-primary text-sm rounded px-3 py-2 min-h-[44px] border border-border-subtle focus:outline-none focus:border-action-primary"
                            />
                            <input 
                                v-model="newActionColor" 
                                type="color" 
                                aria-label="Action color"
                                class="w-11 h-11 bg-transparent border-none cursor-pointer"
                            />
                        </div>
                        <p v-if="actionError" class="text-action-fold text-[10px] font-bold italic">{{ actionError }}</p>
                    </div>

                    <div class="flex flex-col gap-2 p-3 bg-bg-tertiary rounded-lg border border-border-subtle">
                        <label class="text-[10px] text-text-secondary uppercase font-bold">Build Action Line</label>
                        <button 
                            @click="isBuildingLine = true; isAddingAction = false"
                            class="w-full px-3 py-2 min-h-[44px] bg-action-primary text-text-primary text-sm rounded font-bold hover:opacity-90 transition-colors"
                        >
                            Open Builder
                        </button>
                    </div>
                </div>

                <div class="flex gap-2 mt-2">
                    <button 
                        @click="isAddingAction = false"
                        class="flex-1 px-4 py-2 min-h-[44px] bg-bg-tertiary text-text-primary rounded-lg text-sm font-bold hover:bg-border-active transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        @click="handleCreateAction"
                        :disabled="!newActionName"
                        class="flex-1 px-4 py-2 min-h-[44px] bg-action-primary text-text-primary rounded-lg text-sm font-bold hover:opacity-90 transition-colors disabled:opacity-50"
                    >
                        Create
                    </button>
                </div>
            </div>

            <ActionLineBuilder 
                v-else 
                @close="isBuildingLine = false"
                @saved="isBuildingLine = false"
            />
        </div>

        <div v-if="showHelp" class="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
            <div class="bg-bg-secondary border border-border-subtle p-6 rounded-xl shadow-2xl w-full max-w-md flex flex-col gap-4 text-text-primary">
                <div class="flex justify-between items-center border-b border-border-subtle pb-3">
                    <h3 class="text-lg font-bold">Action Rules & Tokens</h3>
                    <button @click="showHelp = false" aria-label="Close help" class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-text-secondary hover:text-text-primary text-xl">✕</button>
                </div>
                
                <div class="flex flex-col gap-4 text-sm">
                    <section>
                        <h4 class="text-action-primary font-bold uppercase text-xs mb-2">Valid Tokens</h4>
                        <div class="flex flex-wrap gap-2">
                            <span v-for="token in ['OR', 'CALL', '3B', '4B', 'FOLD', 'ALL-IN']" 
                                   :key="token" 
                                   class="bg-bg-tertiary px-2 py-1 rounded border border-border-subtle font-mono text-xs">
                                 {{ token }}
                            </span>
                        </div>
                    </section>

                    <section class="flex flex-col gap-2">
                        <h4 class="text-action-primary font-bold uppercase text-xs mb-1">Quick Action Rules</h4>
                        <ul class="list-disc list-inside text-text-secondary space-y-1">
                            <li>Must start with a <span class="text-text-primary font-bold">Valid Token</span>.</li>
                            <li>Can be followed by other <span class="text-text-primary font-bold">Valid Tokens</span> or <span class="text-text-primary font-bold">Sizes</span>.</li>
                            <li>Valid size formats: <span class="text-text-primary font-mono">3bb</span>, <span class="text-text-primary font-mono">2.5x</span> or just a number <span class="text-text-primary font-mono">4</span>.</li>
                            <li>Only the impossible is rejected: nothing after <span class="text-text-primary font-mono">FOLD</span>/<span class="text-text-primary font-mono">ALL-IN</span>, <span class="text-text-primary font-mono">OR</span> opens, <span class="text-text-primary font-mono">3B</span> needs an <span class="text-text-primary font-mono">OR</span>, <span class="text-text-primary font-mono">4B</span> needs an earlier <span class="text-text-primary font-mono">OR</span> (or an opening <span class="text-text-primary font-mono">LIMP</span>).</li>
                            <li>Examples: <span class="text-text-primary font-mono">OR 3bb</span>, <span class="text-text-primary font-mono">OR 3B FOLD</span>.</li>
                        </ul>
                    </section>

                    <section class="flex flex-col gap-2">
                        <h4 class="text-action-primary font-bold uppercase text-xs mb-1">Action Lines</h4>
                        <p class="text-text-secondary">
                            Action Lines allow you to create a <span class="text-text-primary font-bold">sequence of actions</span> (e.g., <span class="text-text-primary font-mono">OR &rarr; 3B &rarr; FOLD</span>) 
                            and assign it a custom name and color.
                        </p>
                    </section>
                </div>

                <button 
                    @click="showHelp = false"
                    class="w-full py-2 min-h-[44px] bg-bg-tertiary text-text-primary rounded-lg font-bold hover:bg-border-active transition-colors mt-2"
                >
                    Got it
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Enlarges the touch target without changing the icon's visible size. */
.icon-hit {
    position: relative;
}
.icon-hit::after {
    content: '';
    position: absolute;
    inset: -12px;
}
</style>
