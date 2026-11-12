/* ── Settings dialog ─────────────────────────────────────────────
 * Every change saves immediately and calls onChange(section) so the
 * board can redraw just what changed.
 */

import { uid } from './config.js';
import { parseLocal } from './clock.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = n => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

let S, save, onChange, priceOf, lastTrigger = null;

function fmtWhen(at) {
    const d = parseLocal(at);
    return d ? d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : at;
}

function html() {
    const cds = S.countdowns.slice().sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const symbols = ['BTC', ...new Set([...S.tickers, 'MSTR'])];
    return `
    <div class="st-hd"><h2>Settings</h2><button type="button" class="btn" data-act="close">Done</button></div>
    <div class="st-body">

      <section class="st-sec" id="st-display">
        <h3>Display</h3>
        <label class="check"><input type="checkbox" data-set="clock24h"${S.clock24h ? ' checked' : ''}> 24-hour clock</label>
        <label class="check"><input type="checkbox" data-set="sound"${S.sound ? ' checked' : ''}> Chime with alerts</label>
        <div class="st-row">
          <label>Night mode
            <select class="select" data-set="night">
              <option value="auto"${S.night === 'auto' ? ' selected' : ''}>Automatic (schedule)</option>
              <option value="on"${S.night === 'on' ? ' selected' : ''}>Always on</option>
              <option value="off"${S.night === 'off' ? ' selected' : ''}>Off</option>
            </select></label>
          <label>Starts<input class="input" type="time" data-set="nightFrom" value="${esc(S.nightFrom)}"></label>
          <label>Ends<input class="input" type="time" data-set="nightTo" value="${esc(S.nightTo)}"></label>
        </div>
        <p class="st-help">The moon button flips night mode until the next scheduled change.</p>
      </section>

      <section class="st-sec" id="st-countdowns">
        <h3>Countdowns</h3>
        ${cds.length ? `<ul class="st-list">${cds.map(c => `<li><span class="grow">${esc(c.label)}</span><span class="meta">${esc(fmtWhen(c.at))}</span>
            <button type="button" class="btn icon" data-act="del-cd" data-id="${esc(c.id)}" aria-label="Remove ${esc(c.label)}">✕</button></li>`).join('')}</ul>`
          : '<p class="st-empty">No countdowns yet.</p>'}
        <form class="st-row" data-form="cd">
          <label>Name<input class="input" name="label" maxlength="40" placeholder="e.g. Econometrics final" autocomplete="off"></label>
          <label>Date &amp; time<input class="input" name="at" type="datetime-local"></label>
          <button type="submit" class="btn primary" style="align-self:flex-end">Add</button>
        </form>
        <p class="st-err" data-err="cd" aria-live="polite"></p>
      </section>

      <section class="st-sec" id="st-alerts">
        <h3>Price alerts</h3>
        ${S.alerts.length ? `<ul class="st-list">${S.alerts.map(a => `<li><span class="grow"><b>${esc(a.symbol)}</b> ${a.dir} ${usd(a.price)}</span><span class="meta">${a.fired ? 'triggered' : 'armed'}</span>
            <button type="button" class="btn icon" data-act="del-alert" data-id="${esc(a.id)}" aria-label="Remove alert">✕</button></li>`).join('')}</ul>`
          : '<p class="st-empty">No alerts yet.</p>'}
        <form class="st-row" data-form="alert">
          <label>Symbol<select class="select" name="symbol">${symbols.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>
          <label>When price is<select class="select" name="dir"><option value="above">above</option><option value="below">below</option></select></label>
          <label>Price ($)<input class="input" name="price" inputmode="decimal" placeholder="80000" autocomplete="off"></label>
          <button type="submit" class="btn primary" style="align-self:flex-end">Add</button>
        </form>
        <p class="st-err" data-err="alert" aria-live="polite"></p>
        <p class="st-help">An alert fires once when the price crosses the level, then re-arms when it crosses back.</p>
      </section>

      <section class="st-sec" id="st-stocks">
        <h3>Stocks</h3>
        <div class="st-row">
          <label>Finnhub API key
            <input class="input" type="password" data-set="stockKey" value="${esc(S.stockKey || '')}" placeholder="Paste your key" autocomplete="off" spellcheck="false"></label>
        </div>
        <p class="st-help">Free at <a href="https://finnhub.io/register" target="_blank" rel="noopener">finnhub.io</a>. It's saved only on this device.</p>
        <div class="st-row">
          <label>Tickers (comma-separated)
            <input class="input" data-set="tickers" value="${esc(S.tickers.join(', '))}" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
        </div>
        <p class="st-err" data-err="stocks" aria-live="polite"></p>
      </section>

      <section class="st-sec" id="st-mstr">
        <h3>MSTR premium inputs</h3>
        <div class="st-row">
          <label>BTC held<input class="input" data-set="mstr.btcHeld" inputmode="numeric" value="${S.mstr.btcHeld}"></label>
          <label>Common shares<input class="input" data-set="mstr.shares" inputmode="numeric" value="${S.mstr.shares}"></label>
          <label>As of<input class="input" type="date" data-set="mstr.asOf" value="${esc(S.mstr.asOf)}"></label>
        </div>
        <p class="st-help">Update weekly from Strategy's Monday 8-K or strategy.com. Shares = Class A + Class B common.</p>
        <p class="st-err" data-err="mstr" aria-live="polite"></p>
      </section>
    </div>`;
}

function render(focusSel) {
    const dlg = $('#settings');
    const scroll = dlg.scrollTop;
    dlg.innerHTML = html();
    dlg.scrollTop = scroll;
    if (focusSel) { const f = dlg.querySelector(focusSel); if (f) f.focus(); }
}

function err(name, msg) { const el = $(`#settings [data-err="${name}"]`); if (el) el.textContent = msg; }

const toNum = v => Number(String(v).replace(/[,$\s]/g, ''));

function applySetting(el) {
    const key = el.dataset.set;
    if (key === 'tickers') {
        const list = [...new Set(el.value.toUpperCase().split(/[\s,]+/).map(t => t.trim()).filter(Boolean))];
        const bad = list.filter(t => !/^[A-Z][A-Z0-9.\-]{0,9}$/.test(t));
        if (bad.length) { el.classList.add('err'); err('stocks', `Not a ticker: ${bad.join(', ')}`); return; }
        el.classList.remove('err'); err('stocks', '');
        S.tickers = list;
        save(); onChange('stocks');
        return;
    }
    if (key.startsWith('mstr.')) {
        const f = key.slice(5);
        if (f === 'asOf') S.mstr.asOf = el.value;
        else {
            const n = toNum(el.value);
            if (!(n > 0) || !Number.isFinite(n)) { el.classList.add('err'); err('mstr', 'Enter a positive number.'); return; }
            el.classList.remove('err'); err('mstr', '');
            S.mstr[f] = n;
        }
        save(); onChange('mstr');
        return;
    }
    if (el.type === 'checkbox') S[key] = el.checked;
    else if (key === 'stockKey') S.stockKey = el.value.trim();
    else S[key] = el.value;
    save();
    onChange(key === 'stockKey' ? 'stocks' : key === 'clock24h' ? 'clock' : key.startsWith('night') ? 'night' : key);
}

function bind() {
    const dlg = $('#settings');
    dlg.addEventListener('change', e => { if (e.target.dataset.set) applySetting(e.target); });
    dlg.addEventListener('click', e => {
        if (e.target === dlg) { dlg.close(); return; }    // tap on backdrop
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'close') dlg.close();
        if (act === 'del-cd') { S.countdowns = S.countdowns.filter(c => c.id !== b.dataset.id); save(); onChange('countdowns'); render(); }
        if (act === 'del-alert') { S.alerts = S.alerts.filter(a => a.id !== b.dataset.id); save(); render(); }
    });
    dlg.addEventListener('submit', e => {
        e.preventDefault();
        const f = e.target, kind = f.dataset.form, data = new FormData(f);
        if (kind === 'cd') {
            const label = String(data.get('label') || '').trim(), at = String(data.get('at') || '').slice(0, 16);
            if (!label) { err('cd', 'Give the countdown a name.'); f.label.focus(); return; }
            if (!parseLocal(at)) { err('cd', 'Pick a date and time.'); f.at.focus(); return; }
            S.countdowns.push({ id: uid('cd'), label, at });
            save(); onChange('countdowns'); render('[data-form="cd"] [name="label"]');
        }
        if (kind === 'alert') {
            const price = toNum(data.get('price')), symbol = String(data.get('symbol')), dir = String(data.get('dir'));
            if (!(price > 0)) { err('alert', 'Enter a price above zero.'); f.price.focus(); return; }
            // Start "fired" if the price is already past the level, so it only fires on a real crossing.
            const now = priceOf(symbol);
            const fired = now > 0 && (dir === 'above' ? now >= price : now <= price);
            S.alerts.push({ id: uid('al'), symbol, dir, price, fired });
            save(); render('[data-form="alert"] [name="price"]');
        }
    });
    dlg.addEventListener('close', () => { if (lastTrigger) lastTrigger.focus(); });
}

export function initSettings(settings, saveFn, onChangeFn, priceFn) {
    S = settings; save = saveFn; onChange = onChangeFn; priceOf = priceFn;
    bind();
}

export function openSettings(section) {
    lastTrigger = document.activeElement;
    render();
    const dlg = $('#settings');
    dlg.showModal();
    if (section) {
        const sec = dlg.querySelector('#st-' + section);
        if (sec) { sec.scrollIntoView({ block: 'start' }); const inp = sec.querySelector('input'); if (inp) inp.focus({ preventScroll: true }); }
    }
}
