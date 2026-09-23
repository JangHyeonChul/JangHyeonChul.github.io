---
title: 경력기술서
summary: 어떤 문제를 맡았고, 무엇을 선택했고, 무엇이 달라졌는지.
updated: 2026-09-23

# 핵심 역량 — 묶음 하나가 카드 한 장, 항목 하나가 작은 칩 하나로 그려집니다.
skills:
  - label: Language
    items: [Java, C#, Python]
  - label: Framework
    items: [Spring Boot, MyBatis, .NET WinForms]
  - label: Database
    items: [MySQL]
  - label: Infra
    items: [AWS, Docker, GitHub Actions]
  - label: Data
    items: [Hadoop, Hive, Spark]

# 경력 — 프로젝트 하나가 가로로 긴 카드 한 장.
# points 는 항상 보이고, detail 은 카드에 마우스를 올리면 펼쳐집니다.
career:
  - role: BackEnd Developer
    period: 2023.09 – 재직 중
    projects:
      - name: 에러 모니터링 서버 신규 구축
        stack: [Java, Spring Boot, Slack API]
        points:
          - 로그 수집 도구를 사내 공통 모듈로 배포해 코드 수정 없이 전 서비스의 에러를 자동 수집
          - 서버·단말·외부 연동 등 여러 곳의 에러를 한 곳으로 모으고, 발생 즉시 담당자에게 Slack 알림
        detail:
          - 수집 서버를 설계부터 배포까지 코어 개발로 맡아 새로 구축
          - 에러가 발생한 위치와 요청 정보를 함께 담아 보내, 재현 없이 원인을 좁힐 수 있게 함
          - 알림을 도메인별로 나누는 구조를 잡아, 새 서비스가 늘어도 클래스 하나만 추가하면 되도록 설계
          - 에러 종류에 따라 담당자를 자동으로 지목하고 알림 채널을 분리
      - name: POS 클라이언트 자동 업데이트 프로그램 개발
        stack: [C#, .NET, WinForms]
        points:
          - 매장 단말의 프로그램 버전을 서버와 비교해 내려받아 교체하는 자동 업데이트 프로그램을 코어 개발
          - 실행 중 교체가 불가능한 업데이터 자신은 별도 프로그램이 교체 후 재실행하는 방식으로 무인 갱신 처리
        detail:
          - 브랜드·기기 종류(POS·키오스크·QR·에이전트·배달중계)에 따라 화면과 설치 경로, 갱신 대상을 분기
          - 관리자 권한 자동 승격, 중복 실행 차단, 결제 게이트웨이 종료 후 갱신으로 현장 설치 실패 요인 제거
          - 최초 설치는 운영사 계정, 이후에는 단말 라이선스로 인증하는 2단 구조와 갱신 이력 서버 전송
---
