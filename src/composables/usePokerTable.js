import { ref } from 'vue';
import { usePokerGame } from './usePokerGame';
import { ActiveDrill } from './useDrillSettings';
import { useVillains } from './useVillains';
import { heroName } from './useHeroProfile';

const players = ref([
    {position:{x:  50,  y: 102  },  name: "VOCÊ",             balance: 500, ButtonPosition:{x: 50,  y: -100}, hero: true, role: '', cards: ["TD","DT"] },
    {position:{x:   4,  y: 81   },  ButtonPosition:{x: 115, y: 25},  hero:false },
    {position:{x:  -2,  y: 57   },  ButtonPosition:{x: 115, y: 30},  hero:false },
    {position:{x:  -2,  y: 33   },  ButtonPosition:{x: 115, y: 30},  hero:false },
    {position:{x:  19,  y: 7    },  ButtonPosition:{x: 100, y: 100}, hero:false },
    {position:{x:  77,  y: 7    },  ButtonPosition:{x: 0,   y: 100}, hero:false },
    {position:{x: 100,  y: 33   },  ButtonPosition:{x: -15, y: 30},  hero:false },
    {position:{x: 100,  y: 57   },  ButtonPosition:{x: -15, y: 30},  hero:false },
    {position:{x:  97,  y: 81   },  ButtonPosition:{x: -15, y: 25},  hero:false },
]);

export function usePokerTable() {
    const { prepareRound, countdown } = usePokerGame();
    const { villains } = useVillains();

    function init(onReady) {
        // Hero identity comes from /profile (default "VOCÊ").
        players.value[0] = { ...players.value[0], name: heroName.value };
        const shuffled = [...villains.value];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        for (let i = 0; i < shuffled.length; i++) {
            players.value[i + 1] = { ...players.value[i + 1], profile: shuffled[i] };
        }

        if (ActiveDrill.settings) {
            const stackBB = ActiveDrill.settings.stacks;
            const bb = ActiveDrill.settings.blinds[1];
            const balance = stackBB * bb;
            players.value.forEach(p => {
                p.balance = balance;
            });
        }

        prepareRound(players.value, onReady);
    }

    return {
        players,
        init,
        countdown
    };
}
