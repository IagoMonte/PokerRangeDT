<script setup>
import PlayerSeat from './PlayerSeat.vue';
import PokerTableSurface from './PokerTableSurface.vue';
import PlayerHand from './PlayerHand.vue';
import BoardDisplay from './BoardDisplay.vue';
import TableStatus from './TableStatus.vue';
import CenterPot from './CenterPot.vue';
import FlyingToken from './FlyingToken.vue';
import { createVfxMirror, VFX } from '../vfx.js';
import PredictRangeModal from './PredictRangeModal.vue';
import FeedbackToast from './overlays/FeedbackToast.vue';
import ScreenFlash from './overlays/ScreenFlash.vue';
import { getHandLabel } from '../infra/handRankings';
import { usePokerTable } from '../composables/usePokerTable.js';
import { ActiveDrill } from '../composables/useDrillSettings';
import { ref, computed, watch } from 'vue';

const { players, countdown } = usePokerTable();
const props = defineProps({
    pot: { type: Number, default: 0 },
    handNo: { type: Number, default: 0 },
    handsTotal: { type: Number, default: 0 },
    heroTimeLeft: { type: Number, default: 0 },
    heroTurn: { type: Boolean, default: false },
    toCall: { type: Number, default: 0 },
    instant: { type: Boolean, default: false },
    committed: { type: Array, default: () => [] },
    stacks: { type: Array, default: () => [] },
    vfx: { type: Object, default: () => createVfxMirror() },
    board: { type: Array, default: () => [] },
    shown: { type: Number, default: 0 },
    revealed: { type: Array, default: () => [] },
    winners: { type: Array, default: () => [] },
    residualRanges: { type: Map, default: () => new Map() },
    onPredictSubmit: { type: Function, default: () => {} },
    onPredictOpen: { type: Function, default: () => {} },
    // Predict obrigatório (drill predictAlways): play.vue fixa o seat e
    // aguarda onForcedDone(true = submit com score, false = skip/falha).
    // Falha sempre aberta — o loop nunca trava sem o modal.
    forcedSeat: { type: Number, default: -1 },
    onForcedDone: { type: Function, default: null },
});
const showPredictModal = ref(false);
const showPredictHint = ref(false);
try {
  showPredictHint.value = sessionStorage.getItem('poker_predict_hint_seen') !== '1';
} catch { /* sem storage → sem hint, sem quebrar */ }
// Seat com popover aberto (um por vez; -1 = nenhum). Tap no avatar
// alterna, overlay/Escape/Predict fecham.
const selectedSeat = ref(-1);
const predictPayload = ref({
    seatIndex: -1,
    residualRange: new Set(),
    vilaoMao: '',
});

const sb = computed(() => ActiveDrill.settings?.blinds?.[0] ?? 0);
const bb = computed(() => ActiveDrill.settings?.blinds?.[1] ?? 0);
// Drill hideAvatar: avatar vira índice e RoleBadge some (PlayerSeat decide
// por seat; herói mantém a posição). Default false = mesa atual intacta.
const hideAvatar = computed(() => ActiveDrill.settings?.hideAvatar ?? false);

const toastRef = ref(null);
const flashRef = ref(null);

// Flying money tokens: only money-moving actions fly, and only while the
// VFX kill-switch is on. New event key = remount = new flight.
const FLY_TOKENS = new Set(['CALL', 'LIMP', 'OR', '3B', '4B', 'ALL-IN']);
const flight = computed(() => {
    const la = props.vfx.lastAction;
    if (!VFX.flyingToken || !la || !FLY_TOKENS.has(la.token)) return null;
    const pos = players.value[la.seat]?.position;
    if (!pos) return null;
    return { ...la, pos };
});

const triggerFeedback = (type, message) => {
    if (flashRef.value) flashRef.value.trigger(type);
    if (toastRef.value) {
        toastRef.value.type = type;
        toastRef.value.message = message;
        toastRef.value.trigger();
    }
};

const handleSelectSeat = (seatIndex) => {
    selectedSeat.value = selectedSeat.value === seatIndex ? -1 : seatIndex;
};

// Hover (só com mouse): abre idempotente, nunca alterna — o mouseleave
// do seat fecha. Tap no touch continua no toggle acima.
const handlePeekSeat = (seatIndex) => {
    if (seatIndex >= 0) selectedSeat.value = seatIndex;
};

const handleClosePopover = () => {
    selectedSeat.value = -1;
};

const handlePredictClick = (seatIndex) => {
    // Descobriu: o pulso morre aqui (1ª vez por sessão).
    showPredictHint.value = false;
    try { sessionStorage.setItem('poker_predict_hint_seen', '1'); } catch {}
    // Popover fecha ao abrir o modal.
    selectedSeat.value = -1;
    // Map é chaveado por seat: pertencimento, não tamanho (índice 8
    // existe num Map de size 8 — o `>= size` antigo matava o último seat).
    if (!props.residualRanges.has(seatIndex)) return;
    const residualRange = props.residualRanges.get(seatIndex) || new Set();
    if (residualRange.size === 0) return;
    
    // Snapshot do residual na abertura: o narrowing continua correndo
    // atrás, mas o gabarito do palpite é o momento do clique.
    predictPayload.value = {
        seatIndex,
        residualRange,
        // Label canônico (high-first, ex '97s') — mesma função do engine
        // e do grid; a duplicata local invertia (ex '79s') e o 100% nunca
        // batia no has().
        vilaoMao: getHandLabel(players.value[seatIndex]?.cards) || '',
    };
    showPredictModal.value = true;
    props.onPredictOpen(true);
};

const closePredictModal = () => {
    const wasForced = props.forcedSeat >= 0;
    hidePredictModal();
    if (wasForced) props.onForcedDone?.(false);
};

const hidePredictModal = () => {
    showPredictModal.value = false;
    props.onPredictOpen(false);
};

// Abertura forçada: sem residual não há o que adivinhar — dispensa na
// hora (done(false)) em vez de pendurar o loop do drill.
function openForcedPredict(seat) {
    const residualRange = props.residualRanges.get(seat) || new Set();
    if (!props.residualRanges.has(seat) || residualRange.size === 0) {
        props.onForcedDone?.(false);
        return;
    }
    handlePredictClick(seat);
}

watch(() => props.forcedSeat, (s) => {
    if (s >= 0) openForcedPredict(s);
});

const handlePredictSubmit = (selected) => {
    const payload = { ...predictPayload.value, selectedHands: selected.selectedHands };
    const wasForced = props.forcedSeat >= 0;
    hidePredictModal();
    props.onPredictSubmit({
        seatIndex: payload.seatIndex,
        selectedHands: payload.selectedHands,
        residualRange: payload.residualRange,
        vilaoMao: payload.vilaoMao,
    });
    if (wasForced) props.onForcedDone?.(true);
};

/* getLabelFromCards removido: usava ordem invertida (low-first).
   Label canônico vem de infra/handRankings getHandLabel (high-first),
   a mesma do engine, do residual e do grid. */
</script>

<template>
    <div class="flex justify-center items-center w-full">
        <div class="relative mt-[13%] w-[70%] max-w-112.5 aspect-1/2 z-10">
            <PokerTableSurface />

            <!-- Table status card + center decision block -->
            <TableStatus v-if="handNo > 0" :sb="sb" :bb="bb" :hand-no="handNo" :hands-total="handsTotal" :hero-time-left="heroTimeLeft" />
            <CenterPot v-if="handNo > 0" :pot="pot" :to-call="toCall" :bb="bb" :instant="instant" />
            <BoardDisplay v-if="handNo > 0 && board.length > 0" :cards="board" :shown="shown" :reveal-key="handNo"
                class="absolute left-1/2 -translate-x-1/2 top-[52%] z-10" />
            <FlyingToken v-if="flight" :key="handNo + '-' + flight.key" :flight="flight" :bb="bb" />
            
            <PlayerSeat v-for="(Player, index) in players"
                :key="index"
                :index="index"
                :position="Player.position"
                :name="Player.profile?.stats?.NAME || Player.name"
                :balance="stacks[index] ?? Player.balance"
                :ButtonPosition="Player.ButtonPosition"
                :hero="Player.hero"
                :role="Player.role"
                :sb="sb"
                :bb="bb"
                :is-actor="vfx.actor === index"
                :dimmed="vfx.folded.includes(index)"
                :folded="vfx.folded.includes(index)"
                :selected="selectedSeat === index"
                :hint-predict="showPredictHint"
                :all-in="vfx.allIn.includes(index)"
                :action-token="vfx.lastAction && vfx.lastAction.seat === index ? vfx.lastAction.token : ''"
                :action-key="vfx.lastAction && vfx.lastAction.seat === index ? vfx.lastAction.key : 0"
                :plaque="vfx.plaques[index] || null"
                :bet="committed[index] || 0"
                :postflop="shown > 0"
                :hole-cards="Player.cards || []"
                :revealed="revealed.includes(index)"
                :winner="winners.includes(index)"
                :showdown-key="handNo"
                :hide-avatar="hideAvatar"
                @select="handleSelectSeat"
                @peek="handlePeekSeat"
                @close="handleClosePopover"
                @predict="handlePredictClick"
                />
                <!-- Overlay invisível: tap fora do popover fecha. z-10 fica
                     acima do feltro e abaixo dos seats (z-20), então tap em
                     outro avatar troca direto em vez de só fechar. -->
                <div v-if="selectedSeat >= 0"
                    class="absolute inset-0 z-10"
                    @click="selectedSeat = -1" />
                <PlayerHand :cards="players[0].cards" :is-turn="heroTurn" :deal-key="handNo" />

            <!-- Feedback Overlays -->
            <ScreenFlash ref="flashRef" />

            <!-- Predict Range Modal (sem dica: grid neutro, gabarito fica no parent) -->
            <PredictRangeModal 
              v-if="showPredictModal"
              :seat-label="players[predictPayload.seatIndex]?.profile?.stats?.NAME || players[predictPayload.seatIndex]?.name || ''"
              @close="closePredictModal"
              @submit="handlePredictSubmit"
            />

            <!-- Countdown Overlay -->
            <div v-if="countdown > 0" class="absolute inset-0 flex items-center justify-center z-50">
                <div class="text-8xl font-black text-text-primary drop-shadow-2xl animate-ping">
                    {{ countdown }}
                </div>
            </div>
        </div>
    </div>
</template>

