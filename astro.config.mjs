// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// username.github.io 저장소는 루트(/)로 서빙되므로 base 설정이 필요 없습니다.
// 일반 저장소(예: github.com/USER/blog)로 옮긴다면 base: '/blog' 를 추가하세요.
export default defineConfig({
  site: 'https://JangHyeonChul.github.io',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      // 듀얼 테마: 라이트 색은 인라인, 다크 색은 --shiki-dark 변수로 나옵니다.
      // 전환은 global.css 의 [data-theme] 규칙이 담당합니다.
      themes: { light: 'github-light', dark: 'github-dark-default' },
      wrap: true,
    },
  },
});
