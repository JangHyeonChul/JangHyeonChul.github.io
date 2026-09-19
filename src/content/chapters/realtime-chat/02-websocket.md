---
title: 커넥션 1만 개를 어떻게 들고 있을 것인가
description: 고루틴 2개/커넥션 모델에서 메모리가 터지기까지.
order: 2
category: 개발
date: 2025-04-11
draft: true   # 샘플입니다. 실제 글로 교체하면서 이 줄을 지우세요
---

## 순진한 구현

커넥션 하나당 읽기 고루틴 1개, 쓰기 고루틴 1개. 교과서적인 구조입니다.

```go
func (h *Hub) serve(conn *websocket.Conn) {
    c := &Client{conn: conn, send: make(chan []byte, 256)}
    go c.writePump()
    go c.readPump()
}
```

문제는 `send` 채널이었습니다. 커넥션당 256개 × 평균 메시지 512B ≈ **128KB**.
1만 커넥션이면 버퍼만으로 1.2GB 입니다.

## 고친 방식

버퍼를 32로 줄이고, 넘치면 **느린 클라이언트를 끊습니다.**

```go
select {
case c.send <- msg:
default:
    close(c.send)   // 못 따라오면 연결을 정리한다
    h.unregister <- c
}
```

처음엔 "메시지를 버린다"는 게 불편했는데,
실시간 채팅에서 5초 밀린 메시지는 이미 의미가 없다는 걸 받아들이고 나니 간단해졌습니다.

메모리는 1.2GB → **150MB** 로 떨어졌습니다.
