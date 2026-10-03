---
title: 프로젝트 구조와 요청 흐름
description: 패키지를 어떻게 나눴고, 사용자의 요청이 어떤 컨트롤러를 거쳐 가는지.
order: 4
category: 개발
---

## 패키지 구조

코드를 쓰기 시작하면서 제일 먼저 정한 건 패키지 구조였다.
기준은 하나였다. 다른 사람이 처음 이 프로젝트를 열어봐도 어떤 기능이 어디 있는지 바로 찾을 수 있어야 한다.

![IntelliJ에서 본 패키지 구조. algoproject 아래 compiler, config, controller, dto, mapper, security, service, serviceimpl, validator 패키지와 PageHandler, Time 클래스가 있다](/covers/algorithm-server/dev/package-tree.png)

그래서 비슷한 관심사를 가진 클래스끼리 묶는 계층형 구조로 나눴다.

![패키지별 역할. Compiler는 컴파일 수행, Config는 자주 쓰는 상수, Controller는 요청 처리와 관리자 페이지 컨트롤러, DTO는 계층 간 데이터 이동 객체, Mapper는 데이터베이스 매퍼, Security는 Spring Security, Service는 서비스 인터페이스, ServiceImpl은 그 구현체, Validator는 유효성 검사를 맡는다](/covers/algorithm-server/dev/package-layers.png)

| 패키지 | 맡은 일 |
|---|---|
| `controller` | 요청을 받아 서비스로 넘기고 화면을 돌려준다. 관리자 페이지 컨트롤러는 `admin` 아래로 따로 뺐다 |
| `service` · `serviceimpl` | 비즈니스 로직. 인터페이스와 구현체를 나눴다 |
| `mapper` | MyBatis 매퍼. SQL은 XML에 둔다 |
| `dto` | 계층 사이에서 데이터를 옮기는 객체 |
| `compiler` | 언어별 컴파일과 채점 |
| `security` | 로그인 처리와 권한 설정 |
| `validator` | 회원가입, 게시글, 비밀번호 변경 같은 입력값 검증 |
| `config` | 권한 이름, 채점 결과, 글자 수 제한 같은 상수 |

구조를 잡으면서 좀 더 나은 방법이 없나 찾아보다가 레이어드 아키텍처 패턴을 알게 됐다.
공부한 내용은 [블로그](https://coco16.tistory.com/26)에 따로 정리해 뒀다.

## 요청 흐름

사용자가 사이트에 들어와서 할 수 있는 일을 컨트롤러 기준으로 그려보면 이렇다.

![전체 요청 흐름. 사용자가 HomeController로 사이트에 들어와 RegisterController에서 회원가입하고 LoginController로 로그인한다. 로그인 후에는 ProblemController(문제 풀기), BoardController(게시판), MypageController(마이페이지)로 가고, 관리자는 AdminController를 거쳐 AdminNotificationController(공지 등록)와 AdminProblemController(문제 등록)로 간다](/covers/algorithm-server/dev/request-flow.png)

회원가입을 하고 로그인하면 문제 풀기, 게시판, 마이페이지를 쓸 수 있다.
관리자 권한을 가진 계정은 관리자 페이지에서 공지사항과 문제를 등록한다.

로그인할 때 권한 확인과 비밀번호 검증은 Spring Security가 맡는다.
DB에 암호화되어 저장된 비밀번호를 찾아 입력값과 맞는지 확인하고, 맞으면 그 회원의 권한을 붙여준다.
권한은 미인증, 인증, 관리자 세 가지로 나눴고, 주소마다 어떤 권한이 필요한지는 설정 한 곳에 모아 뒀다.

```java
// /admin 아래는 관리자만
.requestMatchers("/admin/**").hasAnyAuthority(ROLE_ADMIN)
// 제출 내역, 문제 제출, 글쓰기는 이메일 인증을 마친 회원부터
.requestMatchers("/history/**", "/challenge/**", "/board/write")
    .hasAnyAuthority("ROLE_ADMIN", "ROLE_USER")
// 나머지는 모두 허용
.requestMatchers("/**").permitAll()
```

컨트롤러는 관리자용 3개를 포함해 16개가 됐다. 다음 챕터부터는 그중에서 가장 손이 많이 갔던 기능들을 하나씩 정리한다.
