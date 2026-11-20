<script setup>
import { ref, reactive, computed, onUnmounted, watch, nextTick } from 'vue';
import ActionButtons from '../actionButtons.vue';
import HandSidebar from '../HandSidebar.vue';
import PokerTable from '../PokerTable.vue';
import StartDrill from '../StartDrill.vue';
import { usePokerTable } from '../../composables/usePokerTable';
import { usePokerGame } from '../../composables/usePokerGame';
import { ActiveDrill, resolveDrillMode } from '../../composables/useDrillSettings';
import { rangeGame, getRawPaintedLine, getXrfiCallCap } from '../../composables/useRangeGame';
import { useVillains } from '../../composables/useVillains';
import { usePersistence } from '../../composables/usePersistence';
import { callCapToBb } from '../../composables/useActions';
import { useAnalytics } from '../../composables/useAnalytics';
import { getHandLabel } from '../../infra/handRankings';
import { notify, clearNotice } from '../../composables/useRangeMatrix';
import { createTable, postBlinds, bankBlindsAsDeadMoney, toCall, potTotal, facing, liveSeats, showdownSeats } from '../../engine/table';
import { syncHistoryBoard } from '../../engine/handHistory.js';
import { boardToDealer } from '../../infra/format';
import { fmtMoney, displayUnit, setDisplayUnit } from '../../composables/useDisplayUnit';
import { createVfxMirror, reduceVfxEvent, VFX, prefersReducedMotion } from '../../vfx';
import { runPreflop, toBoardCard } from '../../engine/preflop';
import { generateBoardCards } from '../../engine/board';
import { runPostflop, normalizeHeroDecision } from '../../engine/postflop';
import { gradePreflopLine } from '../../engine/heroGrade';
import { gradeHeroEv, heroEquity } from '../../engine/heroEv';
import { bucketForHand } from '../../engine/buckets';
import { initResidual, narrowPreflop, narrowPostflop, scorePredict } from '../../engine/residual';
import { redistributeRange as redistributeRangeEngine } from '../../engine/buckets';
import { sessionSummary as summarizeSession, newRecords as checkRecords, comboFromVerdicts as comboOf } from '../../engine/engagement';
import { pickPredictSeat } from '../../engine/predictPick.js';

const HERO_SEAT = 0;

const { init, players } = usePokerTable();
const { startRound, prepareRound } = usePokerGame();
const { getModRange, Ranges } = rangeGame();
const { villains } = useVillains();
const { loadAll } = usePersistence();
const { logPredict, logEvFeedback, logHandResult, endSession, hands, stats } = useAnalytics();

const showStartDrill = ref(true);
const engineTable = ref(null);
const heroTurn = ref(null);
const heroTimeLeft = ref(0);
const handNo = ref(0);
const handsTotal = ref(0);
const summary = ref(null);
const summaryOpen = ref(true); // false: modal de fim de drill dispensado p/ revisar as mãos
const playAgainBtn = ref(null);
// Analytics shown during a drill are limited to events since it began.
const drillStartISO = ref(null);
const liveCombo = computed(() => {
    if (!drillStartISO.value) return 0;
    const t0 = new Date(drillStartISO.value).getTime();
    const v = ((stats.value?.evFeedback?.history) || [])
        .filter((e) => e?.timestamp && new Date(e.timestamp).getTime() >= t0)
        .map((e) => e.verdict);
    return comboOf(v).combo;
});
const residualRanges = ref(new Map()); // seat → Set de labels
// Drill-end dialog steals focus so keyboard users land on Play again.
watch(summary, async (s) => {
    if (s) {
        await nextTick();
        playAgainBtn.value?.focus();
    }
});
// Action-choreography mirror (reset every hand, read-only feed from driver).
const vfx = ref(createVfxMirror());
// Board + showdown state: dealer strings, streets shown, seats revealed.
// Reset every hand like the vfx mirror; revealKey/showdownKey reuse handNo.
const board = ref([]);
const shown = ref(0);
const revealed = ref([]);
const winners = ref([]);

let heroResolve = null;
let heroCtx = null; // último turn do herói (facing/street/board p/ o grade 5.2)
let heroTimer = null;
let heroTicker = null;
// /profile hand buffer: one record per hand, pushed at settle (never partial).
let handLog = null;
let handStartStack = 0;
// Run-local overrides from the StartDrill popup (never saved).
let runOverrides = null;
// Leaving the page stops the drill: loop checks between hands, pending
// hero waits resolve immediately so runPreflop never hangs on a dead page.
const cancelled = ref(false);

onUnmounted(() => {
    cancelled.value = true;
    if (forcedResolve) {
        const resolve = forcedResolve;
        forcedResolve = null;
        forcedPredictSeat.value = -1;
        resolve(false);
    }
    if (heroResolve) {
        const resolve = heroResolve;
        heroResolve = null;
        clearHeroTimer();
        resolve({ token: 'FOLD', size: null });
    } else {
        clearHeroTimer();
    }
});

const pot = computed(() => {
    if (!engineTable.value) return 0;
    return potTotal(engineTable.value); // committed + banked streets
});

// Display-only: live committed per seat (bet chips) + hero's to-call.
// Flop já na mesa mas pré-flop ainda não bancado (linger antes do runPostflop):
// as fichas já estão no pote, então não desenham.
const streetBanked = ref(true);
const committedBySeat = computed(() =>
    engineTable.value && streetBanked.value ? engineTable.value.seats.map(s => s.committed) : []
);
const stackBySeat = computed(() =>
    engineTable.value ? engineTable.value.seats.map(s => s.stack) : []
);
const heroToCall = computed(() => {
    if (!engineTable.value) return 0;
    try {
        // O valor exibido é o que o herói consegue pagar: all-in curto não mostra mais que o stack.
        return Math.min(toCall(engineTable.value, HERO_SEAT), engineTable.value.seats[HERO_SEAT].stack);
    } catch {
        return 0;
    }
});

// Count-up runs only when villains visibly act; instant villains → instant pot.
const instantVfx = computed(() =>
    (runOverrides?.villainDelayMs ?? ActiveDrill.settings?.villainDelayMs ?? 0) === 0
);

const drillStack = () => ActiveDrill.settings.stacks * ActiveDrill.settings.blinds[1];

function clearHeroTimer() {
    if (heroTimer) clearTimeout(heroTimer);
    if (heroTicker) clearInterval(heroTicker);
    heroTimer = null;
    heroTicker = null;
    heroTurn.value = null;
    heroTimeLeft.value = 0;
}

// Predict obrigatório (drill predictAlways): fim de mão abre o modal
// sozinho e o loop aguarda submit (score normal) ou skip (sem score).
// Sem vilão na mão = skip silencioso. Fail-open em tudo: o drill anda.
const forcedPredictSeat = ref(-1);
let forcedResolve = null;
function handleForcedDone() {
    forcedPredictSeat.value = -1;
    const resolve = forcedResolve;
    forcedResolve = null;
    if (resolve) resolve(true);
}
async function runForcedPredict(preflopLines) {
    // Vilão na mão: vivo (não foldou). Residual vazio (fold esvazia por
    // desenho; linha fora do trim esvazia na prática) NÃO desqualifica:
    // sem narrowing aplicável, o gabarito volta ao range da mão (união
    // init) — sempre existe via engine completion. Só sem NADA há skip.
    const live = players.value
        .map((p, i) => i)
        .filter((i) => i !== HERO_SEAT && players.value[i].role
            && !(vfx.value.folded || []).includes(i) && residualRanges.value.has(i));
    const seat = pickPredictSeat({
        reachedPostflop: (board.value || []).length > 0,
        liveVillains: live,
        preflopActions: preflopLines || [],
        heroSeat: HERO_SEAT,
    });
    if (seat < 0 || cancelled.value) return true;
    let gabarito = residualRanges.value.get(seat) || new Set();
    if (gabarito.size === 0) {
        gabarito = initResidual(villainRange(players.value[seat]?.role || ''));
        if (gabarito.size === 0) return true;
        residualRanges.value.set(seat, gabarito);
    }
    forcedPredictSeat.value = seat;
    return new Promise((resolve) => { forcedResolve = resolve; });
}

// Predict modal congela o relógio: pausa sem encerrar a vez (heroResolve
// continua pendente) e retoma com o tempo restante ao fechar.
const predictOpen = ref(false);
// Sidebar do histórico: mesmo trato — espiar não queima o relógio.
// Desktop (≥1280) abre dockada à esquerda por padrão; mobile começa
// fechada (drawer). "Sempre aberto" = padrão, não trava: fechar continua
// possível e o botão Hands reabre.
// Desktop dockado é NÃO-modal: não pausa o relógio nem trava as ações
// (só o drawer mobile bloqueia). Posição: absoluta à esquerda do
// stage-outer — a mesa segue centrada, a sidebar ocupa o gutter.
const sidebarOpen = ref(
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(min-width: 1280px)').matches
);
const isDesktop = ref(
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(min-width: 1280px)').matches
);
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mq = window.matchMedia('(min-width: 1280px)');
  const upd = (e) => { isDesktop.value = e.matches; };
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', upd);
  else if (typeof mq.addListener === 'function') mq.addListener(upd);
}
// Drawer mobile bloqueia; dock desktop não.
const sidebarBlocks = computed(() => sidebarOpen.value && !isDesktop.value);

function pauseHeroClock() {
    if (heroTimer) clearTimeout(heroTimer);
    if (heroTicker) clearInterval(heroTicker);
    heroTimer = null;
    heroTicker = null;
    // heroTurn e heroTimeLeft intactos: a vez continua, só o tempo para.
}

function resumeHeroClock() {
    if (cancelled.value || !heroResolve || heroTimer) return;
    if (heroTimeLeft.value <= 0) {
        const resolve = heroResolve;
        heroResolve = null;
        clearHeroTimer();
        resolve({ token: 'FOLD', size: null });
        return;
    }
    startHeroClock();
}

function setPredictOpen(open) {
    predictOpen.value = open;
    if (open) pauseHeroClock();
    else resumeHeroClock();
}

function setSidebarOpen(open) {
    sidebarOpen.value = open;
    // Desktop dockado é não-modal: nunca mexe no relógio.
    if (open && sidebarBlocks.value) pauseHeroClock();
    else if (!open) resumeHeroClock();
}

function startHeroClock() {
    if (heroTimer || heroTicker) return;
    heroTicker = setInterval(() => {
        heroTimeLeft.value = Math.max(0, heroTimeLeft.value - 0.25);
    }, 250);
    heroTimer = setTimeout(() => {
        if (heroResolve) {
            const resolve = heroResolve;
            const timeoutFold = { token: 'FOLD', size: null };
            try {
                gradeHeroDecision(timeoutFold);
            } catch (err) {
                console.error('hero grading skipped:', err?.message || err);
            }
            heroResolve = null;
            clearHeroTimer();
            resolve(timeoutFold); // time out = fold, registrado e gradeado como decisão
        }
    }, heroTimeLeft.value * 1000);
}

function waitHero(turn) {
    heroTurn.value = turn;
    heroCtx = turn; // grading context for onHeroDecision (facing/street/board)
    // Keep the previous grade notice from overlapping the next decision.
    clearNotice();
    const thinkTime = ActiveDrill.settings.ActionTime;
    heroTimeLeft.value = thinkTime;
    return new Promise((resolve) => {
        heroResolve = resolve;
        // Modal aberto: a vez registra mas o tempo só corre ao fechar.
        // Sidebar dockada (desktop) nunca congela — só drawer mobile.
        if (!predictOpen.value && !sidebarBlocks.value) startHeroClock();
    });
}

// 5.2 hero EV feedback via notify (canal existente, sem toast/flash novo):
// pré-flop = linha pintada (só corrige, nunca comemora); pós-flop = conta
// de EV em chips. O grading nunca pode travar a vez: erro aqui loga e a
// decisão segue.
function gradeHeroDecision(decision) {
    const table = engineTable.value;
    if (!table || !heroCtx) return;
    const liveToCall = (() => {
        try { return toCall(table, HERO_SEAT); } catch { return heroCtx.toCall ?? 0; }
    })();
    if (heroCtx.facing === 'postflop') {
        const cards = players.value[HERO_SEAT].cards || [];
        if (cards.length === 0) return;
        const hole = cards.map(toBoardCard);
        const { bucket, outs } = bucketForHand(hole, heroCtx.board || []);
        const op = normalizeHeroDecision(decision, liveToCall).op;
        const stack = table.seats[HERO_SEAT].stack;
        const committed = table.seats[HERO_SEAT].committed;
        const live = liveSeats(table).filter((s) => s !== HERO_SEAT);
        const calls = live
            .map((s) => players.value[s]?.profile?.stats?.CALL)
            .filter((v) => Number.isFinite(Number(v)))
            .map(Number);
        const foldProb = calls.length
            ? calls.reduce((a, c) => a + (1 - c), 0) / calls.length
            : 0.5;
        let heroOp = op;
        let raiseExtra = null;
        if (op === 'RAISE' && decision.size != null) {
            raiseExtra = Math.max(0, decision.size - committed - liveToCall);
        }
        if (op === 'ALL-IN') {
            if (stack <= liveToCall) heroOp = 'CALL'; // shove curto = call
            else raiseExtra = Math.max(0, stack - liveToCall);
        }
        const g = gradeHeroEv({
            bucket, outs, street: heroCtx.street || 'flop', pot: potTotal(table),
            toCall: liveToCall, stack, foldProb, heroOp, raiseExtra,
        });
        if (handLog) {
            handLog.postflop.push({
                street: heroCtx.street || 'flop', op: heroOp, toCall: liveToCall,
                bucket, outs, equity: heroEquity({ bucket, outs, street: heroCtx.street || 'flop' }),
                chosenEV: g.chosenEV, bestEV: g.bestEV, delta: g.delta, verdict: g.verdict,
            });
        }
        const bb = table.bb;
        if (g.verdict === 'plus') {
            notify(`+EV ✓ ${heroOp} (+${fmtMoney(g.chosenEV, bb)})`, 'POSITIVE');
        } else {
            // Notify enxuto: veredito + número. O porquê mora no /coach.
            notify(`−EV ✗ ${heroOp}`, 'NEGATIVE');
        }
        logEvFeedback({ verdict: g.verdict, street: heroCtx.street, facing: 'postflop' });
    } else {
        const role = players.value[HERO_SEAT]?.role || '';
        const label = getHandLabel(players.value[HERO_SEAT].cards);
        const { rfi, xrfi } = getRawPaintedLine(role, label);
        const cap = getXrfiCallCap(role, label);
        const g = gradePreflopLine({
            heroToken: decision.token, rfiLine: rfi, xrfiLine: xrfi,
            facing: heroCtx.facing || 'none', toCall: liveToCall,
            bb: table.bb, xrfiCallCap: cap ? callCapToBb(cap, table.bb) : null,
        });
        // Primeira decisão pré-flop define a entrada na mão (VPIP/PFR/RFI);
        // re-ações vs 3b/4b são o mesmo entry, não outra mão.
        if (handLog && !handLog.preflop) {
            handLog.preflop = {
                facing: heroCtx.facing || 'none',
                token: decision.token,
                verdict: g ? 'minus' : 'plus',
            };
        }
        if (g) {
            // Notify enxuto: veredito só. A linha certa mora no /coach.
            notify(`−EV ✗ ${g.chosen} fora da linha`, 'NEGATIVE');
            logEvFeedback({ verdict: 'minus', street: 'preflop', facing: heroCtx.facing });
        }
        // Na linha → silêncio.
    }
}

function onHeroDecision(decision) {
    if (!heroResolve) return;
    try {
        gradeHeroDecision(decision);
    } catch (err) {
        console.error('[5.2] hero grading skipped:', err?.message || err);
    }
    const resolve = heroResolve;
    heroResolve = null;
    clearHeroTimer();
    resolve(decision);
}

function seatRole(seat) {
    return players.value[seat].role;
}

function villainRange(role) {
    const stats = players.value.find(p => p.role === role)?.profile?.stats
        || { RFI: 0.2, '3BET': 0.08, '4BET': 0.03, BLUFF: 0.3 };
    return getModRange({
        POS: role,
        RFI: stats.RFI,
        threeBet: stats['3BET'],
        fourBet: stats['4BET'],
        bluff: stats.BLUFF,
        call: stats.CALL ?? stats['3BET'], // old saves have no CALL
    });
}

async function runHand() {
    startRound(players.value);
    const sb = ActiveDrill.settings.blinds[0];
    const bb = ActiveDrill.settings.blinds[1];
    handLog = {
        date: new Date().toISOString(),
        drill: ActiveDrill.name || null,
        handNo: handNo.value,
        role: players.value[HERO_SEAT]?.role || '',
        sb, bb, heroSeat: HERO_SEAT,
        heroCards: [...(players.value[HERO_SEAT]?.cards || [])],
        seats: [], blinds: null,
        preflop: null, postflop: [],
        lines: { preflop: [], flop: [], turn: [], river: [] },
        board: [], winners: null, handName: null, shownCards: {},
        result: null,
    };
    handStartStack = players.value[HERO_SEAT]?.balance ?? 0;
    vfx.value = createVfxMirror(); // fresh choreography state per hand
    board.value = [];
    shown.value = 0;
    streetBanked.value = true;
    revealed.value = [];
    winners.value = [];
    initResidualRanges(); // Initialize residual ranges for this hand
    const table = reactive(createTable({ numSeats: players.value.length, stackChips: 0, sb, bb }));
    players.value.forEach((p, i) => {
        let stack = typeof p.balance === 'number' ? p.balance : drillStack();
        // Herói nunca recompra: stack < bb encerra o drill (ver runDrill).
        if (i !== HERO_SEAT && stack < bb) {
            stack = drillStack(); // busted → rebuy, drill goes on
            notify(`${p.name || 'Seat ' + (i + 1)} rebought ${fmtMoney(stack, bb)}`);
        }
        table.seats[i].stack = stack;
    });
    const sbSeat = players.value.findIndex(p => p.role === 'SMALL_BLIND');
    const bbSeat = players.value.findIndex(p => p.role === 'BIG_BLIND');
    // Histórico solver: stacks pré-blind + quem postou (formato precisa dos dois).
    // Nome igual ao settle (profile NAME > name > Seat N) — nunca "Seat 2".
    if (handLog) {
        handLog.seats = players.value.map((p, i) => ({
            seat: i,
            name: p.profile?.stats?.NAME || p.name || 'Seat ' + (i + 1),
            role: p.role || '', stack: table.seats[i].stack,
        }));
        handLog.blinds = { sbSeat, bbSeat };
    }
    postBlinds(table, sbSeat, bbSeat);
    engineTable.value = table;

    const btnSeat = players.value.findIndex(p => p.role === 'BUTTON');

    // Facing no momento da decisão: capturado no 'turn' (antes do apply),
    // consumido no 'action'. facing(table) no 'action' já seria o novo
    // estado pós-apply — narrowing errado.
    let pendingFace = facing(table);
    let pendingToCall = 0;
    let pendingPot = potTotal(table);
    const onPreflopAction = (e) => {
        if (e.type === 'turn') {
            pendingFace = facing(table);
            try {
                pendingToCall = toCall(table, e.seat);
                pendingPot = potTotal(table);
            } catch { /* Optional analytics must not interrupt the drill. */ }
        } else if (e.type === 'action' && e.seat !== HERO_SEAT) {
            narrowPreflopAction(e.seat, pendingFace, e.token);
        } else if (e.type === 'action' && e.seat === HERO_SEAT) {
            try {
                const role = players.value[HERO_SEAT]?.role || '';
                const label = getHandLabel(players.value[HERO_SEAT].cards);
                const { rfi, xrfi } = getRawPaintedLine(role, label);
            } catch { /* Optional analytics must not interrupt the drill. */ }
        }
    };

    // Pós-flop compartilhado (full continua do preflop; post-only entra
    // direto com o flop gerado — blinds postados, pote = blinds).
    async function playPostflop(table, flopBoard) {
        // Real postflop: cascade the flop, then play turn → river → showdown.
        board.value = (flopBoard || []).map(boardToDealer);
        shown.value = Math.min(3, board.value.length);
        streetBanked.value = false;
        await pause(VFX.dur.linger);
        streetBanked.value = true;
        if (cancelled.value) return false;

        // Board vivo do engine (flop → turn → river); flopBoard é só o flop.
        let currentBoard = [...(flopBoard || [])];
        let currentStreet = 'flop';
        if (handLog) handLog.board = currentBoard.map(boardToDealer);
        const onPostflopAction = (e) => {
            if (e.type === 'street') {
                currentBoard = [...e.board];
                currentStreet = e.street;
                if (handLog) handLog.board = currentBoard.map(boardToDealer);
                try {
                } catch { /* Optional analytics must not interrupt the drill. */ }
            } else if (e.type === 'action' && e.seat !== HERO_SEAT) {
                // ALL-IN pós-flop é agressão máxima: mesmos buckets do RAISE.
                const op = e.token === 'ALL-IN' ? 'RAISE' : e.token;
                narrowPostflopAction(e.seat, currentBoard, op);
            } else if (e.type === 'action' && e.seat === HERO_SEAT) {
                try {
                } catch { /* Optional analytics must not interrupt the drill. */ }
            }
            // Histórico solver: sequência por rua (herói incluso, op normalizada).
            if (handLog && e.type === 'action' && handLog.lines[currentStreet]) {
                handLog.lines[currentStreet].push([e.seat, e.token, e.size ?? null]);
            }
        };

        const final = await runPostflop(table, {
            heroSeat: HERO_SEAT,
            board: flopBoard,
            holeCards: players.value.map(p => p.cards),
            profileFor: (seat) => players.value[seat].profile?.stats || { RFI: 0.2, CALL: 0.08, BLUFF: 0.3 },
            waitHero,
            onEvent: (e) => {
                reduceVfxEvent(vfx.value, e);
                onPostflopAction(e);
                if (e.type === 'street') {
                    board.value = (e.board || []).map(boardToDealer);
                    shown.value = board.value.length;
                }
            },
            villainDelayMs: runOverrides?.villainDelayMs ?? ActiveDrill.settings.villainDelayMs ?? 0,
        });
        if (cancelled.value) return false;
        return await settle(final);
    }

    const mode = resolveDrillMode(ActiveDrill.settings);
    if (mode === 'post-only') {
        // Só-pós-flop: pula o preflop; blinds postados, flop direto, pote = blinds.
        const known = [];
        for (const cards of players.value.map(p => p.cards)) {
            if (cards) for (const c of cards) known.push(toBoardCard(c));
        }
        bankBlindsAsDeadMoney(table);
        return await playPostflop(table, generateBoardCards(3, known));
    }

    const res = await runPreflop(table, {
        heroSeat: HERO_SEAT,
        villainRange,
        seatRole,
        holeLabel: (seat) => getHandLabel(players.value[seat].cards),
        holeCards: players.value.map(p => p.cards),
        waitHero,
        onEvent: (e) => {
            reduceVfxEvent(vfx.value, e);
            onPreflopAction(e);
            // Histórico solver: sequência completa (todos os seats, verdade aplicada).
            if (handLog && e.type === 'action') {
                handLog.lines.preflop.push([e.seat, e.token, e.size ?? null]);
            }
        },
        villainDelayMs: runOverrides?.villainDelayMs ?? ActiveDrill.settings.villainDelayMs ?? 0,
        // Só-pré-flop: o pote volta (refundAll no motor), a mão encerra seca.
        keepStakes: mode !== 'pre-only',
    });
    if (cancelled.value) return false;
    if (res.reason === 'to-postflop' && mode !== 'pre-only') {
        return await playPostflop(table, res.board);
    }
    return await settle(res);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// Instant villains = instant streets; reduced-motion users skip the
// choreography pauses regardless of drill speed. Tests and turbo drills
// skip the pauses.
const pause = (ms) => (instantVfx.value || prefersReducedMotion()) ? Promise.resolve() : sleep(ms);

async function settle(res) {
    players.value.forEach((p, i) => { p.balance = engineTable.value.seats[i].stack; });
    // Predict obrigatório precisa das linhas pré-flop — o bloco abaixo
    // zera handLog, então carrega antes.
    const settledPreflopLines = handLog?.lines?.preflop || [];
    const settledHandNo = handLog?.handNo;
    // /profile: fecha o registro da mão (delta, showdown, pote) e empilha.
    if (handLog) {
        const showdownReasons = ['allin-runout', 'postflop-showdown', 'postflop-runout'];
        const isShowdown = showdownReasons.includes(res.reason);
        // Board final manda no histórico: runout corre as cartas sem
        // eventos de street, então o board vivo está vazio/parcial.
        syncHistoryBoard(handLog, res);
        const total = Math.round((res.pots || []).reduce((n, p) => n + p.amount, 0) * 100) / 100;
        try {
            const wins = Array.isArray(res.winners) ? res.winners.join('+') : (res.winner ?? '-');
        } catch { /* Optional analytics must not interrupt the drill. */ }
        handLog.result = {
            heroDelta: Math.round((players.value[HERO_SEAT].balance - handStartStack) * 100) / 100,
            pot: total,
            // WTSD é do herói: fold antes do showdown não conta, mesmo que os vilões cheguem lá.
            showdown: isShowdown && showdownSeats(engineTable.value).includes(HERO_SEAT),
            won: Array.isArray(res.winners) ? res.winners.includes(HERO_SEAT) : res.winner === HERO_SEAT,
        };
        // Histórico solver: vencedores + cartas reveladas (mesma regra do reveal).
        handLog.winners = Array.isArray(res.winners) ? [...res.winners] : (res.winner != null ? [res.winner] : null);
        handLog.handName = res.handName || null;
        const revealSeats = isShowdown && Array.isArray(res.winners)
            ? showdownSeats(engineTable.value)
            : [];
        handLog.shownCards = Object.fromEntries(
            revealSeats.map(s => [s, [...(players.value[s]?.cards || [])]])
        );
        try {
            logHandResult(handLog);
        } catch (err) {
            console.error('[profile] hand log skipped:', err?.message || err);
        }
        handLog = null;
    }
    if (res.reason === 'everyone-folded') {
        const winner = players.value[res.winner];
        const total = res.pots.reduce((n, p) => n + p.amount, 0);
        notify(`${winner.profile?.stats?.NAME || winner.name || 'Seat ' + (res.winner + 1)} takes ${fmtMoney(total, engineTable.value.bb)}`, res.winner === HERO_SEAT ? 'POSITIVE' : 'NEGATIVE');
    } else if (res.reason === 'allin-runout' || res.reason === 'postflop-showdown' || res.reason === 'postflop-runout') {
        board.value = res.board.map(boardToDealer);
        // Ruas já exibidas ao vivo não recascatam: avança só o que falta
        // (showdown pós-flop já mostrou tudo rua a rua; all-in runout
        // pulou os eventos de street e precisa da cascata 3→4→5).
        for (const n of [3, 4, 5]) {
            if (n <= shown.value || n > board.value.length) continue;
            shown.value = n;
            await pause(VFX.dur.street);
            if (cancelled.value) return false;
        }
        // Reveal: todo seat vivo mostra no showdown; só fold esconde.
        winners.value = [...res.winners];
        revealed.value = showdownSeats(engineTable.value);
        await pause(VFX.dur.linger);
        if (cancelled.value) return false;
        const names = res.winners.map(w => players.value[w].profile?.stats?.NAME || players.value[w].name || 'Seat ' + (w + 1));
        // Showdown completo: board + quem leva + quanto + mão vencedora
        // (avaliador 7-cartas: melhor 5 de 7 com kickers; paridade com o
        // everyone-folded no take).
        const total = res.pots.reduce((n, p) => n + p.amount, 0);
        notify(`Runout ${res.board.map(c => c.rank + c.suit).join(' ')} — ${names.join(' + ')} take ${fmtMoney(total, engineTable.value.bb)} (${res.handName || 'split'})`, res.winners.includes(HERO_SEAT) ? 'POSITIVE' : 'NEGATIVE');
        await pause(VFX.dur.linger);
    }
    // Drill predictAlways: fim de mão pede predict sozinho (submit ou skip).
    if ((ActiveDrill.settings?.predictAlways ?? false) && !cancelled.value) {
        await runForcedPredict(settledPreflopLines);
        if (cancelled.value) return false;
    }
    engineTable.value = null;
    return !cancelled.value;
}

async function runDrill() {
    const startStack = players.value[HERO_SEAT].balance;
    const bb = ActiveDrill.settings.blinds[1];
    const finish = (busted) => {
        try {
            endSession();
        } catch (err) {
            console.error('[profile] end session skipped:', err?.message || err);
        }
        summary.value = {
            hands: busted ? handNo.value : handsTotal.value,
            heroStart: startStack,
            heroEnd: players.value[HERO_SEAT].balance,
            busted,
            session: summarizeSession(hands.value, stats.value?.predicts?.history || [], drillStartISO.value),
            records: checkRecords(hands.value, stats.value?.predicts?.history || [], drillStartISO.value),
        };
        handNo.value = 0;
    };
    handsTotal.value = runOverrides?.hands ?? ActiveDrill.settings.hands ?? 20;
    handNo.value = 0;
    for (let h = 0; h < handsTotal.value; h++) {
        if (cancelled.value) return;
        // Herói sem nem o blind: drill encerra com derrota (vilões têm rebuy).
        if ((players.value[HERO_SEAT].balance ?? 0) < bb) {
            finish(true);
            return;
        }
        handNo.value = h + 1;
        const cont = await runHand();
        if (!cont) return;
    }
    if (cancelled.value) return;
    finish(false);
}

const handleStart = (overrides) => {
    showStartDrill.value = false;
    summary.value = null;
    summaryOpen.value = true;
    drillStartISO.value = new Date().toISOString();
    runOverrides = overrides || null;
    cancelled.value = false;
    // Perfis antes do init: sem isso o drill fotografava os defaults
    // (VILLAIN-N) e o loadAll da mão 1 chegava tarde — os stats salvos
    // nunca dirigiam a sessão.
    try { loadAll(Ranges, villains); } catch { /* sem saves → defaults */ }
    init();
    prepareRound(players.value, runDrill);
};

const reviewHands = () => {
    summaryOpen.value = false;
    setSidebarOpen(true);
};

const playAgain = () => {
    summary.value = null;
    summaryOpen.value = true;
    drillStartISO.value = null;
    showStartDrill.value = true;
};

// Inicializa residual ranges na mão (só vilões — herói não tem range-modelo)
function initResidualRanges() {
    residualRanges.value.clear();
    players.value.forEach((p, seat) => {
        if (seat === HERO_SEAT) return;
        if (!p.role) return;
        const modRange = villainRange(p.role);
        const residual = initResidual(modRange);
        residualRanges.value.set(seat, residual);
    });
}

// Narrow preflop: remove mãos que não fizeram a ação
function narrowPreflopAction(seat, facing, token) {
    if (!residualRanges.value.has(seat)) return;
    const role = players.value[seat]?.role;
    if (!role) return;
    const modRange = villainRange(role);
    const current = residualRanges.value.get(seat);
    const narrowed = narrowPreflop(current, modRange, facing, token);
    residualRanges.value.set(seat, narrowed);
}

// Narrow postflop: filtra por bucket da ação
function narrowPostflopAction(seat, board, op) {
    if (!residualRanges.value.has(seat) || !board || board.length === 0) return;
    const current = residualRanges.value.get(seat);
    if (current.size === 0) return;
    const bucketed = redistributeRangeEngine(current, board);
    const narrowed = narrowPostflop(current, board, bucketed, op);
    residualRanges.value.set(seat, narrowed);
}

// Handler do submit do predict modal
function handlePredictSubmit(payload) {
    const { seatIndex, selectedHands, residualRange, vilaoMao } = payload;
    const score = scorePredict(selectedHands, residualRange, vilaoMao);
    logPredict({ score, seat: seatIndex, bucketName: 'preflop-residual' });
    notify(`Predict score: ${score}% (${selectedHands.size}/${residualRange.size})`, 'POSITIVE');
}
</script>

<template>
  <div id="stage-outer" class="stage-outer relative">
    <!-- Sidebar dockada no ≥1280: absoluta à esquerda do stage-outer
         (fora do scale, fora do fluxo — a mesa segue centrada).
         Overlay (<1280) continua drawer via Teleport. -->
    <HandSidebar :open="sidebarOpen" :hands="hands" :docked="true" @close="setSidebarOpen(false)" />
    <div id="stage" class="game-stage">
      <div id="main-container" class="relative w-full h-full">
        <PokerTable :pot="pot" :hand-no="handNo" :hands-total="handsTotal" :hero-time-left="heroTimeLeft" :hero-turn="!!heroTurn" :to-call="heroToCall" :committed="committedBySeat" :stacks="stackBySeat" :vfx="vfx" :instant="instantVfx" :board="board" :shown="shown" :revealed="revealed" :winners="winners" :residual-ranges="residualRanges" :on-predict-submit="handlePredictSubmit" :on-predict-open="setPredictOpen" :forced-seat="forcedPredictSeat" :on-forced-done="handleForcedDone" />
        <button v-if="!showStartDrill && !sidebarOpen" @click="setSidebarOpen(true)" aria-label="Open hand history" class="absolute top-2 left-2 z-20 inline-flex items-center gap-1 px-3 min-h-[44px] text-xs font-medium bg-bg-tertiary border border-border-active text-text-secondary hover:text-text-primary rounded transition-colors sl-hover">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01" /></svg>
          Hands
        </button>
        <div v-if="liveCombo >= 2 && !showStartDrill" aria-live="polite" class="absolute top-[60px] left-2 z-20 inline-flex items-center px-3 min-h-[44px] font-mono text-sm font-bold text-action-raise border border-action-raise/40 rounded-md bg-bg-secondary/80">🔥 x{{ liveCombo }}</div>
        <!-- Display unit uses the same store as the navigation bar. -->
        <div v-if="!showStartDrill" role="group" aria-label="Unidade de exibição"
            class="absolute top-2 right-2 z-20 inline-flex items-center rounded-md overflow-hidden border border-border-active bg-bg-tertiary">
          <button @click="setDisplayUnit('bb')" :aria-pressed="displayUnit === 'bb'" aria-label="Mostrar em big blinds"
            :class="['px-3 min-h-[44px] min-w-[44px] font-mono text-xs transition-colors sl-hover sl-active', displayUnit === 'bb' ? 'bg-action-primary text-bg-primary font-bold' : 'text-text-secondary hover:text-text-primary']">BB</button>
          <button @click="setDisplayUnit('chips')" :aria-pressed="displayUnit === 'chips'" aria-label="Mostrar em fichas"
            :class="['px-3 min-h-[44px] min-w-[44px] font-mono text-xs transition-colors sl-hover sl-active', displayUnit === 'chips' ? 'bg-action-primary text-bg-primary font-bold' : 'text-text-secondary hover:text-text-primary']">$</button>
        </div>
        <HandSidebar :open="sidebarOpen" :hands="hands" @close="setSidebarOpen(false)" />
        <StartDrill v-if="showStartDrill" @start="handleStart" />
        <button v-if="summary && !summaryOpen" @click="playAgain" class="absolute left-1/2 -translate-x-1/2 bottom-28 z-30 bg-action-primary text-bg-primary font-bold px-5 min-h-[44px] rounded-full shadow-lg hover:brightness-110 transition-all sl-active">
            Play again
        </button>
        <div v-if="summary && summaryOpen" class="absolute inset-0 z-30 flex items-center justify-center">
            <div class="bg-bg-secondary p-8 rounded-xl shadow-lg border border-border-subtle w-full max-w-sm text-center">
                <h2 class="text-2xl font-semibold text-text-primary mb-4">{{ summary.busted ? 'Busted' : 'Drill complete' }}</h2>
                <p class="text-text-secondary mb-2">{{ summary.hands }} hands played</p>
                <p class="text-text-primary font-mono mb-2">Hero: {{ fmtMoney(summary.heroStart, ActiveDrill.settings.blinds[1]) }} → {{ fmtMoney(summary.heroEnd, ActiveDrill.settings.blinds[1]) }}</p>
                <div v-if="summary.session" class="text-left font-mono text-xs border-t border-border-subtle mt-2 pt-3 mb-2 space-y-1">
                    <p class="text-text-primary">Session PnL <span class="font-bold">{{ fmtMoney(summary.session.pnl, ActiveDrill.settings.blinds[1]) }}</span>
                        <span class="text-text-secondary">(all-time avg {{ summary.session.pnlPerHandAvg === null ? '—' : fmtMoney(summary.session.pnlPerHandAvg, ActiveDrill.settings.blinds[1]) }}/hand)</span></p>
                    <p class="text-text-primary">+EV {{ summary.session.plusEv === null ? '—' : summary.session.plusEv.toFixed(1) + '%' }}
                        <span class="text-text-secondary">(all-time avg {{ summary.session.plusEvAvg === null ? '—' : summary.session.plusEvAvg.toFixed(1) + '%' }})</span></p>
                    <p v-if="summary.session.predictAvg !== null" class="text-text-primary">Predict {{ summary.session.predictAvg.toFixed(0) }}
                        <span class="text-text-secondary">(all-time avg {{ summary.session.predictAvgAll === null ? '—' : summary.session.predictAvgAll.toFixed(0) }})</span></p>
                    <p class="text-text-primary">Best combo 🔥 x{{ summary.session.maxCombo }}</p>
                    <p v-if="summary.records.pnlDay" class="text-action-raise font-bold">★ Novo recorde de PnL!</p>
                    <p v-if="summary.records.predict" class="text-action-primary font-bold">★ Novo recorde de Predict!</p>
                </div>
                <button ref="playAgainBtn" @click="playAgain" class="w-full bg-action-primary text-bg-primary font-bold py-3 rounded hover:brightness-110 transition-all sl-active">
                    Play again
                </button>
                <button @click="reviewHands" class="w-full mt-2 py-3 min-h-[44px] text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                    Review hands
                </button>
            </div>
        </div>
    </div>
    <div v-if="!showStartDrill" id="actions-container" style="margin-bottom: env(safe-area-inset-bottom)" class="absolute inset-x-3 bottom-3 h-20 max-w-[430px] mx-auto flex justify-center items-center bg-bg-secondary border border-border-subtle rounded-lg shadow-2xl z-20">
          <ActionButtons
            :disabled="showStartDrill || !heroTurn || predictOpen || sidebarBlocks"
            :table="engineTable"
            :hero-seat="HERO_SEAT"
            :facing="heroTurn?.facing || 'none'"
            :hero-role="players[HERO_SEAT]?.role || ''"
            :on-decision="onHeroDecision"/>
    </div>
    </div>
  </div>
</template>
