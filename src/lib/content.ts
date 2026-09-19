import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;
export type Chapter = CollectionEntry<'chapters'>;

/** 프로덕션 빌드에서만 draft 를 숨깁니다 (dev 에서는 보임). */
const visible = (e: { data: { draft: boolean } }) => import.meta.env.DEV || !e.data.draft;

/** 'my-app/01-planning' → { project: 'my-app', chapter: '01-planning' } */
export function splitChapterId(id: string) {
  const i = id.indexOf('/');
  if (i === -1) return { project: '', chapter: id };
  return { project: id.slice(0, i), chapter: id.slice(i + 1) };
}

export async function getProjects(): Promise<Project[]> {
  const items = (await getCollection('projects')).filter(visible);
  return items.sort(
    (a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title, 'ko'),
  );
}

/** 특정 프로젝트의 챕터를 order 순으로 반환 */
export async function getChapters(projectId: string): Promise<Chapter[]> {
  const items = (await getCollection('chapters')).filter(
    (c) => visible(c) && splitChapterId(c.id).project === projectId,
  );
  return items.sort(
    (a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id, 'ko'),
  );
}

/** 프로젝트별 챕터 수 (메인 카드에 표시) */
export async function getChapterCounts(): Promise<Record<string, number>> {
  const all = (await getCollection('chapters')).filter(visible);
  return all.reduce<Record<string, number>>((acc, c) => {
    const { project } = splitChapterId(c.id);
    acc[project] = (acc[project] ?? 0) + 1;
    return acc;
  }, {});
}

/**
 * 챕터를 카테고리로 묶습니다.
 * 아무 챕터도 category 를 안 쓰면 grouped: false 로 반환 —
 * 이 경우 호출부는 그냥 순서 목록으로 렌더합니다.
 */
export function groupChapters(chapters: Chapter[]) {
  const hasCategory = chapters.some((c) => !!c.data.category);
  if (!hasCategory) return { grouped: false as const, groups: [{ name: '', items: chapters }] };

  const order: string[] = [];
  const map = new Map<string, Chapter[]>();
  for (const c of chapters) {
    const key = c.data.category ?? '기타';
    if (!map.has(key)) { map.set(key, []); order.push(key); }
    map.get(key)!.push(c);
  }
  return {
    grouped: true as const,
    groups: order.map((name) => ({ name, items: map.get(name)! })),
  };
}

/** 한국어 기준 대략적인 읽기 시간 (분). 공백 제외 500자/분. */
export function readingTime(body: string | undefined): number {
  const chars = (body ?? '').replace(/\s/g, '').length;
  return Math.max(1, Math.round(chars / 500));
}

/** 2025년 6월 14일 형식 */
export function formatDate(d: Date | undefined): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(d);
}
