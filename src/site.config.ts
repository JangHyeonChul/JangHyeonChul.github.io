/**
 * 사이트 전역 정보. 여기만 고치면 헤더/푸터/메타태그에 전부 반영됩니다.
 */
export const site = {
  name: 'JangHyeonChul',
  role: '개발자',
  /** 메인 상단 한 줄 소개 */
  tagline: '만든 것보다, 만들면서 겪은 것을 기록합니다.',
  /** <head> 메타 설명 */
  description: '프로젝트의 제작 과정과 고민, 트러블슈팅을 챕터로 정리한 개발 기록.',
  links: [
    { label: 'GitHub', href: 'https://github.com/JangHyeonChul' },
    { label: 'Blog', href: 'https://coco16.tistory.com/' },
    { label: 'Email', href: 'mailto:wkdgus1139@gmail.com' },
  ],
  /** 메인 히어로 하단의 연락 카드 (라벨 + 값, 2줄) */
  contacts: [
    { label: 'Blog', value: 'coco16.tistory.com', href: 'https://coco16.tistory.com/' },
    { label: 'Email', value: 'wkdgus1139@gmail.com', href: 'mailto:wkdgus1139@gmail.com' },
  ],
} as const;
