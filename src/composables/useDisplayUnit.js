import { ref } from 'vue';
import { fmtChips } from '../infra/format';

// Display unit for every money value on screen: raw chips ("2000") or big
// blinds ("100bb"). Engine math never changes — formatting is the last step
// before the template. Persisted: survives reloads.
const KEY = 'poker_display_unit';

function load() {
    if (typeof localStorage === 'undefined') return 'chips';
    return localStorage.getItem(KEY) === 'bb' ? 'bb' : 'chips';
}

export const displayUnit = ref(load());

export function setDisplayUnit(u) {
    displayUnit.value = u === 'bb' ? 'bb' : 'chips';
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, displayUnit.value);
}

// Unified money display. Needs the big blind for bb mode; without a usable
// bb it falls back to chips (never blank, never NaN).
export function fmtMoney(n, bb) {
    if (
        displayUnit.value === 'bb'
        && typeof n === 'number' && Number.isFinite(n)
        && typeof bb === 'number' && bb > 0
    ) {
        return `${+((n / bb).toFixed(2))}bb`;
    }
    return fmtChips(n);
}

export function useDisplayUnit() {
    return { displayUnit, setDisplayUnit, fmtMoney };
}
