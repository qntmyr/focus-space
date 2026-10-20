# Focus Space

A calm split-screen workspace for ADHD brains: write on the left, park distracting thoughts in the journal on the right, run a focus timer, and mix ambient sounds generated in the browser. No account, works offline, everything stays on your device.

## Features

- Two resizable panes: editor (sans / serif / mono, Tab inserts spaces, export as `.md`) and journal with a "park a thought" button that timestamps a line.
- Pomodoro timer (25 / 5 / 15) with a chime, a screen flash, optional desktop notifications and a per-day session counter.
- Ambient sounds synthesised with the Web Audio API (rain, brown noise, wind, café, fireplace) plus an optional YouTube lo-fi embed.
- Zen mode (`Z`), dark mode, keyboard shortcuts, PWA installable, offline via a service worker.

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build   # output in dist/
```

The build is a static site: deploy `dist/` to Cloudflare Pages, GitHub Pages, Netlify or any static host.
