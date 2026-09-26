import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * projects — 메인 페이지의 카드 하나 = 파일 하나
 * 파일명이 URL 이 됩니다. (my-app.md → /projects/my-app/)
 */
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    /** 카드에 보이는 한 줄 설명 */
    summary: z.string(),
    /** 호버하면 summary 아래에 덧붙는 자세한 설명. 빈 줄로 문단을 나눕니다. */
    detail: z.string().optional(),
    /** 기술 스택 칩 */
    stack: z.array(z.string()).default([]),
    /** "2025.03 – 2025.06" 같은 자유 형식 */
    period: z.string().optional(),
    /** public/ 기준 경로. 예: '/covers/my-app.png' — 없으면 플레이스홀더 */
    cover: z.string().optional(),
    /** 상세 페이지 상단에서 돌아가는 스크린샷들. public/ 기준 경로 */
    gallery: z.array(z.string()).default([]),
    repo: z.string().url().optional(),
    demo: z.string().url().optional(),
    /** 카드 정렬 순서 (작을수록 앞) */
    order: z.number().default(999),
    draft: z.boolean().default(false),
  }),
});

/**
 * chapters — 프로젝트 폴더 안의 글 하나 = 파일 하나
 * 폴더명이 프로젝트 ID 와 일치해야 합니다.
 *   src/content/chapters/my-app/01-planning.md → /projects/my-app/01-planning/
 */
const chapters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/chapters' }),
  schema: z.object({
    title: z.string(),
    /** 챕터 목록에 보이는 설명 */
    description: z.string().optional(),
    /** 프로젝트 안에서의 순서 (작을수록 앞) */
    order: z.number().default(999),
    /** 선택. 지정하면 챕터 목록이 이 값으로 묶여서 표시됩니다.
     *  예: '기획' | '개발' | '트러블슈팅' | '회고'
     *  한 프로젝트에서 아무도 안 쓰면 그냥 순서 목록으로 나옵니다. */
    category: z.string().optional(),
    date: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

/**
 * resume — 경력기술서. 가장 최근 updated 문서 한 장이 /resume 에 실립니다.
 */
const resume = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/resume' }),
  schema: z.object({
    title: z.string(),
    /** 페이지 상단 한 줄 */
    summary: z.string().optional(),
    /** 최종 수정일. 여러 장이면 이 값이 큰 것이 실립니다. */
    updated: z.coerce.date(),
    draft: z.boolean().default(false),
    /** 요약 — 문서 맨 앞 세 줄. 비우면 섹션이 통째로 빠집니다 */
    intro: z.array(z.string()).default([]),
    /** 핵심 역량 — 묶음 하나가 카드 한 장, 항목 하나가 칩 하나 */
    skills: z
      .array(z.object({ label: z.string(), items: z.array(z.string()) }))
      .default([]),
    /** 경력 — 회사 하나에 프로젝트 카드 여러 장 */
    career: z
      .array(
        z.object({
          company: z.string().optional(),
          role: z.string().optional(),
          period: z.string().optional(),
          /** 담당 도메인·팀 구성 한 줄 */
          note: z.string().optional(),
          projects: z
            .array(
              z.object({
                name: z.string(),
                period: z.string().optional(),
                /** 프로젝트 개요 한 줄 — 무엇을 왜 만들었는지 */
                overview: z.string().optional(),
                /** 담당 역할. 예: '코어 개발 (설계 ~ 배포)' */
                role: z.string().optional(),
                /** 인원 구성·협업 범위. 예: 'PM 1, 백엔드 3' */
                team: z.string().optional(),
                stack: z.array(z.string()).default([]),
                /** 주요 업무 */
                tasks: z.array(z.string()).default([]),
                /** 성과 — 가능하면 수치로 */
                outcomes: z.array(z.string()).default([]),
              }),
            )
            .default([]),
        }),
      )
      .default([]),
  }),
});

export const collections = { projects, chapters, resume };
