/* ── StandBy: wiring ─────────────────────────────────────────── */

import { loadSettings, saveSettings } from './config.js';
import { renderClock, renderCountdowns } from './clock.js';
import { startBtc, btcPrice, onBtcPrice } from './btc.js';
import { startStocks, onQuotes, quotes, stockStatus } from './stocks.js';
import { renderMstr } from './mstr.js';

const settings = loadSettings();
const persist = () => saveSettings(settings);

function tick() {
    const now = new Date();
    renderClock(now, settings);
    renderCountdowns(now, settings);
}

// Align ticks to the start of each second so the clock never lags.
function scheduleTick() {
    tick();
    setTimeout(scheduleTick, 1000 - (Date.now() % 1000) + 5);
}
scheduleTick();

startBtc(settings.chartRange, range => { settings.chartRange = range; persist(); });

/* MSTR premium: recompute on every BTC tick and every stock refresh */
const updateMstr = () => renderMstr(btcPrice(), quotes.MSTR, stockStatus(), settings.mstr);
onBtcPrice(updateMstr);
onQuotes(updateMstr);

// Settings dialog arrives in the next step; until then the "open settings" links focus nothing.
let openSettings = () => {};
startStocks(() => settings, section => openSettings(section));
updateMstr();
