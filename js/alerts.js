/* ── Alerts: price levels + countdowns → banner + optional chime ── */

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = n => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: n >= 1000 ? 0 : 2 });

let audio = null;

/** iOS only lets audio start after a tap; call this from the first touch. */
export function unlockAudio() {
    if (audio) return;
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; }
}

function chime() {
    if (!audio) return;
    if (audio.state === 'suspended') audio.resume();
    const t = audio.currentTime;
    [880, 1318.5].forEach((f, i) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.18 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.9);
        o.connect(g).connect(audio.destination);
        o.start(t + i * 0.18); o.stop(t + i * 0.18 + 1);
    });
}

/** Banner at the top of the screen. tone: '' | 'up' | 'down'. */
export function toast(title, body, { tone = '', ms = 15000, sound = false } = {}) {
    const el = document.createElement('div');
    el.className = 'toast' + (tone ? ' ' + tone : '');
    el.setAttribute('role', 'alert');
    el.innerHTML = `<div class="t-body"><b>${esc(title)}</b>${body ? `<span>${esc(body)}</span>` : ''}</div><button type="button">OK</button>`;
    const close = () => el.remove();
    el.querySelector('button').addEventListener('click', close);
    $('#toasts').prepend(el);
    while ($('#toasts').children.length > 3) $('#toasts').lastElementChild.remove();
    if (ms) setTimeout(close, ms);
    if (sound) chime();
}

/**
 * Check price alerts for one symbol. An alert fires once when the level is crossed,
 * then re-arms after the price moves back to the other side of the level.
 * Returns true if any alert changed (caller saves settings).
 */
export function checkPriceAlerts(settings, symbol, price) {
    if (!(price > 0)) return false;
    let changed = false;
    settings.alerts.filter(a => a.symbol === symbol).forEach(a => {
        const hit = a.dir === 'above' ? price >= a.price : price <= a.price;
        if (hit && !a.fired) {
            a.fired = true; changed = true;
            toast(`${symbol} ${a.dir === 'above' ? 'above' : 'below'} ${usd(a.price)}`, `Now ${usd(price)}`,
                { tone: a.dir === 'above' ? 'up' : 'down', ms: 60000, sound: settings.sound });
        } else if (!hit && a.fired) {
            a.fired = false; changed = true;    // re-arm
        }
    });
    return changed;
}

export function countdownAlert(settings, cd) {
    toast(`${cd.label}`, 'Countdown reached zero', { ms: 60000, sound: settings.sound });
}
