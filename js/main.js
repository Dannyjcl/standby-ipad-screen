/* ── StandBy: wiring ─────────────────────────────────────────── */

import { loadSettings, saveSettings } from './config.js';
import { renderClock, renderCountdowns } from './clock.js';
import { startBtc } from './btc.js';

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
