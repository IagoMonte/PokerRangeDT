import { ref, watch, onMounted } from 'vue';
import { computeMetrics } from '../engine/profileStats.js';

export function useAnalytics() {
    const stats = ref({
        totalHands: 0,
        vpipHands: 0,
        pfrHands: 0,
        totalBets: 0,
        totalRaises: 0,
        totalCalls: 0,
        bluffBets: 0,
        bluffRaises: 0,
        foldsToCbet: 0,
        facedCbet: 0,
        foldsToRiver: 0,
        facedRiverBet: 0,
        predicts: {
            n: 0,
            sumPrecision: 0,
            sumRecall: 0,
            history: [],
        },
        evFeedback: { plus: 0, minus: 0, history: [] },
    });

    const sessionHistory = ref([]);
    // Hand records for /profile (v1 shape in engine/profileStats.js).
    // Old saves have none → migrate to [].
    const hands = ref([]);

    const loadStats = () => {
        const saved = localStorage.getItem('poker_analytics_stats');
        if (saved) {
            stats.value = JSON.parse(saved);
        }
        const history = localStorage.getItem('poker_analytics_history');
        if (history) {
            sessionHistory.value = JSON.parse(history);
        }
        const storedHands = localStorage.getItem('poker_analytics_hands');
        if (storedHands) {
            try {
                const parsed = JSON.parse(storedHands);
                hands.value = Array.isArray(parsed) ? parsed : [];
            } catch {
                hands.value = [];
            }
        }
    };

    const saveStats = () => {
        localStorage.setItem('poker_analytics_stats', JSON.stringify(stats.value));
        localStorage.setItem('poker_analytics_history', JSON.stringify(sessionHistory.value));
        localStorage.setItem('poker_analytics_hands', JSON.stringify(hands.value.slice(-2000)));
    };

    watch(stats, saveStats, { deep: true });
    watch(sessionHistory, saveStats, { deep: true });
    watch(hands, saveStats, { deep: true });

    onMounted(loadStats);

    function logHand(actionData) {
        stats.value.totalHands++;
        if (actionData.vpip) stats.value.vpipHands++;
        if (actionData.pfr) stats.value.pfrHands++;
        
        stats.value.totalBets += actionData.bets || 0;
        stats.value.totalRaises += actionData.raises || 0;
        stats.value.totalCalls += actionData.calls || 0;
        stats.value.bluffBets += actionData.bluffBets || 0;
        stats.value.bluffRaises += actionData.bluffRaises || 0;
        
        stats.value.facedCbet += actionData.facedCbet || 0;
        stats.value.foldsToCbet += actionData.foldsToCbet || 0;
        stats.value.facedRiverBet += actionData.facedRiverBet || 0;
        stats.value.foldsToRiver += actionData.foldsToRiver || 0;
    }

    function logPredict(predictData) {
        const { score, seat, bucketName } = predictData;
        stats.value.predicts.n++;
        stats.value.predicts.sumPrecision += score;
        stats.value.predicts.history.push({
            timestamp: new Date().toISOString(),
            score,
            seat,
            bucketName,
        });
    }

    // 5.2 hero EV feedback per decision (additive: old shapes untouched).
    function logEvFeedback({ verdict, street, facing }) {
        const fb = stats.value.evFeedback || (stats.value.evFeedback = { plus: 0, minus: 0, history: [] });
        if (verdict === 'plus') fb.plus++;
        else fb.minus++;
        fb.history.push({ timestamp: new Date().toISOString(), verdict, street, facing });
    }

    // /profile hand record (full hand buffered by the drill loop, one push
    // per hand at settle — never partial, never blocks the turn).
    function logHandResult(hand) {
        if (!hand || typeof hand !== 'object') return;
        hands.value.push({ ...hand });
        if (hands.value.length > 2000) hands.value = hands.value.slice(-2000);
    }

    function endSession() {
        const summary = {
            date: new Date().toISOString(),
            ...calculateMetrics(),
            profile: computeMetrics(hands.value),
        };
        sessionHistory.value.push(summary);
        saveStats();
    }

    function calculateMetrics() {
        const s = stats.value;
        const total = s.totalHands || 1;
        
        return {
            vpip: ((s.vpipHands / total) * 100).toFixed(1),
            pfr: ((s.pfrHands / total) * 100).toFixed(1),
            aggro: s.totalCalls === 0 ? (s.totalBets + s.totalRaises).toFixed(1) : ((s.totalBets + s.totalRaises) / s.totalCalls).toFixed(2),
            bluffPct: (s.totalBets + s.totalRaises) === 0 ? '0.0' : (((s.bluffBets + s.bluffRaises) / (s.totalBets + s.totalRaises)) * 100).toFixed(1),
            foldToCbet: s.facedCbet === 0 ? '0.0' : ((s.foldsToCbet / s.facedCbet) * 100).toFixed(1),
            foldToRiver: s.facedRiverBet === 0 ? '0.0' : ((s.foldsToRiver / s.facedRiverBet) * 100).toFixed(1),
        };
    }

    return {
        stats,
        sessionHistory,
        hands,
        logHand,
        logHandResult,
        logPredict,
        logEvFeedback,
        calculateMetrics,
        endSession
    };
}
