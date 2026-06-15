# FlashArxiv

**Live:** https://flash-arxiv-seonuk.web.app

arXiv 최신 논문을 키워드로 빠르게 검색하고, AI로 한국어 요약까지 — 개인 연구 피드 앱

## Features

- **Keyword tracking** — 키워드 추가/삭제; 60초 폴링으로 실시간 업데이트
- **arXiv integration** — arXiv 공개 API 연동, 제출일 기준 최신순, 날짜별 그룹 표시
- **Category filter** — 전체 arXiv 분류 드릴다운 피커 (cs, eess, math …)
- **AI 논문 요약** — Gemini Flash API로 초록을 한국어 3줄 불렛 요약, localStorage 캐싱
- **Save & organize** — 논문 스타 저장(soft-delete), 마크다운 메모, 폴더 분류, 저장 논문 내 검색
- **User accounts** — Firebase Google 로그인, 사용자별 Firestore 데이터 동기화
- **Session persistence** — 새로고침 후에도 탭·로그인 상태 유지

## Design

- Gruvbox dark theme
- Serif typography (Lora / Georgia)

## Stack

### Core

| Category | Technology | Version |
|----------|-----------|---------|
| UI framework | React | 19 |
| Build tool | Vite | 8 |
| Language | JavaScript (JSX) | ES Modules |
| Styling | CSS Variables | Gruvbox palette |

### AI & Backend

| Category | Technology | Notes |
|----------|-----------|-------|
| AI 요약 | Gemini Flash API | 무료 티어, 1,500 req/day |
| 인증 | Firebase Auth | Google 로그인 |
| 데이터베이스 | Firestore | 사용자별 데이터 영속화 |
| 배포 | Firebase Hosting | push 시 자동 배포 |
| 논문 소스 | arXiv Public API | 무료, 인증 불필요 |

### Networking

| Concern | Approach |
|---------|----------|
| CORS proxy (dev) | Vite `server.proxy` → `/arxiv` |
| CORS proxy (prod) | arXiv API 직접 호출 (CORS 허용) |
| Rate limiting | 5s 간격, 429 → 10s 백오프 + 3회 재시도 |

## Branch Strategy

```
main    ← production (Firebase Hosting 자동 배포)
  └─ dev     ← 통합 브랜치
       └─ feature/xxx  ← 기능별 작업 브랜치
```

## Getting Started

```bash
npm install
npm run dev
```

`.env.local` 파일에 환경변수 설정 필요:

```
VITE_GEMINI_API_KEY=...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Links

- [Wiki](https://github.com/boostcampwm-snu-2026-1/flash-arxiv-seonuk/wiki)
- [Issues](https://github.com/boostcampwm-snu-2026-1/flash-arxiv-seonuk/issues)
