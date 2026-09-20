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
    /** 카드를 호버하면 펼쳐지는 자세한 설명. 없으면 summary 를 씁니다. */
    detail: z.string().optional(),
    /** 기술 스택 칩 */
    stack: z.array(z.string()).default([]),
    /** "2025.03 – 2025.06" 같은 자유 형식 */
    period: z.string().optional(),
    /** public/ 기준 경로. 예: '/covers/my-app.png' — 없으면 플레이스홀더 */
    cover: z.string().optional(),
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

export const collections = { projects, chapters };
