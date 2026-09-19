# JangHyeonChul.github.io

프로젝트별 제작 과정을 **카드 → 챕터 → 글** 3단 구조로 기록하는 정적 사이트.

- **스택**: Astro 5 (정적 생성) + TypeScript
- **디자인**: Hwahae Design System 의 다크 표면 적응 — `src/styles/tokens.css` 참고
- **배포**: `main` 에 push → GitHub Actions → GitHub Pages

## 로컬에서 보기

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 에 정적 파일 생성
npm run preview  # 빌드 결과 미리보기
```

## 글 쓰는 법

### 1. 프로젝트 카드 추가

`src/content/projects/` 에 `.md` 파일 하나 = 메인 카드 하나.
**파일명이 곧 URL 이자 프로젝트 ID** 입니다.

```markdown
---
title: 실시간 채팅 서버
summary: 카드에 보이는 한 줄 설명.
stack: [Go, Redis, PostgreSQL]   # 칩으로 표시 (카드엔 4개까지)
period: 2025.03 – 2025.06        # 선택
cover: /covers/chat.png          # 선택, public/ 기준 경로. 없으면 플레이스홀더
repo: https://github.com/...     # 선택
demo: https://...                # 선택
order: 1                         # 카드 정렬 (작을수록 앞)
draft: false                     # true 면 프로덕션 빌드에서 숨김
---

여기 본문을 쓰면 프로젝트 페이지 상단에 '개요'로 들어갑니다. (선택)
```

### 2. 챕터 글 추가

`src/content/chapters/<프로젝트ID>/` 에 `.md` 파일 하나 = 글 하나.
**폴더 이름은 위 프로젝트 파일명과 정확히 같아야 합니다.**

```markdown
---
title: 커넥션 1만 개를 어떻게 들고 있을 것인가
description: 챕터 목록에 보이는 설명. (선택)
order: 2                    # 프로젝트 안에서의 순서
category: 개발              # 선택 — 아래 설명 참고
date: 2025-04-11            # 선택
draft: false
---

본문을 마크다운으로 씁니다.
```

### 3. `category` 동작

한 프로젝트 안에서

- **아무 챕터도 `category` 를 안 쓰면** → 그냥 `order` 순서대로 쭉 나열됩니다
- **하나라도 쓰면** → 카테고리별로 묶여서 표시됩니다 (등장 순서대로 그룹 생성)

번호는 그룹을 넘어가도 이어집니다. 두 방식 다 샘플이 들어 있으니 비교해 보세요.

| 프로젝트 | 방식 |
|---|---|
| `realtime-chat` | 카테고리 그룹 (기획 / 개발 / 트러블슈팅 / 회고) |
| `portfolio-site` | 순서 목록 |

## 폴더 구조

```text
src/
├── content/
│   ├── projects/          # 카드 1개 = 파일 1개
│   └── chapters/<ID>/     # 글 1개 = 파일 1개
├── pages/
│   ├── index.astro                        # 카드 그리드
│   └── projects/[project]/
│       ├── index.astro                    # 챕터 목록
│       └── [chapter].astro                # 글 본문
├── components/            # ProjectCard, ChapterRow, Header, Footer
├── styles/tokens.css      # 디자인 토큰 — 색을 바꾸려면 여기만
└── site.config.ts         # 이름 / 소개 / 링크
```

## 테마

헤더 우측 버튼으로 라이트/다크를 전환합니다. **첫 방문은 라이트**이고, 선택은
`localStorage` 에 남아 다음 방문에도 유지됩니다.

- **라이트** = 화해 디자인 시스템 문서의 값 그대로 (원본 팔레트)
- **다크** = 원문의 뉴트럴 사다리를 반전해 유도한 값

색을 바꾸려면 `src/styles/tokens.css` 의 두 블록만 고치면 됩니다.
두 블록은 **같은 토큰 이름을 1:1로** 갖고 있어야 합니다.

시스템 설정(`prefers-color-scheme`)을 따라가게 하려면
`src/layouts/BaseLayout.astro` 의 인라인 스크립트에서 저장값이 없을 때
`matchMedia('(prefers-color-scheme: dark)')` 결과를 쓰도록 바꾸면 됩니다.

## 커버 이미지

`public/covers/` 에 넣고 frontmatter 에 `cover: /covers/파일명.png` 로 참조합니다.
권장 비율 **16:9** (예: 1200×675). 없으면 브랜드 틴트 플레이스홀더가 나옵니다.

## 배포 설정 (최초 1회)

저장소 **Settings → Pages → Source** 를 **GitHub Actions** 로 바꿔야 합니다.
`main` 에 push 할 때마다 `.github/workflows/deploy.yml` 이 빌드 후 배포합니다.
