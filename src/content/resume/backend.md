---
title: 경력기술서
summary: 어떤 문제를 맡았고, 무엇을 선택했고, 무엇이 달라졌는지.
updated: 2026-09-22

# 핵심 역량 — 묶음 하나가 카드 한 장, 항목 하나가 작은 칩 하나로 그려집니다.
skills:
  - label: 실무에서 쓴 것
    items: [Java, Spring Boot, MySQL, AWS, Docker]
  - label: 데이터
    items: [Hadoop, Hive, Spark, Python]
  - label: 학습 중
    items: [AI Agent 활용 자동화, 지식베이스 구축]

# 경력 — 프로젝트 하나가 가로로 긴 카드 한 장. period 는 비워 두면 표시되지 않습니다.
career:
  - company: 회사명
    role: BackEnd Developer
    period: 2023.09 – 재직 중
    note: "담당 도메인과 팀 구성을 한 줄로. (예: 5인 백엔드 팀에서 주문·정산 도메인 담당)"
    projects:
      - name: 에러 모니터링 서버 신규 구축
        stack: [Java, Spring Boot, Slack API]
        points:
          - 로그 수집 도구를 사내 공통 모듈로 배포해 코드 수정 없이 전 서비스의 에러를 자동 수집
          - 서버·단말·외부 연동 등 여러 곳의 에러를 한 곳으로 모으고, 발생 즉시 담당자에게 Slack 알림
      - name: 프로젝트명
        period: 2023.00 – 2024.00
        stack: [Python, Spark, Hadoop]
        points:
          - 문제 —
          - 한 일 —
          - 결과 —
---

<!--
  이름·연락처(상단), 핵심 역량·경력(위 데이터), 학력·자격(about.config.ts)은 자동으로 그려집니다.
  이 본문은 경력 아래에 그대로 이어 붙습니다.
-->

## 개인 프로젝트

업무 외 작업은 프로젝트 페이지에 제작 과정까지 정리해 두었습니다.

- [알고리즘 온라인 저지](/projects/algorithm-server/) — 온라인 저지를 직접 만들며 컴파일 파이프라인과 그 보안 구멍을 확인한 기록
