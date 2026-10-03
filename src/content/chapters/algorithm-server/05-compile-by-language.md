---
title: 언어별로 컴파일러 프로세스 띄우기
description: Java · C · Python 코드를 각 언어의 컴파일러와 인터프리터로 실행하고, 테스트 케이스와 출력을 맞춰본 방법.
order: 5
category: 개발
---

## 언어마다 길이 다르다

채점의 큰 흐름은 같다. 코드를 파일로 만들고, 실행하고, 출력을 정답과 비교한다.
그런데 "실행한다"는 부분이 언어마다 완전히 달랐다. Java는 자바 안에 컴파일러가 들어 있지만, C와 Python은 서버에 깔린 gcc와 Python을 바깥 프로세스로 띄워야 한다.

그래서 제출이 들어오면 먼저 언어를 보고 담당 클래스로 넘기게 했다.

```java
if (lang.equals("JAVA"))   compileResults = javaCompile.compileJavaCode(code, pageNum, request);
if (lang.equals("C"))      compileResults = clangCompile.compileClangCode(code, pageNum, request);
if (lang.equals("PYTHON")) compileResults = pythonCompile.compilePythonCode(code, pageNum, request);
```

세 클래스 모두 테스트 케이스 수만큼 돌면서 케이스마다 성공 · 실패를 List에 담아 돌려준다.
그 List를 보고 컴파일 에러가 하나라도 있으면 Error, 실패가 하나라도 있으면 Fail, 아니면 Success로 최종 판정한다.

## Java — JavaCompiler로 직접 컴파일

Java부터 만들었다. Java 동적 컴파일을 다룬 글을 참고했다.

1. `.java` 파일을 만들고 사용자에게 받은 소스 코드를 붙여넣는다.
2. Java가 제공하는 `JavaCompiler`로 그 파일을 컴파일한다.
3. 컴파일된 클래스를 불러와 인스턴스를 로드한다.
4. 로드한 클래스의 `main` 메서드를 실행하고, 그때 출력된 값을 정답값으로 본다.
5. DB에 저장된 모범 출력과 비교해서 정답 처리한다.

언어 안에 컴파일러가 있으니 다른 프로그램을 띄울 필요가 없어서 비교적 쉬웠다.

만들고 나서 아쉬웠던 점이 있다. 출력(`println`)으로 정답을 확인하다 보니 사용자가 답을 내는 방식의 자유도가 너무 떨어졌다.
차라리 메서드가 `return`한 값을 정답으로 쓰는 편이 더 좋았겠다는 생각이 들었다.

나중에 보강하면서 Java 채점은 컴파일만 하는 별도 서버(8081)로 옮겼다.
지금은 웹 서버가 테스트 케이스마다 코드와 입력 · 정답 출력을 HTTP로 보내고, 컴파일 서버가 `Success` · `Fail`만 돌려준다.

## C — gcc 프로세스 띄우기

Java는 비교적 쉬웠지만 문제는 다른 언어였다. Java 안에서 다른 언어를 컴파일해 본 건 처음이었다.

우선 gcc가 어떻게 컴파일하는지부터 봤는데, 결국 Java 때와 비슷했다.
`.c` 파일을 만들어 소스 코드를 넣고, 컴파일러에게 그 파일을 컴파일해 달라고 요청하면 된다.
차이는 그 요청을 자바 코드 안이 아니라 **운영체제의 프로세스**로 보낸다는 점이다.

```java
// 1. 받은 코드를 .c 파일로 만든다
File sourceFile = new File("world.c");
writer.write(code);

// 2. 서버에 설치된 gcc로 컴파일한다
Process compile = Runtime.getRuntime().exec(new String[]{"gcc", "-o", "world", "world.c"});
compile.waitFor();

// 3. 만들어진 실행 파일을 띄운다
Process run = Runtime.getRuntime().exec(new String[]{"./world"});
```

여기서 처음 알게 된 게 있다. 프로세스를 띄우면 그 프로그램의 **표준 입력과 표준 출력이 자바 쪽에서는 스트림으로** 보인다.

- 테스트 케이스의 입력은 `run.getOutputStream()`에 한 줄씩 써 넣는다. 사용자 프로그램 입장에서는 키보드로 입력받는 것과 같다.
- 사용자 프로그램이 `printf`로 출력한 값은 `run.getInputStream()`으로 한 줄씩 읽는다.
- 읽은 줄을 정답 출력과 비교해서 같으면 성공, 다르면 실패를 담는다.

케이스 하나가 끝나면 만들었던 `.c` 파일과 실행 파일을 지워서 다음 채점에 남지 않게 했다.

## Python — 인터프리터 프로세스 띄우기

Python은 컴파일 단계가 따로 없어서 C보다 한 단계가 적다.
`.py` 파일을 만든 다음, 서버에 설치된 Python 인터프리터로 그 파일을 바로 실행한다.

```java
File sourceFile = new File("hello.py");
writer.write(code);

Process process = Runtime.getRuntime().exec(new String[]{"python", "hello.py"});
```

입력과 출력을 다루는 방식은 C와 같다. 표준 입력 스트림에 테스트 케이스 입력을 써 주고, 표준 출력 스트림에서 결과를 한 줄씩 읽어 정답과 비교한다.
Python은 문법 오류가 실행 시점에 나기 때문에, 표준 에러 스트림도 따로 읽어서 로그로 남겼다.

## 정리하면

| 언어 | 실행 방법 | 만드는 파일 | 입력 · 출력 |
|---|---|---|---|
| Java | `JavaCompiler`로 컴파일 후 클래스 로드 (지금은 컴파일 서버로 위임) | `.java` | `main` 실행 중 출력값 |
| C | `gcc`로 컴파일 → 실행 파일을 프로세스로 실행 | `.c` → 실행 파일 | 프로세스 표준 입출력 스트림 |
| Python | `python` 인터프리터 프로세스로 바로 실행 | `.py` | 프로세스 표준 입출력 스트림 |

결국 C와 Python은 "파일을 만들고, 프로세스를 띄우고, 스트림으로 입력을 넣고 출력을 읽는다"는 같은 틀 안에서 명령어만 다르다.
처음에는 언어마다 전혀 다른 문제처럼 보였는데, 하나를 끝까지 만들고 나니 나머지는 그 틀에 끼워 넣는 일이었다.
