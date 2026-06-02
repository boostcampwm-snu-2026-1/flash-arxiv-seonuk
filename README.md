# Interactive Research Helper

**Live:** https://interactive-research-helper.vercel.app

A minimal web app for tracking the latest academic papers on arXiv by keyword.

## Features

- **Keyword tracking** — add and remove keywords; results update in real time (60s polling)
- **arXiv integration** — fetches papers via the arXiv public API, sorted by submission date
- **Save papers** — star any paper to save it; view saved papers in the Saved tab
- **Persistent state** — keywords and saved papers survive page refresh via localStorage

## Design

- Gruvbox dark theme
- Serif typography (Georgia / Palatino)

## Stack

| Category | Technology | Reason |
|----------|-----------|--------|
| Frontend | Vite + Vanilla JS | Fast builds, no framework overhead needed |
| Styling | CSS Variables | Gruvbox theming, easy to maintain |
| Data | arXiv API | Free, no auth required, best CS/ML coverage |
| Deployment | Vercel | Auto-deploy on push, zero config |

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
