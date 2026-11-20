<template>
    <nav class="sticky top-0 z-50 border-b border-border-subtle bg-bg-secondary text-text-primary relative">
        <div class="mx-auto max-w-7xl px-4">
            <div class="flex h-16 items-center justify-between">
                <!-- Logo -->
                <router-link to="/" class="">
                    <div class="relative flex items-center" style="min-width: 3rem;">
                        <CardComponent :card="'TD'" :variant="'board'" class="relative z-10 -rotate-6" />
                        <CardComponent :card="'DT'" :variant="'board'" class="relative z-11 -ml-4 rotate-6" />
                        <div class="text-2xl ml-1.5 font-bold tracking-tight">PokerRangeDT</div>
                    </div>
                </router-link>

                <!-- Mobile Menu Button & Profile -->
                <div class="flex items-center gap-2 md:hidden">
                    <router-link to="/profile" class="flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-bg-tertiary text-text-secondary hover:border-action-primary hover:text-text-primary transition-colors sl-hover" aria-label="Profile">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </router-link>

                    <button @click="isOpen = !isOpen" class="rounded-md p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-text-secondary sl-hover"
                        :aria-expanded="isOpen" aria-label="Abrir menu">
                        <svg v-if="!isOpen" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 6h16M4 12h16M4 18h16" />
                        </svg>

                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Desktop Menu -->
                <div class="hidden items-center gap-8 md:flex">
                    <router-link to="/" class="inline-flex min-h-[44px] items-center rounded px-2 -mx-2 text-text-secondary hover:text-text-primary transition-colors sl-hover">
                        Play
                    </router-link>

                    <router-link to="/drill" class="inline-flex min-h-[44px] items-center rounded px-2 -mx-2 text-text-secondary hover:text-text-primary transition-colors sl-hover">
                        Drill
                    </router-link>

                    <router-link to="/range" class="inline-flex min-h-[44px] items-center rounded px-2 -mx-2 text-text-secondary hover:text-text-primary transition-colors sl-hover">
                        Ranges
                    </router-link>

                    <router-link to="/villains" class="inline-flex min-h-[44px] items-center rounded px-2 -mx-2 text-text-secondary hover:text-text-primary transition-colors sl-hover">
                        Villains
                    </router-link>

                    <router-link to="/profile" class="inline-flex min-h-[44px] items-center rounded px-2 -mx-2 text-text-secondary hover:text-text-primary transition-colors sl-hover">
                        Profile
                    </router-link>

                    <router-link to="/coach" class="inline-flex min-h-[44px] items-center rounded px-2 -mx-2 text-text-secondary hover:text-text-primary transition-colors sl-hover">
                        Coach
                    </router-link>

                    <router-link to="/profile" class="flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-bg-tertiary text-text-secondary hover:border-action-primary hover:text-text-primary transition-colors sl-hover" aria-label="Profile">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </router-link>
                </div>
            </div>
        </div>

        <!-- Mobile Menu Dropdown -->
        <Transition enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2">
            <div v-if="isOpen" class="absolute right-1 top-full w-48 rounded-lg border border-border-subtle bg-bg-secondary p-2 shadow-xl md:hidden">
                <router-link to="/" @click="isOpen = false" class="flex items-center rounded-lg px-3 py-2 min-h-[44px] text-text-secondary hover:text-text-primary transition-colors sl-hover">
                    Play
                </router-link>

                <router-link to="/drill" @click="isOpen = false" class="flex items-center rounded-lg px-3 py-2 min-h-[44px] text-text-secondary hover:text-text-primary transition-colors sl-hover">
                    Drill
                </router-link>

                <router-link to="/range" @click="isOpen = false" class="flex items-center rounded-lg px-3 py-2 min-h-[44px] text-text-secondary hover:text-text-primary transition-colors sl-hover">
                    Ranges
                </router-link>

                    <router-link to="/villains" @click="isOpen = false" class="flex items-center rounded-lg px-3 py-2 min-h-[44px] text-text-secondary hover:text-text-primary transition-colors sl-hover">
                        Villains
                    </router-link>

                    <router-link to="/profile" @click="isOpen = false" class="flex items-center rounded-lg px-3 py-2 min-h-[44px] text-text-secondary hover:text-text-primary transition-colors sl-hover">
                        Profile
                    </router-link>

                    <router-link to="/coach" @click="isOpen = false" class="flex items-center rounded-lg px-3 py-2 min-h-[44px] text-text-secondary hover:text-text-primary transition-colors sl-hover">
                        Coach
                    </router-link>
            </div>
        </Transition>
    </nav>
</template>

<script setup>
import { ref } from "vue";
import CardComponent from "./CardComponent.vue";
import PlayerHand from "./PlayerHand.vue";

const isOpen = ref(false);
</script>