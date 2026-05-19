# Seonuk's Interactive Research Helper

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

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/)
- [arXiv API](https://info.arxiv.org/help/api/index.html) (no API key required)
