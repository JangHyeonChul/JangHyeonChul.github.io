---
title: 폴더 구조가 곧 URL 이 되게 하기
description: Astro Content Collections 로 3단 계층을 표현한 방법.
order: 2
date: 2025-07-15
draft: true   # 샘플입니다. 실제 글로 교체하면서 이 줄을 지우세요
---

## 규칙 하나

**폴더 이름 = 프로젝트 ID.** 이거 하나만 지키면 나머지는 자동입니다.

```text
src/content/
├── projects/
│   └── realtime-chat.md          → /projects/realtime-chat/
└── chapters/
    └── realtime-chat/            ← 위 파일명과 같아야 함
        └── 02-websocket.md       → /projects/realtime-chat/02-websocket/
```

## 챕터 정렬

파일명 앞의 숫자는 **사람이 보기 좋으라고** 붙인 것이고,
실제 정렬은 frontmatter 의 `order` 가 결정합니다.

```yaml
---
title: 커넥션 1만 개를 어떻게 들고 있을 것인가
order: 2
category: 개발     # 선택 — 쓰면 목록이 카테고리로 묶입니다
---
```

`category` 를 한 프로젝트에서 아무도 안 쓰면 그냥 순서대로 쭉 나열됩니다.
지금 이 프로젝트가 그 경우입니다.
