import { describe, it, expect } from 'vitest';
import {
    createTable, postBlinds, toCall, minRaiseTo, facing,
    applyFold, applyCall, applyLimp, applyRaiseTo, applyAllIn,
    isBettingClosed, refundUnmatched, collectPots, awardPot, liveSeats, quantize,
} from '../../../src/engine/table';

function nineHanded() {
    const t = createTable({ numSeats: 9, stackChips: 2000, sb: 10, bb: 20 });
    postBlinds(t, 7, 8); // SB seat 7, BB seat 8 → UTG seat 0 acts
    return t;
}

describe('table blinds + order', () => {
    it('posts blinds, sets current bet, starts at UTG', () => {
        const t = nineHanded();
        expect(t.seats[7].committed).toBe(10);
        expect(t.seats[8].committed).toBe(20);
        expect(t.currentBet).toBe(20);
        expect(t.actor).toBe(0);
        expect(facing(t)).toBe('none');
        expect(toCall(t, 0)).toBe(20);
    });
});

describe('table calls + raises', () => {
    it('call matches, min-raise enforced, aggression levels climb', () => {
        const t = nineHanded();
        applyCall(t, 0);
        expect(t.seats[0].committed).toBe(20);
        expect(() => applyRaiseTo(t, 1, 30)).toThrow(/below min/);
        applyRaiseTo(t, 1, 60); // OR 60 (min was 40)
        expect(t.currentBet).toBe(60);
        expect(t.aggression.level).toBe('OR');
        expect(facing(t)).toBe('open');
        expect(t.seats[0].acted).toBe(false); // action reopens
        applyRaiseTo(t, 2, 180); // 3B
        expect(t.aggression.level).toBe('3B');
        expect(facing(t)).toBe('3b');
        expect(minRaiseTo(t)).toBe(180 + 120);
    });

    it('short all-in calls capped by stack and never reopens', () => {
        const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
        t.seats[2].stack = 50;
        postBlinds(t, 0, 1);
        applyRaiseTo(t, 0, 200); // SB raises to 200 total
        applyCall(t, 2); // 50 all-in, short of 200
        expect(t.seats[2].allIn).toBe(true);
        expect(t.seats[2].committed).toBe(50);
        expect(t.currentBet).toBe(200);
        expect(t.aggression.level).toBe('OR');
    });

    it('betting closes when all live matched and acted', () => {
        const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
        postBlinds(t, 0, 1); // actor = seat 2 (button-ish)
        expect(isBettingClosed(t)).toBe(false);
        applyCall(t, 2);
        applyCall(t, 0); // SB completes
        expect(isBettingClosed(t)).toBe(false); // BB still to act (option)
        applyFold(t, 1); // BB checks? no — fold for the test... use call instead below
        expect(isBettingClosed(t)).toBe(true);
    });
});

describe('table limp (dry BB call, no aggression)', () => {
    it('SB completes and BB checks through with zero chips', () => {
        const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
        postBlinds(t, 0, 1);
        applyLimp(t, 2); // UTG open-limps
        expect(t.seats[2].committed).toBe(20);
        expect(t.aggression).toBeNull();
        expect(facing(t)).toBe('none');
        applyLimp(t, 0); // SB completes (10 more)
        expect(t.seats[0].committed).toBe(20);
        applyLimp(t, 1); // BB checks, commits nothing
        expect(t.seats[1].committed).toBe(20);
        expect(isBettingClosed(t)).toBe(true);
    });

    it('rejects limp facing any aggression or a grown pot', () => {
        const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
        postBlinds(t, 0, 1);
        applyRaiseTo(t, 2, 60);
        expect(() => applyLimp(t, 0)).toThrow(/dry BB call/);
    });
});

describe('table pots', () => {
    it('refunds unmatched excess', () => {
        const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
        postBlinds(t, 0, 1);
        applyRaiseTo(t, 2, 200);
        applyFold(t, 0);
        applyFold(t, 1);
        refundUnmatched(t);
        expect(t.seats[2].committed).toBe(20); // only BB matched
        expect(t.seats[2].stack).toBe(2000 - 20);
    });

    it('single pot when everybody matched the shove', () => {
        const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
        t.seats[0].stack = 100;
        postBlinds(t, 0, 1);
        applyCall(t, 2); // 20
        applyAllIn(t, 0); // SB shoves 100 total... committed 10+90
        applyCall(t, 1); // BB calls 100
        applyCall(t, 2); // +80 → 100
        refundUnmatched(t);
        const pots = collectPots(t);
        expect(pots.length).toBe(1);
        // main: 100 x 3 = 300, everybody eligible
        expect(pots[0].amount).toBe(300);
        expect(pots[0].eligible).toEqual([0, 1, 2]);
        awardPot(t, 0, pots, 1);
        expect(t.seats[1].stack).toBe(2000 - 100 + 300);
    });

    it('short stack builds a real side pot', () => {
        const t = createTable({ numSeats: 3, stackChips: 2000, sb: 10, bb: 20 });
        t.seats[0].stack = 60;
        postBlinds(t, 0, 1); // SB 10, BB 20
        applyCall(t, 2); // 20
        applyAllIn(t, 0); // SB total 60
        applyRaiseTo(t, 1, 200);
        applyCall(t, 2); // calls 200
        refundUnmatched(t);
        const pots = collectPots(t);
        expect(pots.length).toBe(2);
        expect(pots[0]).toEqual({ amount: 180, eligible: [0, 1, 2] }); // 60 x 3
        expect(pots[1]).toEqual({ amount: 280, eligible: [1, 2] }); // (200-60) x 2
        expect(liveSeats(t)).toEqual([0, 1, 2]);
    });
});

describe('money precision (cents)', () => {
    it('micro blinds stay cent-exact, no 0.1+0.2 dust', () => {
        const t = createTable({ numSeats: 2, stackChips: 50 * 0.2, sb: 0.1, bb: 0.2 });
        expect(t.seats[0].stack).toBe(10); // 50*0.2 = 10, not 10.0000000002
        postBlinds(t, 0, 1);
        expect(t.seats[0].committed).toBe(0.1);
        expect(t.seats[1].committed).toBe(0.2);
        expect(t.currentBet).toBe(0.2);
    });

    it('raise goals quantize so committed === currentBet always closes', () => {
        const t = createTable({ numSeats: 2, stackChips: 2000, sb: 10, bb: 20 });
        postBlinds(t, 0, 1);
        // pctToChips-style dust: 100 + 33% of a 30 pot
        applyRaiseTo(t, 0, 100 + (33 / 100) * 30);
        expect(t.currentBet).toBe(109.9);
        expect(t.seats[0].committed).toBe(109.9);
        applyCall(t, 1);
        expect(t.seats[1].committed).toBe(109.9);
        expect(isBettingClosed(t)).toBe(true);
    });

    it('quantize rounds float dust to cents', () => {
        expect(quantize(0.1 + 0.2)).toBe(0.3);
        expect(quantize(2.5 * 0.1)).toBe(0.25);
    });
});

// Um all-in 1 ficha acima da aposta deixava quem pagava com menos que o shove
// (e devolvia o excesso depois). Pagar é igualar a maior aposta da mesa.
describe('short all-in acima da aposta atual', () => {
    it('eleva a maior aposta sem alterar o min-raise, e quem já agiu precisa responder', () => {
        const t = createTable({ numSeats: 3, stackChips: 1000, sb: 10, bb: 20 });
        t.seats[2].stack = 110; // vai shovar 110 total: acima de 100, raise de 10 (< incremento 100)
        t.seats[0].committed = 100; t.seats[0].stack = 900; t.seats[0].acted = true;
        t.seats[1].committed = 100; t.seats[1].stack = 900; t.seats[1].acted = true;
        t.currentBet = 100;
        t.lastIncrement = 100;
        const res = applyAllIn(t, 2);
        expect(res.fullRaise).toBe(false);
        expect(t.currentBet).toBe(110);
        expect(t.lastIncrement).toBe(100);
        expect(toCall(t, 0)).toBe(10);
        expect(t.seats[0].acted).toBe(false);
        expect(isBettingClosed(t)).toBe(false);
        applyCall(t, 0);
        expect(t.seats[0].committed).toBe(110);
    });

    it('all-in menor que a aposta atual não mexe na aposta', () => {
        const t = createTable({ numSeats: 3, stackChips: 1000, sb: 10, bb: 20 });
        t.seats[2].stack = 50;
        t.seats[0].committed = 100; t.seats[0].stack = 900;
        t.currentBet = 100;
        applyAllIn(t, 2);
        expect(t.currentBet).toBe(100);
    });
});
