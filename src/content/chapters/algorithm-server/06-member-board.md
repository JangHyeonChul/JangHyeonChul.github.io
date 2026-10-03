---
title: 회원가입 · 로그인, 게시판, 입력값 검증
description: 가입부터 글쓰기까지, 들어오는 값을 어디서 어떻게 걸렀는지.
order: 6
category: 개발
---

## 회원가입 · 로그인

![회원가입 · 로그인 흐름. RegisterController가 회원정보를 받으면 RegisterValidator가 유효성을 검사하고, 통과하면 Spring Security가 비밀번호를 암호화해 DB에 저장한다. 로그인은 LoginController에서 MemberDetailService로 넘어가 아이디와 비밀번호가 맞는지 확인하고, 맞으면 SecurityContextHolder에 세션을 저장해 로그인을 끝낸다](/covers/algorithm-server/dev/register-login.png)

회원가입을 하면 아이디, 이메일, 닉네임, 비밀번호, 상태 메시지가 회원 테이블에 저장된다.
저장하기 전에 서버에서 값이 올바른지 먼저 검사한다.

- 이메일 형식이 맞는지
- 닉네임이 2글자 이상인지
- 비밀번호와 비밀번호 확인이 같은지
- 비어 있는 값은 없는지
- 이미 쓰는 아이디 · 이메일 · 닉네임은 아닌지

올바르지 않은 값이 있으면 ErrorMap에 오류 메시지를 담아 사용자에게 보여준다.
ErrorMap이 비어 있으면 그 회원 객체를 Spring Security에 넘겨 비밀번호를 암호화하고 DB에 저장한다.

처음 가입하면 미인증 권한을 받는다. 이 상태에서는 글쓰기, 댓글 작성, 문제 도전이 막혀 있다.
로그인을 하지 않았을 때도 해당 주소로는 들어갈 수 없다.

| 권한 | 이름 |
|---|---|
| 미인증 회원 | `ROLE_UNAUTH` |
| 인증 회원 | `ROLE_USER` |
| 관리자 | `ROLE_ADMIN` |

## 게시판

![게시판 흐름. BoardController에서 로그인 여부와 권한을 확인한 뒤 게시물을 작성한다. BoardService가 태그, 댓글 금지, 사용 언어 입력을 받아 BoardValidator로 제목 길이와 공백을 검사하고, 통과하면 게시물을 등록한다](/covers/algorithm-server/dev/board-flow.png)

게시판은 먼저 로그인했는지, 그리고 이메일 인증을 마친 회원인지 확인한다.
글을 쓰면 BoardService를 통해 등록하기 전에 BoardValidator가 제목이 비어 있는지, 너무 길지는 않은지 검사한 뒤 등록한다.
글을 쓸 때는 카테고리(질문 · 자유 · 강의 · 문제)와 사용 언어를 고를 수 있고, 댓글을 막아둘 수도 있다.

글 수정과 삭제는 작성자 본인만 할 수 있게, 요청한 사람의 아이디와 글쓴이의 아이디가 같은지 확인한다.

## 마이페이지

![MypageController가 맡는 기능. 회원정보 수정, 비밀번호 변경, 이메일 인증, 내가 쓴 게시물, 정보, 알림](/covers/algorithm-server/dev/mypage.png)

마이페이지에서는 회원 정보 수정, 비밀번호 변경, 이메일 인증, 내가 쓴 게시물, 내 정보, 알림을 볼 수 있다.
탭을 누를 때마다 화면 전체를 다시 불러오지 않고, 필요한 데이터만 받아와서 바꾸게 했다.

비밀번호 변경은 클라이언트에서 한 번, 서버에서 한 번 더 검사한다.
클라이언트 검사는 사용자가 얼마든지 우회할 수 있기 때문에, 서버 검사를 통과해야만 바꾸고 성공 여부를 메시지와 함께 돌려준다.

## 입력값 검증과 오류 메시지

회원가입, 게시글, 비밀번호 변경처럼 값을 받는 곳마다 검증이 필요해서, 검증 로직만 따로 모아 validator 패키지로 뺐다.

![validator 구조. BoardValidator(게시물 유효성 검증기), MypagePassword(비밀번호 변경 유효성 검증기), RegisterValidator(회원가입 유효성 검증기)](/covers/algorithm-server/dev/validators.png)

각 검증기는 공백 여부, 중복, 글자 수 제한 같은 검사를 맡는다.
검증기에서 쓰는 오류 메시지는 코드 안에 직접 쓰지 않고 `errors.properties` 한 곳에서 관리했다.

![errors.properties 일부. 필수 입력, 중복 체크, 최소 글자 수, 재확인, 입력값 초과, 기본 메시지로 나뉘어 있고, 예를 들어 duplication.user_id는 "이미 존재하는 아이디 입니다", length.user_nickname은 "닉네임은 {0}글자 이상이어야 합니다"](/covers/algorithm-server/dev/error-messages.png)

메시지를 한 곳에 모아 두니, 문구를 바꾸거나 새 메시지를 추가할 때 이 파일만 고치면 됐다.
`{0}` 자리에 최소 글자 수 같은 값을 끼워 넣을 수 있어서, 숫자가 바뀌어도 메시지를 따로 고칠 필요가 없다.
