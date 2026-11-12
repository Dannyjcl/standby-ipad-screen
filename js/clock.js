/* ── Clock, date, countdowns ─────────────────────────────────── */

const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const DAY = 86400000;
const MAX_SHOWN = 4;
const DONE_GRACE = DAY;        // keep a finished countdown on screen for a day

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 'YYYY-MM-DDTHH:mm' in local time → Date (null if malformed). */
export function parseLocal(at) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(at || ''));
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    return isNaN(d) ? null : d;
}

export function renderClock(now, settings) {
    let h = now.getHours();
    let ampm = '';
    if (!settings.clock24h) { ampm = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; }
    $('#clock-hm').textContent = (settings.clock24h ? pad(h) : h) + ':' + pad(now.getMinutes());
    $('#clock-s').textContent = pad(now.getSeconds());
    $('#clock-ampm').textContent = ampm;
    $('#date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

/** "23d 4h", "4h 12m", "12m 30s" — two units, largest first. */
function remaining(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    const u = (v, l) => `${v}<small>${l}</small>`;
    if (d > 0) return u(d, 'd') + u(h, 'h');
    if (h > 0) return u(h, 'h') + u(pad(m), 'm');
    return u(m, 'm') + u(pad(sec), 's');
}

function whenText(date, now) {
    const sameYear = date.getFullYear() === now.getFullYear();
    const day = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
    const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${day} · ${time}`;
}

let lastHtml = '';

export function renderCountdowns(now, settings) {
    const items = settings.countdowns
        .map(c => ({ ...c, date: parseLocal(c.at) }))
        .filter(c => c.date && c.date - now > -DONE_GRACE)
        .sort((a, b) => a.date - b.date)
        .slice(0, MAX_SHOWN);

    const html = items.length ? items.map(c => {
        const ms = c.date - now;
        const done = ms <= 0;
        const soon = !done && ms < DAY;
        return `<li class="cd-item${done ? ' done' : ''}${soon ? ' soon' : ''}">
            <div style="min-width:0"><div class="cd-label">${esc(c.label)}</div><span class="cd-when">${whenText(c.date, now)}</span></div>
            <div class="cd-left">${done ? 'Now' : remaining(ms)}</div>
        </li>`;
    }).join('') : '<li class="cd-empty">No countdowns yet. Add one in ⚙ Settings.</li>';

    if (html !== lastHtml) { $('#cd-list').innerHTML = html; lastHtml = html; }
}

/** Countdowns that crossed zero between two ticks (for alerts). */
export function crossedCountdowns(prev, now, settings) {
    return settings.countdowns.filter(c => {
        const d = parseLocal(c.at);
        return d && d > prev && d <= now;
    });
}
