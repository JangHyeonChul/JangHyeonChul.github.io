---
title: 알고리즘 온라인 저지
summary: 백준의 "제출" 버튼 뒤가 궁금해서 온라인 저지를 직접 만들었습니다. 남의 코드를 내 서버에서 실행한다는 것이 어떤 의미인지 알아가는 과정의 기록.
detail: 제출 버튼을 누르면 서버는 처음 보는 사람의 코드를 실행해야만 채점할 수 있습니다. 그 경계가 어떻게 설계되는지 궁금해 온라인 저지를 직접 만들었고, 제가 세운 방어선을 스스로 뚫어보며 무엇이 새는지 확인했습니다.
stack: [Java 17, Spring Boot 3, MySQL, MyBatis, Thymeleaf, AWS]
period: 2023.02 – 2023.05
order: 1
cover: /covers/algorithm-server.png
repo: https://github.com/JangHyeonChul/AlgorithmServer
---

온라인에서 코드를 제출하면 서버는 그걸 **실행해야만** 채점할 수 있습니다.
즉 온라인 저지는 임의 코드 실행을 기능으로 제공하는 서비스입니다.

그 구조가 궁금해서 직접 만들었고, 만들면서 발견한 구멍들을 정리했습니다.
