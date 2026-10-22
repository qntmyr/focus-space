# Focus Space

A calm split-screen workspace for ADHD brains: write on the left, park distracting thoughts in the journal on the right, run a focus timer, and mix ambient sounds generated in the browser. No account, works offline, everything stays on your device.

## Features

- Rich text editor ([TipTap](https://tiptap.dev)): headings, bold/italic/underline/strike, highlight, lists, task lists, quotes, code blocks, links, alignment, undo/redo, Markdown export.
- Journal pane with a "park a distraction" button that adds a timestamped line, and a one-line daily intent.
- Pomodoro timer (15 to 50 min focus, 5 / 15 min breaks) with a chime, a screen flash, optional desktop notifications and a per-day session counter.
- Ambient sounds synthesised with the Web Audio API (rain, brown noise, wind, café, fireplace) plus a YouTube lo-fi embed, Lofi Girl by default.
- Light / dark / system theme, zen mode (`Z`), keyboard shortcuts, mobile layout with Write / Journal tabs, PWA installable, offline via a service worker.

## Deploy

Hosted on Vercel, connected to this repository: every push to `main` deploys production, every pull request gets a preview URL. Vercel detects Vite (build `npm run build`, output `dist`). `vercel.json` keeps the service worker and manifest fresh and caches hashed assets for a year. The custom domain is a subdomain of mayerquentin.com (DNS at OVH, CNAME to `cname.vercel-dns.com`).

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build   # output in dist/
```

The build is a static site: deploy `dist/` to Vercel, Netlify, GitHub Pages or any static host.
