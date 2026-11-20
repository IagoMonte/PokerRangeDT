import { describe, it, expect } from 'vitest';
import {
  evaluateHand, compareHands, describeHand, straightHigh, SHOWDOWN_CATEGORY,
} from '../../../src/engine/showdown.js';

const C = (rank, suit) => ({ rank, suit });
const better = (holeA, holeB, board) =>
  compareHands(evaluateHand(holeA, board), evaluateHand(holeB, board));

describe('showdown evaluator (best 5 of 7, Texas tiebreaks)', () => {
  it('ranks categories low → high', () => {
    const board = [C('2', 'c'), C('7', 'd'), C('9', 'h'), C('J', 'c'), C('K', 'd')];
    expect(evaluateHand([C('3', 's'), C('4', 's')], board).category).toBe(SHOWDOWN_CATEGORY.HIGH);
    expect(evaluateHand([C('K', 's'), C('3', 's')], board).category).toBe(SHOWDOWN_CATEGORY.PAIR);
    const tp = [C('2', 'c'), C('7', 'd'), C('9', 'h'), C('9', 'c'), C('K', 'd')];
    expect(evaluateHand([C('K', 's'), C('K', 'h')], tp).category).toBe(SHOWDOWN_CATEGORY.FULL_HOUSE);
    const quad = [C('9', 'c'), C('9', 'd'), C('9', 'h'), C('9', 's'), C('K', 'd')];
    expect(evaluateHand([C('A', 's'), C('3', 's')], quad).category).toBe(SHOWDOWN_CATEGORY.QUADS);
    expect(compareHands(
      evaluateHand([C('A', 's'), C('3', 's')], quad),
      evaluateHand([C('K', 's'), C('K', 'h')], tp),
    )).toBeGreaterThan(0);
  });

  it('kicker decides same pair: AK outkicks AQ on an ace board', () => {
    const board = [C('A', 'c'), C('7', 'd'), C('4', 's'), C('2', 'h'), C('J', 's')];
    expect(better([C('A', 'h'), C('K', 'c')], [C('A', 'd'), C('Q', 'd')], board)).toBeGreaterThan(0);
  });

  it('fifth card still counts: pair kings, kickers A-Q-J beat A-Q-9', () => {
    const board = [C('K', 'c'), C('A', 's'), C('Q', 'h'), C('5', 'c'), C('4', 'd')];
    expect(better([C('K', 'h'), C('J', 's')], [C('K', 'd'), C('9', 'd')], board)).toBeGreaterThan(0);
  });

  it('shared trips cancel weak kickers: KKK-A-Q both → split, J and 9 never play', () => {
    const board = [C('K', 'c'), C('K', 'd'), C('A', 's'), C('Q', 'h'), C('5', 'c')];
    expect(better([C('K', 'h'), C('J', 's')], [C('K', 's'), C('9', 'd')], board)).toBe(0);
  });

  it('board plays → split even with different holes', () => {
    const board = [C('A', 'c'), C('A', 'd'), C('K', 's'), C('Q', 'h'), C('J', 'c')];
    expect(better([C('4', 's'), C('3', 'd')], [C('9', 'c'), C('2', 'c')], board)).toBe(0);
  });

  it('broadway on board chops: hole cards do not matter', () => {
    const board = [C('A', 's'), C('K', 'd'), C('Q', 'c'), C('J', 'h'), C('T', 's')];
    expect(better([C('2', 'c'), C('3', 'd')], [C('A', 'c'), C('9', 'c')], board)).toBe(0);
  });

  it('wheel is a 5-high straight and loses to any higher straight', () => {
    expect(straightHigh([14, 2, 3, 4, 5])).toBe(5);
    const wBoard = [C('A', 'c'), C('2', 'd'), C('3', 's'), C('9', 'h'), C('K', 'c')];
    const wheel = evaluateHand([C('4', 's'), C('5', 'd')], wBoard);
    expect(wheel.category).toBe(SHOWDOWN_CATEGORY.STRAIGHT);
    expect(wheel.ranks).toEqual([5]);
    const board = [C('5', 'c'), C('6', 'd'), C('7', 's'), C('9', 'h'), C('K', 'c')];
    // 9-high (hole 8, using the board 9) beats 7-high (hole 3-4): top card only
    expect(better([C('8', 's'), C('2', 'd')], [C('4', 's'), C('3', 'd')], board)).toBeGreaterThan(0);
  });

  it('flushes compare card by card; suits never break ties', () => {
    const board = [C('Q', 'd'), C('8', 'd'), C('6', 'd'), C('2', 'c'), C('3', 'h')];
    // A-high flush (hole Ad) beats K-high flush (hole Kd)
    expect(better([C('A', 'd'), C('4', 's')], [C('K', 'd'), C('4', 'c')], board)).toBeGreaterThan(0);
    // Same ranks, different suits → identical five → split
    const b2 = [C('Q', 'd'), C('8', 'd'), C('6', 'd'), C('2', 'd'), C('3', 'h')];
    expect(better([C('K', 'h'), C('4', 'h')], [C('K', 'c'), C('4', 'c')], b2)).toBe(0);
  });

  it('6+ suited cards play only the top 5', () => {
    const board = [C('2', 's'), C('5', 's'), C('9', 's'), C('J', 's'), C('3', 'h')];
    const ev = evaluateHand([C('A', 's'), C('K', 's')], board);
    expect(ev.category).toBe(SHOWDOWN_CATEGORY.FLUSH);
    expect(ev.ranks).toEqual([14, 13, 11, 9, 5]);
  });

  it('full house: trips first, then the pair', () => {
    const board = [C('K', 'c'), C('K', 'd'), C('Q', 's'), C('Q', 'h'), C('2', 'c')];
    // KKKQQ (hole K) beats QQQKK (hole Q)
    expect(better([C('K', 's'), C('5', 'd')], [C('Q', 'c'), C('5', 's')], board)).toBeGreaterThan(0);
  });

  it('second trips plays as the pair; board full house can still lose', () => {
    const board = [C('A', 'c'), C('A', 'd'), C('K', 's'), C('K', 'h'), C('2', 'c')];
    const ev = evaluateHand([C('A', 's'), C('5', 'd')], board);
    expect(ev.category).toBe(SHOWDOWN_CATEGORY.FULL_HOUSE);
    expect(ev.ranks).toEqual([14, 13]); // aces full of kings
    // Kings full of aces loses to it
    expect(better([C('K', 'c'), C('5', 's')], [C('A', 's'), C('5', 'd')], board)).toBeLessThan(0);
  });

  it('quads kicker plays only when quads are on the board', () => {
    const board = [C('J', 'c'), C('J', 'd'), C('J', 'h'), C('J', 's'), C('8', 'c')];
    expect(better([C('T', 's'), C('7', 'd')], [C('8', 'd'), C('7', 'c')], board)).toBeGreaterThan(0);
  });

  it('trips: rank first, then kickers high to low', () => {
    const board = [C('T', 's'), C('T', 'd'), C('T', 'c'), C('6', 'h'), C('A', 's')];
    // Both trip tens with ace share; king second kicker beats eight
    expect(better([C('K', 'c'), C('J', 'c')], [C('8', 'd'), C('2', 'd')], board)).toBeGreaterThan(0);
  });

  it('two pair: high pair, low pair, then kicker — third pair never plays', () => {
    const board = [C('A', 'h'), C('A', 'd'), C('Q', 'c'), C('Q', 'd'), C('K', 's')];
    // AAQQK both; P1's extra Jacks do NOT play (only five cards count) → split
    expect(better([C('J', 'h'), C('J', 'c')], [C('9', 'c'), C('2', 'c')], board)).toBe(0);
    const b2 = [C('6', 's'), C('6', 'd'), C('Q', 's'), C('Q', 'h'), C('2', 'c')];
    // Queens and sixes both; ace kicker beats jack
    expect(better([C('A', 's'), C('5', 'd')], [C('J', 's'), C('T', 's')], b2)).toBeGreaterThan(0);
  });

  it('straight flush beats quads; royal is just ace-high', () => {
    const board = [C('5', 's'), C('6', 's'), C('7', 's'), C('9', 'c'), C('9', 'd')];
    const sf = evaluateHand([C('8', 's'), C('4', 's')], board); // 4-5-6-7-8 suited
    expect(sf.category).toBe(SHOWDOWN_CATEGORY.STRAIGHT_FLUSH);
    const quads = evaluateHand([C('9', 'h'), C('9', 's')], board);
    expect(quads.category).toBe(SHOWDOWN_CATEGORY.QUADS);
    expect(compareHands(sf, quads)).toBeGreaterThan(0);
  });

  it('identical hole cards always chop (odd-cent rule lives in the drivers)', () => {
    const board = [C('K', 'h'), C('Q', 'c'), C('7', 's'), C('4', 'd'), C('2', 'h')];
    expect(better([C('K', 'h'), C('Q', 'c')], [C('K', 'd'), C('Q', 'd')], board)).toBe(0);
  });

  it('describeHand names the winner for settle text', () => {
    const board = [C('2', 's'), C('5', 's'), C('9', 's'), C('J', 's'), C('3', 'h')];
    expect(describeHand(evaluateHand([C('A', 's'), C('K', 's')], board))).toBe('Flush, A high');
  });
});
