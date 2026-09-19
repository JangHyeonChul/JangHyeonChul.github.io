---
title: 서버를 2대로 늘렸더니 메시지가 사라졌다
description: 인스턴스 간 메시지 전파를 Redis Pub/Sub 으로 해결한 과정.
order: 3
category: 트러블슈팅
date: 2025-05-02
draft: true   # 샘플입니다. 실제 글로 교체하면서 이 줄을 지우세요
---

## 증상

로드밸런서 뒤에 서버를 2대 두자 이런 일이 생겼습니다.

- A 서버에 붙은 유저가 보낸 메시지를
- B 서버에 붙은 유저가 **못 받습니다**

당연합니다. `Hub` 가 프로세스 메모리 안에만 있었으니까요.
1챕터에서 "브로커 없이 시작"한 대가를 정확히 여기서 치렀습니다.

## 해결

각 서버가 Redis 채널을 구독하고, 로컬 Hub 대신 Redis 로 publish 합니다.

```go
// 보낼 때: 로컬이 아니라 Redis 로
rdb.Publish(ctx, "room:"+roomID, payload)

// 받을 때: 구독 → 로컬 커넥션에 팬아웃
for msg := range sub.Channel() {
    hub.broadcastLocal(msg.Channel, []byte(msg.Payload))
}
```

## 남은 문제

Redis Pub/Sub 은 **전달을 보장하지 않습니다.** 구독자가 잠깐 끊기면 그 사이 메시지는 사라집니다.
지금은 클라이언트가 재접속할 때 마지막 메시지 ID 이후를 PostgreSQL 에서 다시 읽어오는 걸로 덮고 있습니다.

제대로 하려면 Redis Streams 나 Kafka 로 가야 한다고 생각하지만,
현재 트래픽에서는 이 정도가 **적정 복잡도**라고 판단했습니다.
