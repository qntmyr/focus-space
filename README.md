# Focus Space

A calm split-screen workspace for ADHD brains: write on the left, park distracting thoughts in the journal on the right, run a focus timer, and mix ambient sounds generated in the browser. No account, works offline, everything stays on your device.

## Features

- Rich text editor ([TipTap](https://tiptap.dev)): headings, bold/italic/underline/strike, highlight, lists, task lists, quotes, code blocks, links, alignment, undo/redo, Markdown export.
- Journal pane with a "park a distraction" button that adds a timestamped line, and a one-line daily intent.
- Pomodoro timer (15 to 50 min focus, 5 / 15 min breaks) with a chime, a screen flash, optional desktop notifications and a per-day session counter.
- Ambient sounds synthesised with the Web Audio API (rain, brown noise, wind, café, fireplace) plus a YouTube lo-fi embed, Lofi Girl by default.
- Light / dark / system theme, zen mode (`Z`), keyboard shortcuts, mobile layout with Write / Journal tabs, PWA installable, offline via a service worker.

## Deploy

Pushing to `main` runs `.github/workflows/pages.yml`, which builds the site and publishes `dist/` to GitHub Pages. One-time setup: in the repository settings, under Pages, set the source to "GitHub Actions".

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
