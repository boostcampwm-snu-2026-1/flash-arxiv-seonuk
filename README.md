# Interactive Research Helper

**Live:** https://interactive-research-helper.vercel.app

A minimal web app for tracking the latest academic papers on arXiv by keyword.

## Features

- **Keyword tracking** — add and remove keywords as chips; results update in real time (60s polling)
- **arXiv integration** — fetches papers via the arXiv public API, sorted by submission date
- **Category filter** — drill-down picker for the full arXiv taxonomy (cs, eess, math, …) to narrow search scope
- **Save papers** — star any paper to save it; view saved papers in the Saved tab
- **Notes** — attach free-text memos to saved papers, persisted across sessions
- **Folders** — create folders, assign saved papers, and filter by folder
- **Search saved** — filter saved papers by title, abstract, or note content in real time
- **Persistent state** — all keywords, categories, saves, notes, and folders survive page refresh via localStorage

## Design

- Gruvbox dark theme
- Serif typography (Georgia / Palatino)

## Stack

### Core

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| UI framework | React | 19 | Hooks only — no class components |
| Build tool | Vite | 8 | Dev server + production bundler |
| Language | JavaScript (JSX) | ES Modules | No TypeScript |
| Styling | CSS Variables | — | Gruvbox palette, no CSS framework |

### Data & Storage

| Category | Technology | Notes |
|----------|-----------|-------|
| Paper source | arXiv Public API | Free, no auth; Atom/XML response |
| XML parsing | Browser `DOMParser` | No external XML library |
| Persistence | `localStorage` | Keywords, categories, saves, notes, folders |

### Networking

| Concern | Approach |
|---------|----------|
| CORS proxy (dev) | Vite `server.proxy` → `/arxiv` rewrites to `export.arxiv.org` |
| CORS proxy (prod) | `vercel.json` rewrites rule |
| Rate limiting | 5 s minimum gap between requests; 429 → 10 s back-off + auto-retry (3×) |
| Polling | `setInterval` at 60 s; reset on keyword/category change |

### Tooling

| Tool | Purpose |
|------|---------|
| ESLint 10 | Linting (react-hooks, react-refresh plugins) |
| `@vitejs/plugin-react` | JSX transform, Fast Refresh |
| Vercel | Zero-config hosting, auto-deploy on push to `main` |

## Branch Strategy

```
main    ← production (auto-deploys to Vercel)
  └─ dev     ← integration branch
       └─ feature/xxx  ← per-feature work branches
```

All feature work is done on `feature/*` branches and merged into `dev` via PR.  
`dev` is merged into `main` when ready to deploy.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Links

- [Wiki](https://github.com/boostcampwm-snu-2026-1/InteractiveResearchHelper-SeonukKim/wiki)
- [Issues](https://github.com/boostcampwm-snu-2026-1/InteractiveResearchHelper-SeonukKim/issues)
