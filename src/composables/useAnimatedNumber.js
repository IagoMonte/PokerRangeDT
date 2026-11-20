import { ref, onUnmounted, getCurrentInstance } from 'vue';
import { VFX, prefersReducedMotion } from '../vfx.js';

// Animated pot number: displayed eases toward target over VFX.dur.countUp.
// set(n, instant=true) jumps straight (used when villains act instantly).
// Scheduler injectable so tests can drive the clock by hand.
export function useAnimatedNumber(scheduler = {}) {
    const {
        now = () => (typeof performance !== 'undefined' ? performance.now() : 0),
        frame = (cb) => (typeof requestAnimationFrame === 'function'
            ? requestAnimationFrame(cb)
            : setTimeout(() => cb(now()), 16)),
        cancel = (id) => (typeof cancelAnimationFrame === 'function'
            ? cancelAnimationFrame(id)
            : clearTimeout(id)),
    } = scheduler;

    const displayed = ref(0);
    let raf = null;
    let from = 0;
    let target = 0;
    let start = 0;

    const step = (t) => {
        const k = Math.min(1, (t - start) / VFX.dur.countUp);
        const eased = 1 - Math.pow(1 - k, 3); // ease-out cubic
        displayed.value = from + (target - from) * eased;
        raf = k < 1 ? frame(step) : null;
    };

    function set(n, instant = false) {
        if (raf !== null) { cancel(raf); raf = null; }
        target = n;
        if (instant || prefersReducedMotion() || VFX.dur.countUp <= 0) {
            from = n;
            displayed.value = n;
            return;
        }
        from = displayed.value;
        start = now();
        raf = frame(step);
    }

    // No-op outside component setup (unit tests): guard the warning away.
    if (getCurrentInstance()) onUnmounted(() => { if (raf !== null) cancel(raf); });

    return { displayed, set };
}
