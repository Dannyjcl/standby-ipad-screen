/* ── MSTR premium to bitcoin (equity mNAV) ───────────────────────
 *   market cap = MSTR price × common shares
 *   BTC NAV    = BTC held × BTC price
 *   mNAV       = market cap ÷ BTC NAV
 */

const $ = s => document.querySelector(s);
const usd = (n, d = 2) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const big = n => n >= 1e12 ? usd(n / 1e12, 2) + 'T' : usd(n / 1e9, 1) + 'B';

export function computeMnav(mstrPrice, btcPrice, { btcHeld, shares }) {
    if (!(mstrPrice > 0 && btcPrice > 0 && btcHeld > 0 && shares > 0)) return null;
    const mcap = mstrPrice * shares;
    const nav = btcHeld * btcPrice;
    return {
        mcap, nav,
        mnav: mcap / nav,
        navPerShare: nav / shares,
        satsPerShare: btcHeld / shares * 1e8,
    };
}

export function renderMstr(btcPrice, quote, stockStatus, mstr) {
    const msg = $('#mstr-msg');
    const statsEl = $('#mstr-stats');
    if (!quote) {
        $('#mnav').innerHTML = '—';
        $('#mnav-sub').textContent = 'mNAV';
        statsEl.innerHTML = '';
        msg.hidden = false;
        msg.innerHTML = stockStatus === 'nokey' || stockStatus === 'badkey'
            ? 'Needs the MSTR share price, which comes from Finnhub. <button type="button" data-open-settings="stocks">Add API key</button>'
            : 'Waiting for the MSTR price…';
        return;
    }
    const r = computeMnav(quote.c, btcPrice, mstr);
    if (!r) {
        $('#mnav').innerHTML = '—';
        msg.hidden = false;
        msg.innerHTML = btcPrice ? 'Check BTC held and share count in Settings. <button type="button" data-open-settings="mstr">Open settings</button>' : 'Waiting for the BTC price…';
        return;
    }
    msg.hidden = true;
    const prem = (r.mnav - 1) * 100;
    $('#mnav').innerHTML = `${r.mnav.toFixed(2)}<small>×</small>`;
    $('#mnav-sub').innerHTML = `mNAV · <span class="${prem >= 0 ? 'up' : 'down'}">${Math.abs(prem).toFixed(1)}% ${prem >= 0 ? 'premium' : 'discount'}</span>`;
    const dayUp = quote.dp >= 0;
    statsEl.innerHTML = `
        <dt>MSTR</dt><dd>${usd(quote.c)} <span class="${dayUp ? 'up' : 'down'}" style="color:var(--${dayUp ? 'up' : 'down'})">${dayUp ? '+' : '−'}${Math.abs(quote.dp).toFixed(1)}%</span></dd>
        <dt>BTC NAV / share</dt><dd>${usd(r.navPerShare)}</dd>
        <dt>Sats / share</dt><dd>${Math.round(r.satsPerShare).toLocaleString('en-US')}</dd>
        <dt>Mkt cap · BTC NAV</dt><dd>${big(r.mcap)} · ${big(r.nav)}</dd>
        <dt>Holdings</dt><dd>${Number(mstr.btcHeld).toLocaleString('en-US')} ₿</dd>`;
}
