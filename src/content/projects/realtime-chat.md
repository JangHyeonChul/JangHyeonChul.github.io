---
title: 실시간 채팅 서버
summary: WebSocket 기반 채팅 서버를 직접 설계하고, 동시 접속 1만 명까지 버티게 만들기까지의 기록.
stack: [Go, Redis, PostgreSQL, Docker]
period: 2025.03 – 2025.06
order: 1
repo: https://github.com/JangHyeonChul
draft: true   # 샘플입니다. 실제 글로 교체하면서 이 줄을 지우세요
---

메시지 브로커 없이 시작해서, 결국 Redis Pub/Sub 을 얹기까지의 과정을 정리했습니다.
설계 결정마다 "왜 그때 그렇게 했는지"를 남기는 데 초점을 뒀습니다.
