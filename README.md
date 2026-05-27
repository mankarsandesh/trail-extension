# Trail — Browsing Insights

A Chrome extension that shows your browsing history with time-spent insights, search, and visualisations. **All data stays local on your device.**

## Features

- ⏱ **Time tracking** — see how long you spend on each site
- 📊 **Insights dashboard** — top sites, daily charts, hourly distribution, peak hours
- 🔍 **Full search** — search every visit by URL, title, or domain
- 📅 **Date filters** — today, week, month, all time
- 🌐 **Per-site detail** — drill into any domain to see every visit
- ⚙️ **Privacy controls** — exclude domains, set idle threshold, choose retention period
- 💾 **Export / import** — your data, your choice
- 🔒 **Local-only** — no servers, no tracking, no analytics

## Setup

```bash
# Install dependencies
npm install

# Build the extension
npm run build
```

Then load in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

## Development

```bash
npm run dev
```

This starts Vite in watch mode with hot reload for the dashboard.

For changes to the background script or popup, run `npm run build` and reload the extension at `chrome://extensions`.

## Icons

This project ships without icon PNGs in `public/icons/` — Chrome will use a default icon if they're missing, which is fine for development. To add your own:

- `public/icons/icon16.png` (16×16)
- `public/icons/icon48.png` (48×48)
- `public/icons/icon128.png` (128×128)

## Project structure

```
trail-extension/
├── public/
│   └── manifest.json          # Chrome extension manifest
├── src/
│   ├── background/            # Service worker — time tracking
│   ├── popup/                 # Toolbar popup (quick stats)
│   ├── dashboard/             # Full-page dashboard
│   │   └── components/        # StatsOverview, HistoryView, SitesView, SettingsView
│   ├── lib/                   # storage, analytics, types
│   └── styles/                # Tailwind globals
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## How tracking works

The service worker listens for tab activations, URL changes, window focus changes, and idle state changes. Each "session" starts when you focus a page and ends when you switch away, go idle, or close the tab. Sessions shorter than 1.5 seconds are discarded.

Visits are stored in `chrome.storage.local` (the active session lives in `chrome.storage.session` so it doesn't get lost if the service worker sleeps). Old visits are auto-deleted based on your retention setting.

## License

MIT
