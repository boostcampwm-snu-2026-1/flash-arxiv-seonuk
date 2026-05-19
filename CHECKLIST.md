# 프로젝트 체크리스트 — Seonuk's Interactive Research Helper

## 기획 / 설계
- [x] 사용할 논문 소스 확정 — arXiv API
- [x] 실시간 업데이트 방식 결정 — 60초 폴링
- [x] 프론트엔드 스택 결정 — Vite + React
- [x] 백엔드/API 레이어 구조 설계 — Vite proxy (dev) / Vercel rewrite (prod)

## 환경 세팅
- [x] 프로젝트 초기화
- [x] Gruvbox 다크 테마 CSS 변수 정의
- [x] 세리프 서체 설정 (Georgia / Palatino)
- [x] 기본 폰트 사이즈 18px로 확대

## 핵심 기능 구현
- [x] 키워드 입력 UI — 칩 형태, 다중 등록/삭제
- [x] 키워드 localStorage 영속화
- [x] 논문 API 연동 — arXiv (ti/abs/au 필드 대상, AND 쿼리)
- [x] 최신순 정렬
- [x] 논문 리스트 렌더링 — 제목만 표시
- [x] 실시간 업데이트 — 60초 폴링 (키워드 변경 시에만 애니메이션 재생)
- [x] Load more 버튼 — 300개 단위 페이지네이션
- [x] 스크랩/저장 기능 + Saved 탭
- [x] 저장 목록 localStorage 영속화
- [x] 초록 hover 툴팁 (모바일 비활성화)
- [x] arXiv rate limit 대응 — 5초 딜레이, 429 자동 재시도

## UI / UX
- [x] Gruvbox 다크 테마 전체 적용
- [x] 세리프 서체 전체 적용
- [x] 별/날짜/제목 열 정렬
- [x] 날짜 모바일에서 월일/연도 분리 표시
- [x] status bar — 논문 수, 날짜 범위, 마지막 fetch 시각
- [x] 논문 등장 fade-in + stagger 애니메이션
- [x] 별표 bounce 애니메이션
- [x] 키워드 칩 추가/삭제 애니메이션
- [x] 탭 전환 fade 애니메이션
- [x] 헤더 우측 메일 버튼 (SVG 아이콘, mailto:iamseonuk@gmail.com)
- [x] 모바일 status bar 폰트 축소

## 마무리
- [x] 환경변수 / API 키 보안 처리 — 해당 없음 (arXiv 무인증)
- [x] 기본 에러 처리 (API 실패, rate limit 등)
- [x] Vercel 배포 — https://interactive-research-helper.vercel.app
- [x] GitHub 자동 배포 연결 완료 (push → 자동 배포)
- [x] README에 라이브 URL 추가

---

## 완료 기록

- **2026-05-19** — 초기 셋업 및 전체 기능 구현, Vercel 배포 완료
