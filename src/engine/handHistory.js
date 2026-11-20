// Hand history em PokerStars puro: texto que GTO Wizard e trackers aceitam
// no upload ("Please use currently supported formats and sites" rejeita
// qualquer outro formato). Seções obrigatórias: header com keyword
// PokerStars, HOLE CARDS, ruas, SHOW DOWN e SUMMARY (Total pot + Board +
// linhas por seat). Puro e defensivo — registro antigo (sem `lines`)
// retorna null; a UI mostra a linha-resumo nesses casos.
// DECISÃO DE COMPAT (20/09): keyword "PokerStars" + sufixo USD + "ET" são
// o que o parser usa p/ detectar o site — sem eles o upload é rejeitado.
// CONFORMIDADE (26/09): byte a byte com sample real que abre nos solvers —
// stack sempre 2 casas ($100.00) e SEM nome da mão entre parênteses (shows,
// collected e summary saem limpos); travado pelo teste `sample-9max`.
import { boardToDealer } from '../infra/format.js';

// Dealer "A♥" → "Ah". Engine {rank,suit} já sai solver ("Ks") e não passa aqui.
export function dealerToSolver(card) {    if (typeof card !== 'string' || card.length < 2) return '?';
    return `${card.slice(0, -1)}${SUIT[card.slice(-1)] || '?'}`;
}
const SUIT = { '♥': 'h', '♠': 's', '♣': 'c', '♦': 'd', h: 'h', s: 's', c: 'c', d: 'd' };

// PS sempre 2 casas em ação/pote/stack ($100.00): o sample que abre nos
// solvers traz stack com decimais — inteiro limpo quebrava o parse.
const usd = (n) => `$${(Number(n) || 0).toFixed(2)}`;
// MTT: fichas sem $ (inteiro limpo, quebrado 2 casas se preciso).
const chips = (n) => {
    const v = Number(n) || 0;
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
};

function nameOf(h, seat) {
    const s = (h.seats || []).find((x) => x.seat === seat);
    return s?.name || `Seat ${seat + 1}`;
}

// Anotação de posição do SUMMARY: (button) (small blind) (big blind).
function posOf(h, seat) {
    const btn = (h.seats || []).find((s) => s.role === 'BUTTON');
    let pos = '';
    if (btn && btn.seat === seat) pos += ' (button)';
    if (h.blinds) {
        if (h.blinds.sbSeat === seat) pos += ' (small blind)';
        if (h.blinds.bbSeat === seat) pos += ' (big blind)';
    }
    return pos;
}

// "2026-09-20T21:15:01.791Z" → "2026/09/20 21:15:01 ET" (shape que o parser exige).
function psDate(iso) {
    if (typeof iso !== 'string' || iso.length < 19) return '2000/01/01 00:00:00 ET';
    return `${iso.slice(0, 10).replaceAll('-', '/')} ${iso.slice(11, 19)} ET`;
}

// Uma rua de ações → linhas, rastreando a aposta corrente
// (size do motor é raise-to; call é o to-call; sem size não há linha).
// `m` formata dinheiro (usd no cash, chips no MTT).
function streetLines(h, actions, openBet = 0, m = usd) {
    let bet = openBet;
    const out = [];
    for (const [seat, token, size] of actions || []) {
        const name = nameOf(h, seat);
        const amt = Number(size) || 0;
        if (token === 'FOLD') out.push(`${name}: folds`);
        else if (token === 'CHECK') out.push(`${name}: checks`);
        else if (token === 'ALL-IN') {
            if (amt > bet) {
                out.push(`${name}: ${bet > 0 ? `raises ${m(amt - bet)} to ${m(amt)}` : `bets ${m(amt)}`} and is all-in`);
                bet = amt;
            } else if (amt > 0) out.push(`${name}: calls ${m(amt)} and is all-in`);
            else out.push(`${name}: is all-in`);
        } else if (token === 'LIMP' || token === 'CALL') {
            if (amt > 0) out.push(`${name}: calls ${m(amt)}`);
            else out.push(`${name}: checks`);
        } else if (amt > bet) { // OR / 3B / 4B / RAISE (raise-to)
            out.push(`${name}: ${bet > 0 ? `raises ${m(amt - bet)} to ${m(amt)}` : `bets ${m(amt)}`}`);
            bet = amt;
        } else if (amt > 0) out.push(`${name}: calls ${m(amt)}`);
    }
    return out;
}

// Última ação de cada seat (p/ as linhas do SUMMARY).
function lastActions(h) {
    const last = new Map();
    for (const s of ['preflop', 'flop', 'turn', 'river']) {
        for (const [seat, token] of h.lines?.[s] || []) last.set(seat, { street: s, token });
    }
    return last;
}

const FOLD_STREET = { preflop: 'folded before Flop (didn\'t bet)', flop: 'folded on the Flop', turn: 'folded on the Turn', river: 'folded on the River' };

function summaryLines(h, winners, m = usd) {
    const out = [];
    const shown = new Set(Object.keys(h.shownCards || {}).map(Number));
    const last = lastActions(h);
    const isSd = winners.length > 0 && shown.size > 0;
    for (const s of h.seats || []) {
        const head = `Seat ${s.seat + 1}: ${s.name || 'Seat ' + (s.seat + 1)}${posOf(h, s.seat)}`;
        if (winners.includes(s.seat) && shown.has(s.seat)) {
            const cards = (h.shownCards[s.seat] || []).map(dealerToSolver).join(' ');
            const share = winners.length === 1 ? m(h.result?.pot ?? 0) : m((h.result?.pot ?? 0) / winners.length);
            out.push(`${head} showed [${cards}] and won (${share})`);
        } else if (!isSd && winners.length === 1 && winners.includes(s.seat)) {
            out.push(`${head} collected (${m(h.result?.pot ?? 0)})`);
        } else if (shown.has(s.seat)) {
            const cards = (h.shownCards[s.seat] || []).map(dealerToSolver).join(' ');
            out.push(`${head} showed [${cards}]`);
        } else {
            const la = last.get(s.seat);
            if (la && la.token === 'FOLD') out.push(`${head} ${FOLD_STREET[la.street]}`);
            else if (la) out.push(`${head} mucked`);
            else out.push(`${head} folded before Flop (didn't bet)`);
        }
    }
    return out;
}

// Runout preenche o board sem emitir eventos de street: all-in pré-flop
// corre 5 cartas de uma vez e o pós-flop sem aposta possível pula as
// ruas — nos dois casos o board vivo do log fica vazio/parcial. Sem sync
// o solver recebe showdown sem Board (ou com Board parcial) e rejeita o
// upload. Só showdown sincroniza: mão seca (pré-only, everyone-folded)
// mantém o board vivo. Pura (muta o log, como o drill loop já faz).
export function syncHistoryBoard(handLog, res) {
    if (!handLog || !res || typeof res !== 'object') return handLog;
    const showdown = ['allin-runout', 'postflop-showdown', 'postflop-runout'].includes(res.reason);
    if (!showdown || !Array.isArray(res.board)) return handLog;
    const cur = Array.isArray(handLog.board) ? handLog.board : [];
    if (res.board.length <= cur.length) return handLog;
    handLog.board = res.board.map((c) => (typeof c === 'string' ? c : boardToDealer(c)));
    return handLog;
}

// Núcleo compartilhado cash/MTT: mesmo texto, só muda dinheiro + header.
// Cash = formato site (USD, GTOW detecta pelo texto); MTT = torneio sem $
// (GTOW tem solução MTT 9-max; cash 9-max não existe e é rejeitado).
function buildHistory(h, kind) {
    const m = kind === 'mtt' ? chips : usd;
    if (!h || typeof h !== 'object') return null;
    const lines = h.lines || {};
    const seq = ['preflop', 'flop', 'turn', 'river'];
    if (!seq.some((s) => Array.isArray(lines[s]) && lines[s].length > 0)) return null;

    const L = [];
    const n = (h.seats || []).length || 9;
    if (kind === 'mtt') {
        // Buy-in fixo testado (parser exige o campo; fichas são play);
        // tournament # = handNo (estável e único p/ dedup).
        const tid = h.handNo ?? '?';
        L.push(`PokerStars Hand #${tid}: Tournament #${tid}, $10+$1 USD Hold'em No Limit - Level I (${m(h.sb ?? 0)}/${m(h.bb ?? 0)}) - ${psDate(h.date)}`);
    } else {
        L.push(`PokerStars Hand #${h.handNo ?? '?'}: Hold'em No Limit (${m(h.sb ?? 0)}/${m(h.bb ?? 0)} USD) - ${psDate(h.date)}`);
    }
    const btn = (h.seats || []).find((s) => s.role === 'BUTTON');
    L.push(`Table '${h.drill || 'drill'}' ${n}-max${btn ? ` Seat #${btn.seat + 1} is the button` : ''}`);
    for (const s of h.seats || []) {
        L.push(`Seat ${s.seat + 1}: ${s.name || 'Seat ' + (s.seat + 1)} (${m(s.stack ?? 0)} in chips)`);
    }
    let openBet = 0;
    if (h.blinds && h.blinds.sbSeat != null && h.blinds.bbSeat != null) {
        L.push(`${nameOf(h, h.blinds.sbSeat)}: posts small blind ${m(h.sb ?? 0)}`);
        L.push(`${nameOf(h, h.blinds.bbSeat)}: posts big blind ${m(h.bb ?? 0)}`);
        openBet = Number(h.bb) || 0;
    }
    L.push('*** HOLE CARDS ***');
    if (Array.isArray(h.heroCards) && h.heroCards.length > 0) {
        L.push(`Dealt to ${nameOf(h, h.heroSeat ?? 0)} [${h.heroCards.map(dealerToSolver).join(' ')}]`);
    }
    L.push(...streetLines(h, lines.preflop, openBet, m));

    const board = (h.board || []).map(dealerToSolver);
    const streets = [['flop', 3], ['turn', 4], ['river', 5]];
    for (const [name, upto] of streets) {
        if (board.length < upto && !(lines[name] || []).length) continue;
        const shown = board.slice(0, upto);
        L.push(name === 'flop'
            ? `*** FLOP *** [${shown.join(' ')}]`
            : `*** ${name.toUpperCase()} *** [${board.slice(0, upto - 1).join(' ')}] [${shown[upto - 1] || '?'}]`);
        L.push(...streetLines(h, lines[name], 0, m));
    }

    const winners = Array.isArray(h.winners) ? h.winners : [];
    const shown = h.shownCards || {};
    if (winners.length > 0 && Object.keys(shown).length > 0) {
        L.push('*** SHOW DOWN ***');
        for (const [seat, cards] of Object.entries(shown)) {
            L.push(`${nameOf(h, Number(seat))}: shows [${(cards || []).map(dealerToSolver).join(' ')}]`);
        }
    }
    if (winners.length === 1) {
        L.push(`${nameOf(h, winners[0])} collected ${m(h.result?.pot ?? 0)} from pot`);
    } else if (winners.length > 1) {
        L.push(`${winners.map((s) => nameOf(h, s)).join(' + ')} split ${m(h.result?.pot ?? 0)} from pot`);
    }

    L.push('*** SUMMARY ***');
    L.push(`Total pot ${m(h.result?.pot ?? 0)} | Rake ${kind === 'mtt' ? '0' : '$0'}`);
    if (board.length > 0) L.push(`Board [${board.join(' ')}]`);
    L.push(...summaryLines(h, winners, m));
    return L.join('\n');
}

export function formatHandHistory(h) {
    return buildHistory(h, 'cash');
}

export function formatHandMTT(h) {
    return buildHistory(h, 'mtt');
}
