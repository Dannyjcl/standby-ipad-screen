# StandBy for iPad

A full-screen, always-on dashboard for an iPad on a stand, inspired by iPhone StandBy mode. It's a static web app added to the Home Screen, so no App Store or build step is needed.

**What's on screen**

- **Clock & date**, huge and readable from across the room, plus a **Coming up** list of countdowns (breaks, exams, games)
- **Live Bitcoin**: price streamed from Coinbase over a WebSocket, with a 1D / 1W / 1M chart
- **MSTR premium to BTC (mNAV)**: Strategy's market cap ÷ the value of its bitcoin, updated live
- **Stock ticker strip** for your watchlist
- **Price & countdown alerts**: pop-up banners (and an optional chime) when a level is crossed or a countdown hits zero
- **Red night mode**: the whole screen goes dim red on a schedule, so it doesn't light up the room

## Set it up on the iPad

1. Turn on GitHub Pages: repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**. After a minute the site is at `https://dannyjcl.github.io/standby-ipad-screen/`.
2. On the iPad, open that link in **Safari** → Share → **Add to Home Screen**. Launch it from the icon, and it opens full-screen with no browser bars.
3. Keep the screen on: **Settings → Display & Brightness → Auto-Lock → Never** while it's on the stand. (The app also asks Safari for a screen wake lock, but iPadOS doesn't always honor that from home-screen apps.)
4. Optional: **Settings → Accessibility → Guided Access** locks the iPad to this one app.

## API keys

| Data | Source | Key needed? |
|---|---|---|
| Bitcoin price + chart | Coinbase Exchange public API | No |
| Stock quotes + MSTR price | [Finnhub](https://finnhub.io) free tier | **Yes**. Placeholder in `js/config.js`, or paste it into ⚙ Settings → Stocks |

Without a Finnhub key, everything except the stock strip and the MSTR premium works, and those two panels say what's missing. Because this repo is public, the Settings route is the better option: the key stays in the iPad's browser storage and never lands on GitHub.

## MSTR premium math

```
market cap  = MSTR price × common shares
BTC NAV     = BTC held × BTC price
mNAV        = market cap ÷ BTC NAV        (1.25 = trading at a 25% premium)
```

This is the simple *equity* mNAV. Strategy's own figure uses enterprise value (it adds debt and preferred stock), so theirs runs higher. BTC held and share count change most weeks; update them in ⚙ Settings → MSTR from the latest 8-K or strategy.com. Defaults: 850,364 BTC (8-K, Nov 9, 2026) and 421.9M Class A + B shares (Sep 30, 2026).

## Develop

It's plain HTML/CSS/JS modules, so serve the folder and open it:

```sh
python3 -m http.server 8080
```

To preview on the iPad over Wi-Fi, open `http://<your-laptop-ip>:8080` in Safari on the same network.

| File | Role |
|---|---|
| `index.html` | Layout shell, home-screen meta tags |
| `css/styles.css` | Design tokens, StandBy layout, red night theme |
| `js/config.js` | Defaults, **API key placeholder**, saved settings |
| `js/clock.js` | Clock, date, countdowns |
| `js/btc.js` | Coinbase REST candles + WebSocket ticker, chart |
| `js/stocks.js` | Finnhub quotes, ticker strip |
| `js/mstr.js` | mNAV / premium panel |
| `js/alerts.js` | Price + countdown alerts, toasts, chime |
| `js/settings.js` | Settings dialog |
| `js/main.js` | Wires it together: night mode, wake lock, timers |
| `vendor/` | TradingView Lightweight Charts v4.2.3 (Apache-2.0) |
