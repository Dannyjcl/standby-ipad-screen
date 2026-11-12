/* ── Configuration & persisted settings ───────────────────────────
 *
 * Everything here can also be changed from the ⚙ Settings panel on the
 * iPad; those changes are saved in that browser (localStorage) and win
 * over the defaults below.
 */

// ┌──────────────────────────────────────────────────────────────┐
// │ PLACEHOLDER — stock quotes API key (Finnhub)                  │
// │ 1. Create a free account at https://finnhub.io/register       │
// │ 2. Copy your API key from the dashboard                       │
// │ 3. Paste it here, OR paste it into ⚙ Settings → Stocks        │
// │ Leave as '' to run without stock prices (Bitcoin still works). │
// │ Note: this repo is public, so the Settings route keeps the key │
// │ off GitHub.                                                    │
// └──────────────────────────────────────────────────────────────┘
export const FINNHUB_API_KEY = '';

const STORE_KEY = 'standby:v1';

export const DEFAULTS = {
    clock24h: false,

    // Countdowns: { id, label, at: 'YYYY-MM-DDTHH:mm' (local time) }
    countdowns: [
        { id: 'cd-winter', label: 'Winter break', at: '2026-12-12T17:00' },
        { id: 'cd-ny', label: 'New Year', at: '2027-01-01T00:00' },
    ],

    // Stock strip. Finnhub free tier: US stocks and ETFs.
    stockKey: FINNHUB_API_KEY,
    tickers: ['MSTR', 'NVDA', 'AMZN', 'BMNR', 'BN', 'SPY', 'QQQ', 'GLD'],

    // MSTR premium inputs. These change most weeks — update from
    // strategy.com or the latest Form 8-K.
    mstr: {
        btcHeld: 850364,            // BTC held, per 8-K filed Nov 9, 2026
        shares: 421900000,          // Class A + B common shares, Sep 30, 2026 (402.3M + 19.6M)
        asOf: '2026-11-09',
    },

    // Price alerts: { id, symbol: 'BTC' | ticker, dir: 'above' | 'below', price, fired }
    alerts: [],

    // Night mode: 'auto' follows the schedule, or 'on' / 'off'
    night: 'auto',
    nightOverride: null,        // set by the moon button: { on, until }
    nightFrom: '22:00',
    nightTo: '07:00',

    chartRange: '1D',
    sound: true,
};

const clone = o => JSON.parse(JSON.stringify(o));

/** Load settings, filling any missing fields from DEFAULTS (survives older saved shapes). */
export function loadSettings() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { saved = {}; }
    const s = Object.assign(clone(DEFAULTS), saved);
    s.mstr = Object.assign(clone(DEFAULTS.mstr), saved.mstr || {});
    if (!Array.isArray(s.countdowns)) s.countdowns = clone(DEFAULTS.countdowns);
    if (!Array.isArray(s.tickers)) s.tickers = clone(DEFAULTS.tickers);
    if (!Array.isArray(s.alerts)) s.alerts = [];
    // A key typed into Settings wins; otherwise fall back to the one in this file.
    if (!s.stockKey) s.stockKey = FINNHUB_API_KEY;
    return s;
}

export function saveSettings(s) {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(s));
        return true;
    } catch (e) {
        return false;
    }
}

export const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
