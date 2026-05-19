# Seonuk's Interactive Research Helper

## Project Overview

A web application that fetches the latest academic papers matching user-specified keywords, displays them in reverse-chronological order, and updates in real time.

## Design System

- **Theme**: Gruvbox (dark/light variants) — applied universally, no exceptions
- **Typography**: Serif fonts (e.g., Georgia, Palatino, or a web-safe academic serif) to evoke the feel of academic papers
- **Layout**: Clean, readable list view optimized for skimming paper titles and abstracts

## Core Features

1. **Keyword-based paper search** — user defines one or more keywords
2. **Chronological listing** — results sorted newest first
3. **Real-time updates** — new papers surface automatically without a full page reload

## Architecture Notes

- Paper sources: arXiv API is the primary target (free, no auth required); Semantic Scholar or PubMed may be added later
- Real-time updates: polling or WebSocket, TBD
- Frontend: to be decided — keep it lightweight

## Code Style

- No unnecessary comments — code should be self-explanatory
- No over-engineering — build exactly what is needed, nothing more
- Secure handling of any API keys (env vars, never hardcoded)
