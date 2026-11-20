import { describe, it, expect } from 'vitest';
import { generateBoardCards, analyzeTexture, BOARD_TEXTURES } from '../../../src/engine/board.js';

describe('Board Mask & Texture', () => {
  describe('generateBoardCards', () => {
    it('should generate the correct number of cards', () => {
      const flop = generateBoardCards(3);
      expect(flop).toHaveLength(3);
      
      const turn = generateBoardCards(1);
      expect(turn).toHaveLength(1);
    });

    it('should not include excluded cards', () => {
      const excluded = [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 'h' }];
      const board = generateBoardCards(5, excluded);
      
      const containsExcluded = board.some(card => 
        excluded.some(ex => ex.rank === card.rank && ex.suit === card.suit)
      );
      expect(containsExcluded).toBe(false);
    });
  });

  describe('analyzeTexture', () => {
    it('should return WET for flush coordination (3 of same suit)', () => {
      const board = [
        { rank: 'A', suit: 's' },
        { rank: 'T', suit: 's' },
        { rank: '2', suit: 's' },
      ];
      expect(analyzeTexture(board)).toBe(BOARD_TEXTURES.WET);
    });

    it('should return WET for straight coordination (connected cards)', () => {
      const board = [
        { rank: '7', suit: 's' },
        { rank: '8', suit: 'h' },
        { rank: '9', suit: 'd' },
      ];
      expect(analyzeTexture(board)).toBe(BOARD_TEXTURES.WET);
    });

    it('should return WET for near-connected cards (gap of 1)', () => {
      const board = [
        { rank: '7', suit: 's' },
        { rank: '9', suit: 'h' },
        { rank: 'J', suit: 'd' },
      ];
      expect(analyzeTexture(board)).toBe(BOARD_TEXTURES.WET);
    });

    it('should return DRY for unconnected cards', () => {
      const board = [
        { rank: '2', suit: 's' },
        { rank: '7', suit: 'h' },
        { rank: 'Q', suit: 'd' },
      ];
      expect(analyzeTexture(board)).toBe(BOARD_TEXTURES.DRY);
    });

    it('should return DRY for boards with less than 3 cards', () => {
      const board = [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 'h' },
      ];
      expect(analyzeTexture(board)).toBe(BOARD_TEXTURES.DRY);
    });

    it('should handle Ace-low straights', () => {
      const board = [
        { rank: 'A', suit: 's' },
        { rank: '2', suit: 'h' },
        { rank: '3', suit: 'd' },
      ];
      expect(analyzeTexture(board)).toBe(BOARD_TEXTURES.WET);
    });
  });
});
