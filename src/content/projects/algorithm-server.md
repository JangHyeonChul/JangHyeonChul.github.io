---
title: 알고리즘 온라인 저지
summary: 알고리즘 문제를 온라인에서 풀고 자동 채점받는 웹 서비스
detail: 제출 버튼을 누르면 서버는 처음 보는 사람의 코드를 실행해야만 채점할 수 있습니다. 그 경계가 어떻게 설계되는지 궁금해 온라인 저지를 직접 만들었고, 제가 세운 방어선을 스스로 뚫어보며 무엇이 새는지 확인했습니다.
stack: [Java 17, Spring Boot 3, MySQL, MyBatis, Thymeleaf, AWS]
period: 2023.02 – 2023.05
order: 1
cover: /covers/algorithm-server/01-home.png
gallery:
  - /covers/algorithm-server/01-home.png
  - /covers/algorithm-server/02-problems.png
  - /covers/algorithm-server/03-search.png
  - /covers/algorithm-server/04-login.png
  - /covers/algorithm-server/05-register.png
  - /covers/algorithm-server/06-board.png
  - /covers/algorithm-server/07-notice.png
repo: https://github.com/JangHyeonChul/AlgorithmServer
---

온라인에서 코드를 제출하면 서버는 그걸 **실행해야만** 채점할 수 있습니다.
즉 온라인 저지는 임의 코드 실행을 기능으로 제공하는 서비스입니다.

그 구조가 궁금해서 직접 만들었고, 만들면서 발견한 구멍들을 정리했습니다.
