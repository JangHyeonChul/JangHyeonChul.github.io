/**
 * /about 페이지 데이터. 이 파일만 고치면 페이지에 그대로 반영됩니다.
 * 배열을 비워 두면 해당 섹션은 렌더되지 않습니다.
 */

export interface Education {
  /** 학교명 */
  school: string;
  /** 전공 · 학위. 예: '컴퓨터공학과' */
  degree?: string;
  /** 예: '2016.03 – 2024.02' */
  period?: string;
  /** 한 줄 덧붙임. 예: '졸업', '재학 중' */
  note?: string;
}

export interface Career {
  /** 직무. 예: 'BackEnd Developer' */
  role: string;
  /** 회사명. 비우면 표시되지 않습니다. */
  company?: string;
  /** 예: '2023.09 – 재직 중' */
  period?: string;
  /** 한 줄 덧붙임 */
  note?: string;
}

export interface Certification {
  /** 자격증명 */
  name: string;
  /** 발급 기관 */
  issuer?: string;
  /** 취득일. 예: '2023.05' */
  date?: string;
  /** 한 줄 덧붙임 */
  note?: string;
}

export interface About {
  /** 페이지 상단 한 문단. 비우면 표시되지 않습니다. */
  intro: string;
  education: Education[];
  career: Career[];
  certifications: Certification[];
}

/** 각 배열은 최신순으로 적습니다. */
export const about: About = {
  intro: '',

  education: [
    {
      school: '원광대학교',
      degree: '컴퓨터공학과',
      period: '2016.03 – 2024.02',
      note: '졸업',
    },
  ],

  career: [
    {
      role: 'BackEnd Developer',
      period: '2023.09 – 재직 중',
    },
  ],

  certifications: [
    {
      name: 'SQLD',
      issuer: '한국데이터산업진흥원',
      date: '2023.05',
    },
    {
      name: '운전면허 1종',
    },
  ],
};
