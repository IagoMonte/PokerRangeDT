import { describe, it, expect, vi } from 'vitest';
import { usePokerGame } from '../../../src/composables/usePokerGame';

describe('usePokerGame startRound', () => {
    const createPlayers = () => Array.from({ length: 9 }, (_, i) => ({ 
        name: `Player ${i}`, 
        role: '', 
        hero: false, 
        cards: [] 
    }));

    it('should assign roles and deal cards to all players', () => {
        const { startRound } = usePokerGame();
        
        vi.spyOn(Math, 'random').mockReturnValue(0.1);
        vi.spyOn(console, 'log').mockImplementation(() => {});

        const players = createPlayers();
        startRound(players);

        const roles = players.map(p => p.role).filter(r => r !== '');
        expect(roles.length).toBe(9);
        
        players.forEach(p => {
            expect(p.cards.length).toBe(2);
        });

        vi.restoreAllMocks();
    });
});
