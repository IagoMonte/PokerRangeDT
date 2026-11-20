import { ref } from 'vue';
import { SUITS, RANKS } from '../constants/poker';
import { ALL_POSITIONS } from '../infra/positions';
import { rangeGame, Ranges } from './useRangeGame';
import { getHandLabel } from '../infra/handRankings';
import { usePersistence } from './usePersistence';
import { useVillains } from './useVillains';

const { getModRange,getRangePos } = rangeGame()
const { loadAll } = usePersistence()
const { villains } = useVillains()

const suits = SUITS;
const ranks = RANKS;
const deckBase = suits.flatMap(suit => ranks.map(rank => ({ suit, rank, card: rank + suit })));

const countdown = ref(0);

// HERO IS SEAT 0 (bottom, by the buttons) — always. Only roles randomize.

export function usePokerGame() {

    function setRandomRoles(players){
        const totalPlayers = players.length;
        const posBTN = Math.floor(Math.random() * totalPlayers);
        const posSB = (posBTN + 1) % totalPlayers;
        const posBB = (posBTN + 2) % totalPlayers;

        for (let i = 0; i < ALL_POSITIONS.length; i++) {
            const playerIdx = (posBB + 1 + i) % totalPlayers;
            if (players[playerIdx]) {
                players[playerIdx].role = ALL_POSITIONS[i];
            }
        }

    }


    function shuffleDeck() {
        const shuffled = [...deckBase];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    function dealCards(players){
        const totalPlayers = players.length;
        const posSB = players.findIndex(p => p.role === 'SMALL_BLIND');
        const shuffledDeck = shuffleDeck();
        let cardIndex = 0;

        for (let round = 0; round < 2; round++) {
            for (let i = 0; i < totalPlayers; i++) {
                const playerPos = (posSB + i) % totalPlayers;
                players[playerPos].cards.push(shuffledDeck[cardIndex].card);
                cardIndex++;
            }
        }
    }

    function startRound(players) {
        loadAll(Ranges, villains)
        players.forEach(p => {
            p.role = '';
            p.cards = [];
        });
        
        setRandomRoles(players)
        
        dealCards(players)

        countdown.value = 0;
    }

    // Countdown once per drill, then hand the game to the caller (drill loop).
    function prepareRound(players, onReady) {
        // Start countdown
        countdown.value = 3;
        const timer = setInterval(() => {
            countdown.value--;
            if (countdown.value <= 0) {
                clearInterval(timer);
                if (onReady) onReady();
            }
        }, 1000);
    }

    return {
        countdown,
        prepareRound,
        startRound
    };
}
