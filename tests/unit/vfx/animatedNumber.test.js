import { describe, it, expect } from 'vitest';
import { useAnimatedNumber } from '../../../src/composables/useAnimatedNumber.js';
import { VFX } from '../../../src/vfx.js';

// Manual clock: tests drive frames by hand, no rAF needed.
function manualClock() {
    let t = 0;
    const queue = new Map();
    let next = 1;
    return {
        now: () => t,
        frame: (cb) => { const id = next++; queue.set(id, cb); return id; },
        cancel: (id) => { queue.delete(id); },
        advance(ms) {
            t += ms;
            const cbs = [...queue.values()];
            queue.clear();
            cbs.forEach(cb => cb(t));
        },
        pending: () => queue.size,
    };
}

describe('useAnimatedNumber', () => {
    it('instant set jumps straight to target', () => {
        const clock = manualClock();
        const { displayed, set } = useAnimatedNumber(clock);
        set(230, true);
        expect(displayed.value).toBe(230);
        expect(clock.pending()).toBe(0);
    });

    it('animated set eases 0 → target over VFX.dur.countUp', () => {
        const clock = manualClock();
        const { displayed, set } = useAnimatedNumber(clock);
        set(100);
        clock.advance(VFX.dur.countUp / 2);
        const easedHalf = 100 * (1 - Math.pow(1 - 0.5, 3)); // ease-out cubic
        expect(displayed.value).toBeCloseTo(easedHalf, 9);
        clock.advance(VFX.dur.countUp / 2);
        expect(displayed.value).toBe(100);
        expect(clock.pending()).toBe(0); // settled, no orphan frames
    });

    it('a new target mid-flight restarts from the current display', () => {
        const clock = manualClock();
        const { displayed, set } = useAnimatedNumber(clock);
        set(100);
        clock.advance(VFX.dur.countUp / 2);
        const mid = displayed.value;
        expect(clock.pending()).toBe(1);
        set(200); // retarget: old frame cancelled, one fresh frame
        expect(clock.pending()).toBe(1);
        clock.advance(VFX.dur.countUp);
        expect(displayed.value).toBe(200);
        expect(mid).toBeGreaterThan(0);
        expect(mid).toBeLessThan(200);
    });
});
