/* ── StandBy: wiring ─────────────────────────────────────────── */

import { loadSettings } from './config.js';
import { renderClock, renderCountdowns } from './clock.js';

const settings = loadSettings();

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
