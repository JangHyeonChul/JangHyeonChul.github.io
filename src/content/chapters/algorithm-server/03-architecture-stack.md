---
title: 전체 구조와 기술 스택
description: 서버를 어떻게 나눴고, 각 기술을 왜 골랐는지.
order: 3
category: 기획
---

## 전체 구조

기능과 테이블을 정리하고 나서 서버 구조를 그려봤다.
혼자 만드는 프로젝트라 처음에는 웹 서버 한 대에 모든 걸 넣었고, 나중에 Java 채점만 별도의 컴파일 서버로 떼어냈다. 지금 구조는 이렇다.

<figure class="diagram">
<svg viewBox="0 0 760 400" role="img" aria-label="전체 서버 구조: 브라우저가 AWS EC2의 웹 서버(8080)에 요청한다. 웹 서버는 Spring Security, Controller-Service-Mapper, Validator로 이루어져 있고, MyBatis로 AWS RDS MySQL에 접근한다. Java 코드는 같은 EC2의 컴파일 서버(8081)에 HTTP로 보내 채점하고, C와 Python 코드는 웹 서버에서 gcc와 Python 프로세스로 실행한다. 이메일 인증 메일은 Gmail SMTP로 비동기 발송한다.">
<defs><marker id="arch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head" d="M0,0 L10,5 L0,10 z"/></marker></defs>
<rect class="group" x="186" y="24" width="360" height="352" rx="14"/>
<text class="gl" x="202" y="46">AWS EC2</text>
<g class="box"><rect x="16" y="150" width="130" height="80" rx="10"/><text class="t" x="81" y="180">브라우저</text><text class="s" x="81" y="200">Thymeleaf 화면</text><text class="s" x="81" y="216">jQuery · CodeMirror</text></g>
<g class="box box--key"><rect x="210" y="60" width="312" height="170" rx="10"/><text class="t" x="366" y="86">웹 서버 :8080</text><text class="s" x="366" y="104">Spring Boot 3 · Java 17</text></g>
<g class="inner"><rect x="226" y="120" width="280" height="26" rx="6"/><text class="m" x="366" y="137">Spring Security — 로그인 · 권한 3단계</text></g>
<g class="inner"><rect x="226" y="154" width="280" height="26" rx="6"/><text class="m" x="366" y="171">Controller → Service → Mapper</text></g>
<g class="inner"><rect x="226" y="188" width="280" height="26" rx="6"/><text class="m" x="366" y="205">Validator — 입력값 · 제출 코드 검증</text></g>
<g class="box"><rect x="210" y="276" width="150" height="70" rx="10"/><text class="t" x="285" y="304">컴파일 서버 :8081</text><text class="s" x="285" y="323">Java 코드 채점 전용</text></g>
<g class="box"><rect x="372" y="276" width="150" height="70" rx="10"/><text class="t" x="447" y="304">gcc · Python</text><text class="s" x="447" y="323">C · Python 코드 실행</text></g>
<g class="box"><rect x="590" y="60" width="150" height="70" rx="10"/><text class="t" x="665" y="88">AWS RDS</text><text class="s" x="665" y="107">MySQL</text></g>
<g class="box"><rect x="590" y="200" width="150" height="70" rx="10"/><text class="t" x="665" y="228">Gmail SMTP</text><text class="s" x="665" y="247">이메일 인증 메일</text></g>
<path class="ln" d="M146,190 H206" marker-end="url(#arch-arrow)"/>
<text class="lb" x="176" y="180" text-anchor="middle">HTTP</text>
<path class="ln" d="M522,95 H586" marker-end="url(#arch-arrow)"/>
<text class="lb" x="554" y="85" text-anchor="middle">MyBatis</text>
<path class="ln" d="M522,215 H586" marker-end="url(#arch-arrow)"/>
<text class="lb" x="554" y="205" text-anchor="middle">@Async</text>
<path class="ln" d="M285,230 V272" marker-end="url(#arch-arrow)"/>
<text class="lb" x="292" y="256">코드 + 테스트 케이스</text>
<path class="ln" d="M447,230 V272" marker-end="url(#arch-arrow)"/>
<text class="lb" x="454" y="256">프로세스 실행</text>
</svg>
<figcaption>알고리즘 온라인 저지 전체 구조. Java 컴파일 서버 분리는 2023년 8월 보강 작업 때 추가했다.</figcaption>
</figure>

요청 하나가 지나가는 길을 따라가 보면 이렇다.

1. 사용자가 브라우저에서 코드를 쓰고 제출하면 웹 서버로 요청이 간다.
2. Spring Security가 먼저 로그인 여부와 권한을 확인한다. 이메일 인증을 안 한 회원은 여기서 막힌다.
3. Validator가 코드 길이와 금지된 단어를 검사한다.
4. 언어에 따라 채점 방법이 갈린다. Java는 컴파일 서버에 코드와 테스트 케이스를 HTTP로 보내고, C와 Python은 웹 서버에서 gcc와 Python 프로세스를 직접 띄워 실행한다.
5. 테스트 케이스 결과를 모아 정답 여부를 정하고, 제출 내역과 포인트를 MySQL에 저장한다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 백엔드 | Java 17, Spring Boot 3.1, Spring Security, MyBatis |
| 데이터베이스 | MySQL (AWS RDS) |
| 화면 | Thymeleaf, HTML · CSS, jQuery, CodeMirror |
| 인프라 | AWS EC2, AWS RDS |
| 기타 | JavaMailSender(Gmail SMTP), Lombok, IntelliJ, GitHub |

## 왜 이 기술들을 골랐나

### Java · Spring Boot

처음부터 끝까지 혼자 만드는 게 목표였기 때문에, 새 언어를 배우는 데 힘을 쓰기보다는 Java로 서비스 전체를 완성하는 쪽을 택했다.
Spring Boot는 설정을 대부분 알아서 잡아주고 내장 서버로 바로 띄울 수 있어서, 설정보다 기능을 만드는 데 시간을 쓸 수 있었다.
채점 쪽에서도 이점이 있었다. Java는 언어 자체에 컴파일러 API(`JavaCompiler`)가 들어 있어서, 제출된 Java 코드를 서버 안에서 바로 컴파일하고 실행할 수 있었다.

### Spring Security

권한을 세 단계(미인증 · 인증 · 관리자)로 나누기로 하면서, 로그인과 권한 확인을 직접 짜는 건 위험하다고 생각했다.
비밀번호 암호화, 세션 관리, URL별 접근 제한을 하나라도 빠뜨리면 바로 구멍이 된다.
Spring Security를 쓰면 "이 주소는 이 권한만"이라는 규칙을 설정 한 곳에 모아 둘 수 있고, 비밀번호도 암호화해서 저장하고 비교해준다.

### MyBatis

이 프로젝트에서 얻고 싶었던 것 중 하나가 데이터베이스를 제대로 공부하는 거였다. JPA를 쓰면 SQL이 가려지는데, 나는 오히려 내가 짠 테이블에 어떤 쿼리가 나가는지 직접 보고 싶었다.
MyBatis는 SQL을 XML에 직접 쓰기 때문에, 인덱스를 어디에 걸지, 조인을 어떻게 할지 고민한 게 쿼리에 그대로 드러난다.

### MySQL · AWS RDS

테이블 사이의 관계가 많고, 포인트 적립처럼 여러 테이블을 한 번에 바꿔야 하는 작업이 있어서 트랜잭션이 확실한 관계형 데이터베이스가 필요했다. 그중 가장 많이 쓰이고 자료가 많은 MySQL을 골랐다.
DB는 웹 서버와 같은 EC2에 깔지 않고 RDS로 따로 뺐다. 서버를 다시 만들거나 옮겨도 데이터는 그대로 남아 있어야 하기 때문이다.

### Thymeleaf · jQuery

혼자서 프론트까지 만들어야 했기 때문에, 화면을 따로 띄우는 SPA보다는 서버에서 HTML을 만들어 내려주는 방식이 맞다고 봤다.
Thymeleaf는 Spring Boot가 기본으로 지원하는 템플릿 엔진이라 컨트롤러에서 넘긴 데이터를 별도 설정 없이 바로 화면에 그릴 수 있다.
비밀번호 변경이나 댓글처럼 화면 전체를 다시 그릴 필요가 없는 곳만 jQuery로 Ajax 요청을 보내 부분적으로 바꿨다.

### CodeMirror

코드를 그냥 textarea에 쓰게 하면 줄 번호도 없고 들여쓰기도 불편하다.
백준이 어떤 코드 편집기를 쓰는지 찾아보다가 CodeMirror를 알게 됐고, 그대로 가져와 코드 작성 화면에 붙였다.

### Gmail SMTP · @Async

인증 메일은 Gmail SMTP로 보냈다. 그런데 메일 한 통 보내는 데 3~5초가 걸렸고, 그동안 화면이 멈춰 있었다.
여러 사람이 동시에 요청하면 더 길어질 것 같아서, 메일 발송 메서드에 `@Async`를 붙여 별도 스레드에서 보내게 했다.
덕분에 버튼을 누르면 바로 "발송했습니다" 메시지가 뜨고, 메일은 뒤에서 따로 나간다.

### 컴파일 서버 분리

처음에는 웹 서버 안에서 Java 코드를 컴파일했다. 그런데 채점 사이트는 모르는 사람이 보낸 코드를 내 서버에서 실행하는 서비스다.
웹 서버에는 DB 접속 정보와 설정 같은 민감한 정보가 다 들어 있는데, 거기서 남의 코드를 돌리는 건 위험하다고 판단했다.
그래서 Java 채점은 컴파일만 하는 서버로 떼어냈다. 이 서버는 코드와 테스트 케이스를 받아 결과만 돌려주고, 그 외의 정보는 아무것도 갖고 있지 않다.

다만 C와 Python은 아직 웹 서버에서 직접 실행한다. 같은 위험이 남아 있는 셈이라, 다음에 손본다면 이 둘도 컴파일 서버로 옮기고 실행 시간과 메모리에 제한을 거는 게 먼저일 것 같다.
