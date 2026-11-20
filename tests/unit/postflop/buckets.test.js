import { describe, it, expect } from 'vitest';
import { redistributeRange, BUCKETS } from '../../../src/engine/buckets';
import { calculateRangeFromPercentage } from '../../../src/composables/useRangeGame.js';

describe('redistributeRange', () => {
  const mockBoard = [
    { rank: 'K', suit: 'h' },
    { rank: '7', suit: 'd' },
    { rank: '2', suit: 's' },
  ];

  it('should move AA to Bucket B (Overpair) on K-7-2 board', () => {
    const range = new Set(['AA']);
    const buckets = redistributeRange(range, mockBoard);
    expect(buckets[BUCKETS.B].has('AA')).toBe(true);
  });

  it('should move KK to Bucket A (Set) on K-7-2 board', () => {
    const range = new Set(['KK']);
    const buckets = redistributeRange(range, mockBoard);
    expect(buckets[BUCKETS.A].has('KK')).toBe(true);
  });

  it('should move 77 to Bucket A (Set) on K-7-2 board', () => {
    const range = new Set(['77']);
    const buckets = redistributeRange(range, mockBoard);
    expect(buckets[BUCKETS.A].has('77')).toBe(true);
  });

  it('should move AKs to Bucket B (Top Pair) on K-7-2 board', () => {
    const range = new Set(['AKs']);
    const buckets = redistributeRange(range, mockBoard);
    expect(buckets[BUCKETS.B].has('AKs')).toBe(true);
  });

  it('should move 22 to Bucket A (Set) on K-7-2 board', () => {
    const range = new Set(['22']);
    const buckets = redistributeRange(range, mockBoard);
    expect(buckets[BUCKETS.A].has('22')).toBe(true);
  });

  it('should move JTs to Bucket D (Air) on K-7-2 board', () => {
    const range = new Set(['JTs']);
    const buckets = redistributeRange(range, mockBoard);
    expect(buckets[BUCKETS.D].has('JTs')).toBe(true);
  });

  it('should move 88 to Bucket C (Pair) on K-7-2 board', () => {
    const range = new Set(['88']);
    const buckets = redistributeRange(range, mockBoard);
    expect(buckets[BUCKETS.C].has('88')).toBe(true);
  });

  it('should redistribute a full percentage-based range', () => {
    const range = calculateRangeFromPercentage(0.10); // Tight range
    const buckets = redistributeRange(range, mockBoard);
    
    const totalHands = range.size;
    const bucketedHands = 
      buckets[BUCKETS.A].size + 
      buckets[BUCKETS.B].size + 
      buckets[BUCKETS.C].size + 
      buckets[BUCKETS.D].size;
      
    expect(bucketedHands).toBe(totalHands);
  });
});
