import { describe, it, expect } from 'vitest';
import { classifyHand, HAND_CLASSES } from '../../../src/engine/classifier';

describe('classifyHand', () => {
  const boardFlop = [
    { rank: '7', suit: 'd' },
    { rank: '2', suit: 'c' },
    { rank: '3', suit: 'h' },
  ];

  it('should identify a SET when hole cards are a pair and hit the board', () => {
    const hole = [{ rank: '7', suit: 's' }, { rank: '7', suit: 'h' }];
    expect(classifyHand(hole, boardFlop)).toBe(HAND_CLASSES.SET);
  });

  it('should identify TRIPS when one hole card hits a pair on board', () => {
    const boardTrips = [
      { rank: '7', suit: 'd' },
      { rank: '7', suit: 'c' },
      { rank: '3', suit: 'h' },
    ];
    const hole = [{ rank: '7', suit: 's' }, { rank: '2', suit: 'h' }];
    expect(classifyHand(hole, boardTrips)).toBe(HAND_CLASSES.TRIPS);
  });

  it('should identify TWO_PAIR', () => {
    const hole = [{ rank: '7', suit: 's' }, { rank: '2', suit: 'h' }];
    expect(classifyHand(hole, boardFlop)).toBe(HAND_CLASSES.TWO_PAIR);
  });

  it('should identify TOP_PAIR', () => {
    const hole = [{ rank: '7', suit: 's' }, { rank: 'K', suit: 'h' }];
    // Top board rank is 7. Pair is 7s.
    expect(classifyHand(hole, boardFlop)).toBe(HAND_CLASSES.TOP_PAIR);
  });

  it('should identify a FLUSH', () => {
    const boardFlush = [
      { rank: '2', suit: 's' },
      { rank: '3', suit: 's' },
      { rank: '4', suit: 's' },
    ];
    const hole = [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 's' }];
    expect(classifyHand(hole, boardFlush)).toBe(HAND_CLASSES.FLUSH);
  });

  it('should identify a STRAIGHT', () => {
    const boardStraight = [
      { rank: '4', suit: 's' },
      { rank: '5', suit: 'h' },
      { rank: '6', suit: 'd' },
    ];
    const hole = [{ rank: '3', suit: 'c' }, { rank: '2', suit: 'h' }];
    expect(classifyHand(hole, boardStraight)).toBe(HAND_CLASSES.STRAIGHT);
  });

  it('should identify AIR', () => {
    const hole = [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 'h' }];
    expect(classifyHand(hole, boardFlop)).toBe(HAND_CLASSES.AIR);
  });

  it('should identify a PAIR (not top pair)', () => {
    const boardMidPair = [
      { rank: 'A', suit: 's' },
      { rank: '2', suit: 'c' },
      { rank: '3', suit: 'h' },
    ];
    const hole = [{ rank: '3', suit: 's' }, { rank: 'K', suit: 'h' }];
    // Top board is A. Pair is 3.
    expect(classifyHand(hole, boardMidPair)).toBe(HAND_CLASSES.PAIR);
  });

  it('should handle Ace-low straight', () => {
    const board = [
      { rank: '2', suit: 's' },
      { rank: '3', suit: 'h' },
      { rank: '4', suit: 'd' },
    ];
    const hole = [{ rank: '5', suit: 'c' }, { rank: 'A', suit: 's' }];
    expect(classifyHand(hole, board)).toBe(HAND_CLASSES.STRAIGHT);
  });

  it('should identify a SET when the board is paired and hole cards match the pair', () => {
    // This is technically "Four of a Kind" or "Full House", but in this simplified model 
    // we map to the highest category. In a real app, these would be distinct.
    const board = [
      { rank: '7', suit: 'd' },
      { rank: '7', suit: 'c' },
      { rank: '2', suit: 'h' },
    ];
    const hole = [{ rank: '7', suit: 's' }, { rank: '7', suit: 'h' }];
    expect(classifyHand(hole, board)).toBe(HAND_CLASSES.SET);
  });

  it('should identify TWO_PAIR when one hole card matches one board card and another matches another', () => {
    const board = [
      { rank: 'J', suit: 'd' },
      { rank: 'T', suit: 'c' },
      { rank: '2', suit: 'h' },
    ];
    const hole = [{ rank: 'J', suit: 's' }, { rank: 'T', suit: 'h' }];
    expect(classifyHand(hole, board)).toBe(HAND_CLASSES.TWO_PAIR);
  });

  it('should identify AIR when no pairs or better are formed', () => {
    const board = [
      { rank: 'A', suit: 'd' },
      { rank: 'K', suit: 'c' },
      { rank: 'Q', suit: 'h' },
    ];
    const hole = [{ rank: '2', suit: 's' }, { rank: '3', suit: 'h' }];
    expect(classifyHand(hole, board)).toBe(HAND_CLASSES.AIR);
  });
});
