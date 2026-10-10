---
title: 개발 기획
description: CI/CD, 데이터베이스 ERD 관리, 지식베이스까지 퀴즈체크의 개발 환경을 어떻게 잡을지 정리한 문서.
order: 2
category: 기획
date: 2026-10-10
---

해당 문서에서는 퀴즈체크에 어떤 식으로 개발될지 상세한 개발 흐름에 대한 내용들을 담고 있습니다

## 개발 기획 - 인프라

### CI/CD

처음에는 Jenkins를 활용한 CI/CD를 구축하려고 했지만, AWS 인스턴스 사양 문제로 인해서 좀 더 가벼운 GitHub Actions를 이용해 CI/CD로 구축 진행

하지만 현재 AWS 인스턴스 보안을 위해서 현재 집 IP만 SSH 포트를 열어둔 상태였으며, OIDC도 AWS 관리형 SCP에 막혀 있기 때문에 GitHub Actions에서 AWS 인스턴스에 접근해 Action을 돌리는 구조가 불가능

또한 현재 AWS의 고정 IP는 인스턴스를 중지해도 비용이 나와서 활성화하지 않은 상태였기 때문에 인스턴스를 껐다 켜게 되면 다시 설정을 해줘야 했기 때문에 다른 방법으로 모색

<p style="text-align:center"><img src="/covers/solveroom/dev/cicd-flow.svg" alt="solveroom-cicd-flow" style="max-width:100%;height:auto"></p>

EC2에 설치한 GitHub self-hosted Runner를 활용해서 아래와 같은 형태로 CI/CD 설계

1. Runner가 GitHub에 연결한 채로 응답을 기다림(Long Polling)
2. 개발자가 GitHub에 코드를 Push하고 GitHub Actions가 테스트와 이미지 빌드가 끝나면, 이미지를 GHCR에 보관
3. GitHub를 바라보는 Runner가 배포 작업을 받아오면 EC2에서 작업 진행
4. Runner가 작업에 적힌 명령을 EC2에 직접 실행 진행
5. Runner가 실행 결과와 로그를 GitHub에 보내고 GitHub Actions 화면에서 표시

기본적으로 AWS의 보안 그룹은 인바운드 연결만 막고, 나가는 연결은 기본적으로 모두 허용하기 때문에 해당 방법 사용

EC2 → GitHub 구조로 바뀌어서 보안 그룹은 건드릴 필요 없이 CI/CD 구축 가능하며, 배포 단계는 GitHub Actions 과금 회피 가능

하지만 아래와 같은 단점이 존재

- 서버 자원을 나눠씀
  - 개발 단계에서는 우선 AWS 사용하고 서비스가 커지면 따로 서버용 미니 PC로 이전하기 때문에 괜찮다고 생각
- 여러 서버로 늘어나면 서버마다 Runner 필요
  - 초기 개발 단계에서는 해당 부분 문제 불필요. 만약 여러 대로 변경된다면 Runner 서버 1대 + SSM Run Command로 다른 EC2 변경 진행 등 구조 변경 필요

현재 개발 단계에서 CI/CD는 GitHub self-hosted Runner 형태로 가는 게 좋다고 판단

### 데이터베이스 ERD 관리

나중에 데이터베이스 테이블이 점점 많아지고 그에 따라 ERD를 관리하는 게 필수라고 생각을 했다

또한 AI를 활용하는 입장에서 ERD는 좋은 데이터가 되기 때문에 어떻게 관리할지 고민했다

1. **관리 포인트가 많으면 결국 안 지켜진다** → 실제로 프로젝트를 하며 경험해보니 개발 서버에 변경된 점이 운영 서버에 종종 누락되던 현상 발생
2. **ERD 그리는 곳과 테이블 만드는 곳이 분리되면 최신화는 반드시 실패한다** → 기존에는 다이어그램을 따로 관리해주니 서비스 테이블과 ERD가 불일치하는 현상 발생

결국 ERD를 그려주는 사이트 따로, 테이블 만드는 거 따로 이런 식으로 별도로 관리하게 되면 최신화는 실패할 거라고 생각하기 때문에

그렇기에 ERD와 데이터베이스 테이블이 동기화가 될 수 있는 부분을 중점으로 관리 방법에 대해서 모색했다

| 도구 | 후보로 올린 이유 |
|------|------------------|
| **Flyway** | 가장 널리 쓰이는 SQL 기반 마이그레이션. 자료가 풍부하고 Spring Boot 통합이 쉽다 |
| **Liquibase** | Flyway의 주요 대안. 롤백·이식성에서 다른 선택을 한 도구라 비교 가치가 있다 |
| **Atlas** | 선언형이라는 다른 접근. "스키마를 선언하면 알아서"가 원칙 2와 맞을 가능성이 있다 |
| **JPA(DDL-Auto)** | 이미 Spring Boot를 쓰고 있어 추가 도구 없이 가능한 선택지라 검토한다 |

우선 관리 포인트가 1곳이라는 점에서 부합하는 라이브러리 도구들을 대표적으로 4가지 정도로 추려냈다

가장 베스트는 SQL 기반으로 데이터베이스 테이블 동기화가 되며, 바로 SQL로 테이블 다이어그램도 쉽게 그려지는 것을 가장 중점적으로 분석했다

### Flyway

파일명 규칙을 이용해서 SQL 파일을 순서대로 적용하는 SQL 마이그레이션 라이브러리

데이터베이스의 변경사항을 추적하여 업데이트나, 롤백을 쉽게 해주며 간단하게 DB판 형상관리 툴이라고 보면 될 것 같다

기본적으로 flyway_schema_history 테이블에 적용 이력과 체크섬을 기록하며, 적용된 파일을 수정하면 실행이 멈추며, 접두사를 이용해서 DB 동기화를 진행한다

<div class="sfa sfa-6">
<style>
.sfa{--ink:#1f2937;--muted:#6b7280;--line:#e5e7eb;--panel:#f8fafc;--blue:#3b82f6;--blue-soft:#dbeafe;--orange:#f59e0b;--orange-soft:#fef3c7;--red:#ef4444;--red-soft:#fee2e2;--green:#10b981;--green-soft:#d1fae5;--purple:#8b5cf6;--purple-soft:#ede9fe;box-sizing:border-box;max-width:720px;margin:28px auto;padding:16px;background:#fff;border:1px solid var(--line);border-radius:14px;color:var(--ink);font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;line-height:1.55;text-align:left}
.sfa *{box-sizing:border-box}
.sfa-head{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:15px;font-weight:700;line-height:1.4}
.sfa-tag{flex:none;font-size:11px;font-weight:600;color:#1d4ed8;background:var(--blue-soft);padding:2px 8px;border-radius:999px}
.sfa svg.sfa-stage{display:block;width:100%;height:auto;max-width:none;margin:0;overflow:visible}
.sfa svg *{transition:opacity .5s ease,fill .4s ease,stroke .4s ease}
.sfa svg text{font-size:12px;fill:var(--ink);font-family:inherit}
.sfa .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.sfa .s11{font-size:11px}.sfa .s12{font-size:12px}.sfa .s13{font-size:13px}.sfa .s18{font-size:18px}
.sfa .tb{font-weight:700}
.sfa .c-muted{fill:var(--muted)}.sfa .c-blue{fill:#2563eb}.sfa .c-red{fill:#dc2626}.sfa .c-orange{fill:#d97706}.sfa .c-green{fill:#059669}.sfa .c-purple{fill:#7c3aed}.sfa .c-white{fill:#fff}
.sfa .mv{transition:opacity .5s ease,transform .9s cubic-bezier(.4,0,.2,1)}
.sfa .hide{opacity:0!important}
.sfa.noanim *{transition:none!important}
@media (max-width:480px){.sfa{padding:10px;border-radius:10px}}
.sfa-6 .panel{fill:var(--panel);stroke:var(--line)}
.sfa-6 .sep{stroke:var(--line)}
.sfa-6 .card{fill:#fff;stroke:var(--line);stroke-width:1.5}
.sfa-6 .bdg{opacity:0}
.sfa-6 .fc.applied .card{fill:var(--green-soft);stroke:var(--green)}
.sfa-6 .fc.applied .bdg{opacity:1;fill:#059669}
.sfa-6 .fc.skip .card{fill:var(--blue-soft);stroke:var(--blue);stroke-dasharray:4 3}
.sfa-6 .fc.skip .bdg{opacity:1;fill:#2563eb}
.sfa-6 .fc.bad .card{fill:var(--red-soft);stroke:var(--red);stroke-dasharray:none}
.sfa-6 .fc.bad .bdg{opacity:1;fill:#dc2626}
.sfa-6 .fc.bad .sum{fill:#dc2626;font-weight:700}
.sfa-6 .trect{fill:var(--blue-soft);stroke:var(--blue)}
.sfa-6 .pill{fill:var(--blue-soft);stroke:none}
.sfa-6 .pill-t{fill:#1d4ed8}
.sfa-6 .pill.bad{fill:var(--red-soft)}
.sfa-6 .pill-t.bad{fill:#dc2626}
.sfa-6 .arrow{stroke:var(--blue);stroke-width:2;fill:none}
.sfa-6 .ahead{fill:var(--blue);stroke:none}
.sfa-6 .arrow.bad{stroke:var(--red)}
.sfa-6 .ahead.bad{fill:var(--red)}
@keyframes sfa6flow{to{stroke-dashoffset:-24}}
.sfa-6 .arrow.run{stroke-dasharray:6 6;animation:sfa6flow .7s linear infinite}
.sfa-6 .hr.bad .hsum{fill:#dc2626;font-weight:700}
.sfa-6 .hr.bad .ok{fill:#dc2626}
.sfa-6 .cap.bad{fill:#dc2626;font-weight:700}
.sfa-6.noanim *{animation:none!important}
</style>
<svg class="sfa-stage" viewBox="0 0 640 368" role="img" aria-label="Flyway가 db/migration 폴더의 V1부터 V4까지 SQL 파일을 버전 순서대로 적용하고 flyway_schema_history 테이블에 버전과 체크섬을 기록한다. 다시 실행하면 이력에 있는 버전은 건너뛰고, 이미 적용된 파일을 수정하면 체크섬 불일치로 실행이 중단된다.">
<rect class="panel" x="16" y="40" width="188" height="296" rx="10"/>
<text class="mono s11 c-muted" x="28" y="62">db/migration/</text>
<g class="fc fc1">
  <rect class="card" x="28" y="78" width="164" height="42" rx="6"/>
  <text class="mono s12" x="38" y="95">V1__init.sql</text>
  <text class="mono s11 c-muted sum" x="38" y="112">a1f3</text>
  <text class="s11 tb bdg" x="182" y="112" text-anchor="end">적용</text>
</g>
<g class="fc fc2">
  <rect class="card" x="28" y="128" width="164" height="42" rx="6"/>
  <text class="mono s12" x="38" y="145">V2__add_card.sql</text>
  <text class="mono s11 c-muted sum" x="38" y="162">b2e7</text>
  <text class="s11 tb bdg" x="182" y="162" text-anchor="end">적용</text>
</g>
<g class="fc fc3">
  <rect class="card" x="28" y="178" width="164" height="42" rx="6"/>
  <text class="mono s12" x="38" y="195">V3__add_comment.sql</text>
  <text class="mono s11 c-muted sum" x="38" y="212">c9d1</text>
  <text class="s11 tb bdg" x="182" y="212" text-anchor="end">적용</text>
</g>
<g class="fc fc4 hide">
  <rect class="card" x="28" y="228" width="164" height="42" rx="6"/>
  <text class="mono s12" x="38" y="245">V4__add_reaction.sql</text>
  <text class="mono s11 c-muted sum" x="38" y="262">d4a8</text>
  <text class="s11 tb bdg" x="182" y="262" text-anchor="end">적용</text>
</g>
<line class="sep" x1="28" x2="192" y1="282" y2="282"/>
<text class="mono s12" x="28" y="302"><tspan class="c-blue tb">V2</tspan><tspan class="c-muted">__</tspan><tspan class="c-green tb">add_card</tspan><tspan class="c-muted">.sql</tspan></text>
<text class="s11" x="28" y="320"><tspan class="c-blue tb">버전</tspan><tspan class="c-muted"> · </tspan><tspan class="c-green tb">설명</tspan></text>
<rect class="pill" x="212" y="150" width="86" height="22" rx="11"/>
<text class="mono s11 tb pill-t" x="255" y="165" text-anchor="middle">migrate</text>
<path class="arrow" d="M214 194 H290"/>
<path class="ahead" d="M290 188 l10 6 l-10 6 z"/>
<rect class="panel" x="308" y="40" width="316" height="112" rx="10"/>
<text class="s11 c-muted" x="320" y="62">실제 DB 스키마</text>
<text class="s12 tb c-blue" x="612" y="62" text-anchor="end">v<tspan class="ver">0</tspan></text>
<g class="tbl t1 hide"><rect class="trect" x="324" y="80" width="64" height="52" rx="5"/><text class="mono s11" x="356" y="110" text-anchor="middle">user</text></g>
<g class="tbl t2 hide"><rect class="trect" x="400" y="80" width="64" height="52" rx="5"/><text class="mono s11" x="432" y="110" text-anchor="middle">card</text></g>
<g class="tbl t3 hide"><rect class="trect" x="476" y="80" width="64" height="52" rx="5"/><text class="mono s11" x="508" y="110" text-anchor="middle">comment</text></g>
<g class="tbl t4 hide"><rect class="trect" x="552" y="80" width="64" height="52" rx="5"/><text class="mono s11" x="584" y="110" text-anchor="middle">reaction</text></g>
<rect class="panel" x="308" y="168" width="316" height="168" rx="10"/>
<text class="mono s11 c-muted" x="320" y="190">flyway_schema_history</text>
<text class="s11 c-muted" x="326" y="212">version</text>
<text class="s11 c-muted" x="372" y="212">description</text>
<text class="s11 c-muted" x="508" y="212">checksum</text>
<line class="sep" x1="320" x2="612" y1="220" y2="220"/>
<g class="hr hr1 hide"><text class="mono s12" x="326" y="240">1</text><text class="mono s12" x="372" y="240">init</text><text class="mono s12 hsum" x="508" y="240">a1f3</text><text class="s12 tb c-green ok" x="612" y="240" text-anchor="end">✓</text></g>
<g class="hr hr2 hide"><text class="mono s12" x="326" y="264">2</text><text class="mono s12" x="372" y="264">add_card</text><text class="mono s12 hsum" x="508" y="264">b2e7</text><text class="s12 tb c-green ok" x="612" y="264" text-anchor="end">✓</text></g>
<g class="hr hr3 hide"><text class="mono s12" x="326" y="288">3</text><text class="mono s12" x="372" y="288">add_comment</text><text class="mono s12 hsum" x="508" y="288">c9d1</text><text class="s12 tb c-green ok" x="612" y="288" text-anchor="end">✓</text></g>
<g class="hr hr4 hide"><text class="mono s12" x="326" y="312">4</text><text class="mono s12" x="372" y="312">add_reaction</text><text class="mono s12 hsum" x="508" y="312">d4a8</text><text class="s12 tb c-green ok" x="612" y="312" text-anchor="end">✓</text></g>
<text class="cap s12 c-muted" x="320" y="358" text-anchor="middle">버전 순서대로 적용하고, 적용 이력을 테이블에 남긴다</text>
</svg>
<script>(function(){
var root=document.currentScript.closest('.sfa');
var NS='http://www.w3.org/2000/svg';
function q(s){return root.querySelector(s)}
function qa(s){return Array.prototype.slice.call(root.querySelectorAll(s))}
function els(s){return typeof s==='string'?qa(s):(Array.isArray(s)?s:[s])}
function vis(s,on){els(s).forEach(function(e){e.classList.toggle('hide',!on)})}
function cls(s,c,on){els(s).forEach(function(e){e.classList.toggle(c,on!==false)})}
function txt(s,t){els(s).forEach(function(e){e._tw=null;e.textContent=t})}
function mk(tag,a,parent){var e=document.createElementNS(NS,tag);for(var k in a)e.setAttribute(k,a[k]);if(parent)parent.appendChild(e);return e}
var gen=0,timers=[];
function instant(){return root.classList.contains('noanim')}
function later(fn,ms){if(instant())fn();else timers.push(setTimeout(fn,ms))}
function tween(s,a,b,ms,fmt){var el=q(s);fmt=fmt||function(v){return Math.round(v).toLocaleString('ko-KR')};el._tw=null;if(instant()||!ms){el.textContent=fmt(b);return}var g=gen,tok={};el._tw=tok;var t0=performance.now();(function f(now){if(g!==gen||el._tw!==tok)return;var p=Math.max(0,Math.min(1,(now-t0)/ms));el.textContent=fmt(a+(b-a)*p);if(p<1)requestAnimationFrame(f)})(t0)}
function snap(el,fn){el.style.transition='none';fn();void el.getBoundingClientRect();el.style.transition=''}
function player(steps,reset){
  var idx=-1,timer=null,visible=!('IntersectionObserver' in window);
  function go(k){
    clearTimeout(timer);
    if(idx>=0&&k===idx+1)steps[k].run();
    else{gen++;timers.forEach(clearTimeout);timers=[];root.classList.add('noanim');reset();for(var j=0;j<=k;j++)steps[j].run();void root.offsetWidth;root.classList.remove('noanim')}
    idx=k;tick();
  }
  function tick(){clearTimeout(timer);if(visible)timer=setTimeout(function(){go(idx+1<steps.length?idx+1:0)},steps[idx].d*.8)}
  if(!visible)new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)tick();else clearTimeout(timer)},{threshold:.35}).observe(root);
  go(0);
}
function reset(){
  qa('.fc').forEach(function(e){e.classList.remove('applied','skip','bad')});
  qa('.hr').forEach(function(e){e.classList.remove('bad')});
  txt('.fc2 .sum','b2e7');
  vis('.fc4',false);
  vis('.t1,.t2,.t3,.t4',false);
  vis('.hr1,.hr2,.hr3,.hr4',false);
  vis('.pill,.pill-t,.arrow,.ahead',false);
  cls('.arrow','run',false);
  cls('.pill,.pill-t,.arrow,.ahead','bad',false);
  txt('.pill-t','migrate');
  txt('.ver','0');
  txt('.cap','버전 순서대로 적용하고, 적용 이력을 테이블에 남긴다');
  cls('.cap','bad',false);
}
function apply(fc,tbl,hr,from){
  cls(fc,'applied');txt(fc+' .bdg','적용');
  vis(tbl,true);vis(hr,true);tween('.ver',from,from+1,500);
}
player([
{d:3600,run:function(){
  vis('.pill,.pill-t,.arrow,.ahead',true);cls('.arrow','run');
  later(function(){apply('.fc1','.t1','.hr1',0)},800);
}},
{d:2600,run:function(){apply('.fc2','.t2','.hr2',1)}},
{d:3200,run:function(){
  apply('.fc3','.t3','.hr3',2);
  cls('.arrow','run',false);
  txt('.cap','버전과 체크섬이 이력에 남아 어느 환경에서도 같은 순서로 재현된다');
}},
{d:4000,run:function(){
  txt('.cap','다시 실행해도 이력에 있는 버전은 건너뛴다');
  cls('.arrow','run');
  ['.fc1','.fc2','.fc3'].forEach(function(s,i){
    later(function(){cls(s,'applied',false);cls(s,'skip');txt(s+' .bdg','건너뜀')},300+i*280);
  });
  later(function(){cls('.arrow','run',false)},1700);
}},
{d:3800,run:function(){
  txt('.cap','새 파일을 추가하면 그 버전만 적용된다');
  vis('.fc4',true);
  later(function(){
    cls('.arrow','run');
    apply('.fc4','.t4','.hr4',3);
    later(function(){cls('.arrow','run',false)},1300);
  },900);
}},
{d:4800,run:function(){
  txt('.cap','적용된 파일을 수정하면 체크섬이 달라져 실행이 중단된다');
  cls('.cap','bad');
  txt('.fc2 .sum','f0c2');
  cls('.fc2','skip',false);cls('.fc2','bad');txt('.fc2 .bdg','수정됨');
  later(function(){
    cls('.hr2','bad');
    cls('.pill,.pill-t,.arrow,.ahead','bad');
    txt('.pill-t','중단');
  },1000);
}}
],reset);
})();</script>
</div>

Flyway의 좋은 점은 관리 포인트가 SQL 파일 1종이며, 접두사를 이용해 SQL을 핸들링하기 때문에 러닝커브가 낮고 비교적 많이 쓰이는 라이브러리여서 정보들이 많은 점이 좋았다

또한 Spring Boot에서 쉽게 라이브러리를 받아 사용할 수 있는 도입 비용 자체로도 라이트해서 도입 1순위라고 생각했다

그리고 종종 DB 테이블 업데이트 진행하던 도중에 테이블을 동시에 바꿔 충돌했던 적이 몇 번 있었는데 규모가 커지고 같이 작업하는 사람들이 있을 경우 유연하게 대처할 수 있겠다는 점이 좋았다

하지만 단점 또한 명확했는데

동작 방식 자체가 Spring Boot 테스트에서 컨텍스트가 뜰 때마다 마이그레이션 전체 파일이 동작하기 때문에 파일이 많아지면 빌드가 느려질 수 있으며, DB를 직접 건드리게 되면 수동 변경을 감지 못한다는 문제들이 있었다

느려지는 현상은 스키마 캐싱, 수동 변경은 권한 설정을 통해서 어느 정도 해결될 수 있다고 생각했기 때문에 적용하기 가장 유력한 라이브러리였다

### Liquibase

변경을 changeSet 단위로 선언하고, DB별 DDL로 변환해 적용한다.

changeSet에 변경할 내용을 작성하고 preConditions에 변경 전 기술, changes에는 변경 내용 작성으로 데이터베이스에 변경 이력을 관리하는 라이브러리라고 볼 수 있다

<div class="sfa sfa-8">
<style>
.sfa{--ink:#1f2937;--muted:#6b7280;--line:#e5e7eb;--panel:#f8fafc;--blue:#3b82f6;--blue-soft:#dbeafe;--orange:#f59e0b;--orange-soft:#fef3c7;--red:#ef4444;--red-soft:#fee2e2;--green:#10b981;--green-soft:#d1fae5;--purple:#8b5cf6;--purple-soft:#ede9fe;box-sizing:border-box;max-width:720px;margin:28px auto;padding:16px;background:#fff;border:1px solid var(--line);border-radius:14px;color:var(--ink);font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;line-height:1.55;text-align:left}
.sfa *{box-sizing:border-box}
.sfa-head{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:15px;font-weight:700;line-height:1.4}
.sfa-tag{flex:none;font-size:11px;font-weight:600;color:#1d4ed8;background:var(--blue-soft);padding:2px 8px;border-radius:999px}
.sfa svg.sfa-stage{display:block;width:100%;height:auto;max-width:none;margin:0;overflow:visible}
.sfa svg *{transition:opacity .5s ease,fill .4s ease,stroke .4s ease}
.sfa svg text{font-size:12px;fill:var(--ink);font-family:inherit}
.sfa .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.sfa .s11{font-size:11px}.sfa .s12{font-size:12px}.sfa .s13{font-size:13px}.sfa .s18{font-size:18px}
.sfa .tb{font-weight:700}
.sfa .c-muted{fill:var(--muted)}.sfa .c-blue{fill:#2563eb}.sfa .c-red{fill:#dc2626}.sfa .c-orange{fill:#d97706}.sfa .c-green{fill:#059669}.sfa .c-purple{fill:#7c3aed}.sfa .c-white{fill:#fff}
.sfa .mv{transition:opacity .5s ease,transform .9s cubic-bezier(.4,0,.2,1)}
.sfa .hide{opacity:0!important}
.sfa.noanim *{transition:none!important}
@media (max-width:480px){.sfa{padding:10px;border-radius:10px}}
.sfa-8 .panel{fill:var(--panel);stroke:var(--line)}
.sfa-8 .sep{stroke:var(--line)}
.sfa-8 .dbox{fill:#fff;stroke:var(--line)}
.sfa-8 .prebox{fill:var(--orange-soft);stroke:var(--orange);stroke-dasharray:4 3}
.sfa-8 .chgbox{fill:var(--blue-soft);stroke:var(--blue);stroke-dasharray:4 3}
.sfa-8 .arrow{stroke:var(--blue);stroke-width:2;fill:none}
.sfa-8 .ahead{fill:var(--blue);stroke:none}
.sfa-8 .pchk{fill:#059669}
.sfa-8 .pill{fill:var(--blue-soft);stroke:none}
.sfa-8 .pill-t{fill:#1d4ed8}
.sfa-8 .pill.rb{fill:var(--purple-soft)}
.sfa-8 .pill-t.rb{fill:#7c3aed}
.sfa-8 .ddl.undo .dbox{fill:var(--purple-soft);stroke:var(--purple)}
.sfa-8 .strike{stroke:var(--purple);stroke-width:2}
.sfa-8 .hrow.undo text{fill:var(--muted)}
.sfa-8 .hrow.undo .ok{fill:var(--purple)}
.sfa-8 .cap.ok{fill:#059669;font-weight:700}
.sfa-8 .cap.rb{fill:#7c3aed;font-weight:700}
@keyframes sfa8flow{to{stroke-dashoffset:-20}}
.sfa-8 .arrow.run{stroke-dasharray:6 6;animation:sfa8flow .7s linear infinite}
.sfa-8.noanim *{animation:none!important}
</style>
<svg class="sfa-stage" viewBox="0 0 640 404" role="img" aria-label="Liquibase는 changeSet 단위로 변경을 선언한다. id와 author로 식별하고, preConditions로 변경 전 조건을 먼저 검사한 뒤, changes의 추상 선언을 각 데이터베이스에 맞는 DDL로 변환해 적용한다. 같은 createTable 선언이 MySQL에서는 AUTO_INCREMENT, PostgreSQL에서는 BIGSERIAL로 나간다. 적용 이력은 id와 author, 체크섬과 함께 DATABASECHANGELOG 테이블에 기록되고, 표준 changeSet은 역연산을 추론해 롤백할 수 있다.">
<rect class="panel" x="16" y="40" width="240" height="236" rx="10"/>
<rect class="prebox hide" x="24" y="104" width="224" height="54" rx="4"/>
<rect class="chgbox hide" x="24" y="160" width="224" height="110" rx="4"/>
<text class="mono s11 c-purple tb" x="28" y="62">- changeSet:</text>
<text class="mono s11" x="28" y="80">    id: 2</text>
<text class="mono s11" x="28" y="98">    author: hyeonchul</text>
<text class="mono s11 c-orange tb pre" x="28" y="120">    preConditions:</text>
<text class="mono s11 pre" x="28" y="138">      not tableExists:</text>
<text class="mono s11 pre" x="28" y="156">        reaction</text>
<text class="mono s11 c-blue tb chg" x="28" y="176">    changes:</text>
<text class="mono s11 chg" x="28" y="194">      createTable:</text>
<text class="mono s11 chg" x="28" y="212">        tableName:</text>
<text class="mono s11 chg" x="28" y="230">          reaction</text>
<text class="mono s11 chg" x="28" y="248">        columns:</text>
<text class="mono s11 chg" x="28" y="266">          id, card_id</text>
<rect class="pill" x="262" y="46" width="84" height="22" rx="11"/>
<text class="mono s11 tb pill-t" x="304" y="61" text-anchor="middle">update</text>
<text class="s11 tb pchk hide" x="304" y="134" text-anchor="middle">✓ 통과</text>
<path class="arrow a1 hide" d="M254 212 C 300 212, 312 102, 344 100"/>
<path class="ahead h1 hide" d="M344 94 l9 6 l-9 6 z"/>
<path class="arrow a2 hide" d="M254 216 C 304 216, 318 210, 344 210"/>
<path class="ahead h2 hide" d="M344 204 l9 6 l-9 6 z"/>
<text class="s11 c-muted conv hide" x="300" y="252" text-anchor="middle">DB별 DDL 변환</text>
<g class="ddl my hide">
  <rect class="dbox" x="352" y="40" width="272" height="106" rx="8"/>
  <text class="s11 tb c-blue" x="364" y="60">MySQL</text>
  <text class="mono s11" x="364" y="82">CREATE TABLE reaction (</text>
  <text class="mono s11" x="364" y="100">  id       BIGINT <tspan class="c-red tb">AUTO_INCREMENT</tspan>,</text>
  <text class="mono s11" x="364" y="118">  card_id  BIGINT NOT NULL</text>
  <text class="mono s11" x="364" y="136">)</text>
</g>
<g class="ddl pg hide">
  <rect class="dbox" x="352" y="158" width="272" height="106" rx="8"/>
  <text class="s11 tb c-green" x="364" y="178">PostgreSQL</text>
  <text class="mono s11" x="364" y="200">CREATE TABLE reaction (</text>
  <text class="mono s11" x="364" y="218">  id       <tspan class="c-red tb">BIGSERIAL</tspan>,</text>
  <text class="mono s11" x="364" y="236">  card_id  BIGINT NOT NULL</text>
  <text class="mono s11" x="364" y="254">)</text>
</g>
<rect class="panel" x="16" y="288" width="608" height="84" rx="10"/>
<text class="mono s11 c-muted" x="28" y="308">DATABASECHANGELOG</text>
<text class="s11 c-muted" x="36" y="330">ID</text>
<text class="s11 c-muted" x="120" y="330">AUTHOR</text>
<text class="s11 c-muted" x="280" y="330">MD5SUM</text>
<line class="sep" x1="30" x2="610" y1="338" y2="338"/>
<g class="hrow hide">
  <text class="mono s12" x="36" y="360">2</text>
  <text class="mono s12" x="120" y="360">hyeonchul</text>
  <text class="mono s12" x="280" y="360">9:a3f1c8d2e7b4</text>
  <text class="s12 tb c-green ok" x="604" y="360" text-anchor="end">✓</text>
</g>
<line class="strike hide" x1="30" x2="610" y1="356" y2="356"/>
<text class="cap s12 c-muted" x="320" y="394" text-anchor="middle">변경을 changeSet 단위로 선언한다 — id와 author로 식별한다</text>
</svg>
<script>(function(){
var root=document.currentScript.closest('.sfa');
var NS='http://www.w3.org/2000/svg';
function q(s){return root.querySelector(s)}
function qa(s){return Array.prototype.slice.call(root.querySelectorAll(s))}
function els(s){return typeof s==='string'?qa(s):(Array.isArray(s)?s:[s])}
function vis(s,on){els(s).forEach(function(e){e.classList.toggle('hide',!on)})}
function cls(s,c,on){els(s).forEach(function(e){e.classList.toggle(c,on!==false)})}
function txt(s,t){els(s).forEach(function(e){e._tw=null;e.textContent=t})}
function mk(tag,a,parent){var e=document.createElementNS(NS,tag);for(var k in a)e.setAttribute(k,a[k]);if(parent)parent.appendChild(e);return e}
var gen=0,timers=[];
function instant(){return root.classList.contains('noanim')}
function later(fn,ms){if(instant())fn();else timers.push(setTimeout(fn,ms))}
function tween(s,a,b,ms,fmt){var el=q(s);fmt=fmt||function(v){return Math.round(v).toLocaleString('ko-KR')};el._tw=null;if(instant()||!ms){el.textContent=fmt(b);return}var g=gen,tok={};el._tw=tok;var t0=performance.now();(function f(now){if(g!==gen||el._tw!==tok)return;var p=Math.max(0,Math.min(1,(now-t0)/ms));el.textContent=fmt(a+(b-a)*p);if(p<1)requestAnimationFrame(f)})(t0)}
function snap(el,fn){el.style.transition='none';fn();void el.getBoundingClientRect();el.style.transition=''}
function player(steps,reset){
  var idx=-1,timer=null,visible=!('IntersectionObserver' in window);
  function go(k){
    clearTimeout(timer);
    if(idx>=0&&k===idx+1)steps[k].run();
    else{gen++;timers.forEach(clearTimeout);timers=[];root.classList.add('noanim');reset();for(var j=0;j<=k;j++)steps[j].run();void root.offsetWidth;root.classList.remove('noanim')}
    idx=k;tick();
  }
  function tick(){clearTimeout(timer);if(visible)timer=setTimeout(function(){go(idx+1<steps.length?idx+1:0)},steps[idx].d*.8)}
  if(!visible)new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)tick();else clearTimeout(timer)},{threshold:.35}).observe(root);
  go(0);
}
function cap(t,tone){
  txt('.cap',t);
  cls('.cap','ok',tone==='ok');
  cls('.cap','rb',tone==='rb');
}
function reset(){
  vis('.prebox,.chgbox,.pchk,.conv,.hrow,.strike',false);
  vis('.a1,.h1,.a2,.h2',false);
  vis('.ddl',false);
  cls('.arrow','run',false);
  cls('.ddl','undo',false);
  cls('.hrow','undo',false);
  cls('.pill,.pill-t','rb',false);
  txt('.pill-t','update');
  cap('변경을 changeSet 단위로 선언한다 — id와 author로 식별한다');
}
player([
{d:3400,run:function(){}},
{d:3600,run:function(){
  cap('preConditions로 변경 전 조건을 먼저 검사한다');
  vis('.prebox',true);
  later(function(){vis('.pchk',true)},1200);
}},
{d:4000,run:function(){
  cap('changes는 추상 선언이라, 각 DB에 맞는 DDL로 번역된다');
  vis('.chgbox,.conv',true);
  later(function(){
    vis('.a1,.h1',true);cls('.a1','run');
    later(function(){vis('.my',true);cls('.a1','run',false)},900);
  },500);
}},
{d:3800,run:function(){
  cap('같은 선언이 MySQL은 AUTO_INCREMENT, PostgreSQL은 BIGSERIAL로 나간다','ok');
  vis('.a2,.h2',true);cls('.a2','run');
  later(function(){vis('.pg',true);cls('.a2','run',false)},900);
}},
{d:3600,run:function(){
  cap('적용 이력은 id · author · 체크섬으로 DATABASECHANGELOG에 남는다');
  vis('.hrow',true);
}},
{d:4600,run:function(){
  cap('표준 changeSet은 역연산을 추론해 롤백할 수 있다 — Flyway와 다른 점','rb');
  cls('.pill,.pill-t','rb');txt('.pill-t','rollback');
  later(function(){
    cls('.ddl','undo');cls('.hrow','undo');vis('.strike',true);
  },900);
  later(function(){vis('.ddl',false)},2200);
}}
],reset);
})();</script>
</div>

Liquibase는 Flyway보다 무료로 사용할 수 있는 기능이 많았는데, 스키마 비교, 실제 적용될 SQL 미리보기, 이미 존재하는 DB에서 changelog 뽑아내기 등 Flyway에서는 유료로 지원하는 기능을 무료로 사용할 수 있었다

그리고 preConditions를 이용해서 “어느 테이블이 없을 때만 실행” 같은 조건을 미리 걸 수 있기 때문에 환경이 다를 경우 조건을 걸어 안전하게 적용할 수 있었다

장점이 큰 만큼 단점도 명확했는데 가장 큰 점은 관리해야 될 파일이 Flyway 대비 많이 늘어난다는 것이었다

changeLog + SQL 두 종류로 늘어나며, SQL 여섯 줄 정도면 끝날 작업이 yaml로 작업하기 때문에 코드가 길어진다는 것이었다

그리고 작업 스키마를 SSOT 기반으로 AI가 작업하기 위한 소스로 던져줄 생각이었는데 순수 SQL이면 바로 읽히지만 Liquibase는 changelog를 읽고 스키마를 파악하고 실제로 어떤 DDL이 되는지 기타 작업이 더 들어갈 것으로 생각돼서 효율이 좋다고 생각은 못 했다

그래도 여러 DB 동시 지원, 롤백(Flyway는 유료 기능) 등 다양한 기능을 제공해주기 때문에 Liquibase도 적합하다고 생각했다

### Atlas

원하는 최종 스키마를 선언하면, 현재 상태와 비교해 마이그레이션을 자동 생성한다.

Flyway와 Liquibase가 "무엇을 어떻게 바꿀지"를 쌓아올리는 방식이라면 Atlas는 "최종적으로 어떤 모습이어야 하는지"만 적어두는 방식이다. 선언한 스키마와 실제 DB 상태를 비교해서 그 차이만큼의 마이그레이션을 알아서 만들어주기 때문에, 마이그레이션 파일조차 내가 쓰는 게 아니라 생성물이 된다.

<div class="sfa sfa-9">
<style>
.sfa{--ink:#1f2937;--muted:#6b7280;--line:#e5e7eb;--panel:#f8fafc;--blue:#3b82f6;--blue-soft:#dbeafe;--orange:#f59e0b;--orange-soft:#fef3c7;--red:#ef4444;--red-soft:#fee2e2;--green:#10b981;--green-soft:#d1fae5;--purple:#8b5cf6;--purple-soft:#ede9fe;box-sizing:border-box;max-width:720px;margin:28px auto;padding:16px;background:#fff;border:1px solid var(--line);border-radius:14px;color:var(--ink);font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;line-height:1.55;text-align:left}
.sfa *{box-sizing:border-box}
.sfa-head{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:15px;font-weight:700;line-height:1.4}
.sfa-tag{flex:none;font-size:11px;font-weight:600;color:#1d4ed8;background:var(--blue-soft);padding:2px 8px;border-radius:999px}
.sfa svg.sfa-stage{display:block;width:100%;height:auto;max-width:none;margin:0;overflow:visible}
.sfa svg *{transition:opacity .5s ease,fill .4s ease,stroke .4s ease}
.sfa svg text{font-size:12px;fill:var(--ink);font-family:inherit}
.sfa .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.sfa .s11{font-size:11px}.sfa .s12{font-size:12px}.sfa .s13{font-size:13px}.sfa .s18{font-size:18px}
.sfa .tb{font-weight:700}
.sfa .c-muted{fill:var(--muted)}.sfa .c-blue{fill:#2563eb}.sfa .c-red{fill:#dc2626}.sfa .c-orange{fill:#d97706}.sfa .c-green{fill:#059669}.sfa .c-purple{fill:#7c3aed}.sfa .c-white{fill:#fff}
.sfa .mv{transition:opacity .5s ease,transform .9s cubic-bezier(.4,0,.2,1)}
.sfa .hide{opacity:0!important}
.sfa.noanim *{transition:none!important}
@media (max-width:480px){.sfa{padding:10px;border-radius:10px}}
.sfa-9 .panel{fill:var(--panel);stroke:var(--line)}
.sfa-9 .dbox{fill:#fff;stroke:var(--purple);stroke-width:1.5}
.sfa-9 .arrow{stroke:var(--purple);stroke-width:2;fill:none}
.sfa-9 .ahead{fill:var(--purple);stroke:none}
.sfa-9 .declnew{fill:#2563eb;font-weight:700}
.sfa-9 .dbnew{fill:#059669;font-weight:700}
.sfa-9 .dbman{fill:#dc2626;font-weight:700}
.sfa-9 .dstat{fill:#059669}
.sfa-9 .dstat.diff{fill:#d97706}
.sfa-9 .badge{fill:#7c3aed}
.sfa-9 .mig,.sfa-9 .migsql{fill:#7c3aed}
.sfa-9 .apl{fill:#059669}
.sfa-9 .cap.on{fill:#2563eb;font-weight:700}
.sfa-9 .cap.ok{fill:#059669;font-weight:700}
.sfa-9 .cap.warn{fill:#d97706;font-weight:700}
@keyframes sfa9flow{to{stroke-dashoffset:-20}}
.sfa-9 .arrow.run{stroke-dasharray:6 6;animation:sfa9flow .7s linear infinite}
.sfa-9.noanim *{animation:none!important}
</style>
<svg class="sfa-stage" viewBox="0 0 640 404" role="img" aria-label="Atlas는 원하는 최종 스키마를 선언해두고 실제 DB 상태와 비교한다. 선언에 컬럼을 추가하면 atlas migrate diff가 차이를 찾아내고, 그 차이만큼의 마이그레이션 파일을 자동으로 생성한다. 적용하면 선언과 실제가 다시 일치한다. 비교가 동작의 본질이라, 누군가 DB를 직접 바꿔 생긴 수동 변경도 같은 비교 과정에서 저절로 드러난다.">
<rect class="panel" x="16" y="40" width="216" height="150" rx="10"/>
<text class="s11 c-muted" x="28" y="62">schema.sql · 원하는 최종 모습</text>
<text class="mono s11" x="28" y="86">CREATE TABLE card (</text>
<text class="mono s11" x="28" y="106">  id         BIGINT,</text>
<text class="mono s11" x="28" y="126">  name       VARCHAR(100),</text>
<text class="mono s11 declnew hide" x="28" y="146">  thumbnail  VARCHAR(255)</text>
<text class="mono s11" x="28" y="166">)</text>
<path class="arrow aL" d="M236 120 H250"/>
<path class="ahead" d="M250 114 l9 6 l-9 6 z"/>
<path class="arrow aR" d="M404 120 H390"/>
<path class="ahead" d="M390 114 l-9 6 l9 6 z"/>
<rect class="dbox" x="256" y="92" width="128" height="56" rx="8"/>
<text class="mono s11 tb" x="320" y="114" text-anchor="middle">migrate diff</text>
<text class="s11 tb dstat" x="320" y="134" text-anchor="middle">일치</text>
<rect class="panel" x="408" y="40" width="216" height="150" rx="10"/>
<text class="s11 c-muted" x="420" y="62">실제 DB · 현재 상태</text>
<text class="mono s12 tb" x="420" y="86">card</text>
<text class="mono s11" x="420" y="106">  id         BIGINT</text>
<text class="mono s11" x="420" y="126">  name       VARCHAR(100)</text>
<text class="mono s11 dbnew hide" x="420" y="146">  thumbnail  VARCHAR(255)</text>
<text class="mono s11 dbman hide" x="420" y="166">  legacy_col VARCHAR(50)</text>
<path class="arrow aD hide" d="M320 152 V202"/>
<path class="ahead hide aDh" d="M314 202 l6 9 l6 -9 z"/>
<rect class="panel" x="16" y="216" width="556" height="86" rx="10"/>
<text class="s11 c-muted" x="28" y="236">자동 생성된 마이그레이션</text>
<text class="s11 tb badge hide" x="560" y="236" text-anchor="end">사람이 쓰지 않는다</text>
<text class="mono s11 mig hide" x="28" y="262">20261010150000_add_thumbnail.sql</text>
<text class="mono s11 migsql hide" x="28" y="288">ALTER TABLE card ADD COLUMN thumbnail VARCHAR(255);</text>
<path class="arrow aU hide" d="M600 212 V198"/>
<path class="ahead aUh hide" d="M594 198 l6 -9 l6 9 z"/>
<text class="s11 tb apl hide" x="600" y="232" text-anchor="middle">apply</text>
<rect class="panel drift hide" x="16" y="314" width="608" height="56" rx="10"/>
<text class="s11 tb c-orange drift hide" x="28" y="336">drift도 같은 원리로 드러난다</text>
<text class="s11 drift hide" x="28" y="358">선언과 실제를 비교하는 게 동작의 본질이라, 누가 DB를 직접 바꿔도 diff에 바로 나타난다</text>
<text class="cap s12 c-muted" x="320" y="392" text-anchor="middle">바꾸고 싶은 최종 모습을 선언해두고, 실제 DB 상태와 비교한다</text>
</svg>
<script>(function(){
var root=document.currentScript.closest('.sfa');
var NS='http://www.w3.org/2000/svg';
function q(s){return root.querySelector(s)}
function qa(s){return Array.prototype.slice.call(root.querySelectorAll(s))}
function els(s){return typeof s==='string'?qa(s):(Array.isArray(s)?s:[s])}
function vis(s,on){els(s).forEach(function(e){e.classList.toggle('hide',!on)})}
function cls(s,c,on){els(s).forEach(function(e){e.classList.toggle(c,on!==false)})}
function txt(s,t){els(s).forEach(function(e){e._tw=null;e.textContent=t})}
function mk(tag,a,parent){var e=document.createElementNS(NS,tag);for(var k in a)e.setAttribute(k,a[k]);if(parent)parent.appendChild(e);return e}
var gen=0,timers=[];
function instant(){return root.classList.contains('noanim')}
function later(fn,ms){if(instant())fn();else timers.push(setTimeout(fn,ms))}
function tween(s,a,b,ms,fmt){var el=q(s);fmt=fmt||function(v){return Math.round(v).toLocaleString('ko-KR')};el._tw=null;if(instant()||!ms){el.textContent=fmt(b);return}var g=gen,tok={};el._tw=tok;var t0=performance.now();(function f(now){if(g!==gen||el._tw!==tok)return;var p=Math.max(0,Math.min(1,(now-t0)/ms));el.textContent=fmt(a+(b-a)*p);if(p<1)requestAnimationFrame(f)})(t0)}
function snap(el,fn){el.style.transition='none';fn();void el.getBoundingClientRect();el.style.transition=''}
function player(steps,reset){
  var idx=-1,timer=null,visible=!('IntersectionObserver' in window);
  function go(k){
    clearTimeout(timer);
    if(idx>=0&&k===idx+1)steps[k].run();
    else{gen++;timers.forEach(clearTimeout);timers=[];root.classList.add('noanim');reset();for(var j=0;j<=k;j++)steps[j].run();void root.offsetWidth;root.classList.remove('noanim')}
    idx=k;tick();
  }
  function tick(){clearTimeout(timer);if(visible)timer=setTimeout(function(){go(idx+1<steps.length?idx+1:0)},steps[idx].d*.8)}
  if(!visible)new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)tick();else clearTimeout(timer)},{threshold:.35}).observe(root);
  go(0);
}
function cap(t,tone){
  txt('.cap',t);
  cls('.cap','on',tone==='on');
  cls('.cap','ok',tone==='ok');
  cls('.cap','warn',tone==='warn');
}
function stat(t,isdiff){txt('.dstat',t);cls('.dstat','diff',isdiff)}
function reset(){
  vis('.declnew,.dbnew,.dbman',false);
  vis('.aD,.aDh,.aU,.aUh,.apl',false);
  vis('.mig,.migsql,.badge,.drift',false);
  cls('.arrow','run',false);
  stat('일치',false);
  cap('바꾸고 싶은 최종 모습을 선언해두고, 실제 DB 상태와 비교한다');
}
player([
{d:3200,run:function(){}},
{d:3600,run:function(){
  cap('변경 과정이 아니라 "최종 모습"을 고친다','on');
  vis('.declnew',true);
  later(function(){stat('차이 1건',true)},900);
}},
{d:3400,run:function(){
  cap('atlas migrate diff 가 선언과 실제를 비교한다');
  cls('.aL,.aR','run');
  later(function(){cls('.aL,.aR','run',false)},1800);
}},
{d:4000,run:function(){
  cap('차이만큼의 마이그레이션이 자동 생성된다 — 사람이 SQL을 쓰지 않는다');
  vis('.aD,.aDh',true);cls('.aD','run');
  later(function(){
    vis('.mig',true);
    later(function(){vis('.migsql,.badge',true);cls('.aD','run',false)},600);
  },700);
}},
{d:3800,run:function(){
  cap('적용하면 선언과 실제가 다시 일치한다','ok');
  vis('.aU,.aUh,.apl',true);cls('.aU','run');
  later(function(){
    vis('.dbnew',true);stat('일치',false);cls('.aU','run',false);
  },900);
}},
{d:4800,run:function(){
  cap('비교가 동작의 본질이라, 수동 변경도 저절로 드러난다','warn');
  vis('.dbman',true);
  later(function(){stat('차이 1건',true);vis('.drift',true)},1000);
}}
],reset);
})();</script>
</div>

처음 보고 가장 끌렸던 부분은 ERD 관리라는 원래 목적에 가장 직접적으로 맞닿아 있다는 점이었다. Flyway를 쓰면 마이그레이션이 쌓일수록 "지금 card 테이블이 어떻게 생겼는지"를 알려면 파일을 전부 거슬러 읽거나 DB에 접속해야 하는데, Atlas는 선언 파일 하나만 열면 그게 현재 모습이다. 관리 포인트를 최소화하고 SSOT를 하나로 두겠다는 기준으로 보면 가장 이상적인 형태였다.

drift 문제도 구조적으로 덜 생긴다. Flyway는 "내가 적용한 것"만 알고 실제가 어떤지는 모르기 때문에 수동 변경을 감지하려면 별도 장치를 붙여야 하는데, Atlas는 선언과 실제를 비교하는 것 자체가 동작의 본질이라 누가 DB를 직접 바꿔도 다음 diff에서 바로 드러난다. Flyway 쪽에서 권한 분리와 스키마 비교 스크립트로 메워야 했던 부분이 여기서는 기본 동작에 포함되어 있는 셈이다.

가장 내가 원하는 이상적인 형태를 잘 구현한 라이브러리라고 생각했지만 아래와 같은 이유 때문에 고민이 좀 되었다

차이를 계산해서 DDL을 만들어주는 건 편하지만, 그 생성된 DDL이 내 의도와 같은지는 매번 확인해야 한다. 결국 생성 결과를 읽고 판단하는 책임은 그대로 남는다. 명령형에서는 내가 쓴 SQL이 그대로 실행되니 적어도 예측은 확실해서 걱정이 없지만 뭔가 자동으로 생성해준다는 것 자체가 나한테는 너무 큰 불안 요소였다

이러한 이유 때문에 Atlas는 보류했다. 다만 완전히 접은 건 아니고, Atlas는 Flyway 형식의 마이그레이션 디렉터리도 읽을 수 있어서 schema diff 기능만 떼어 쓰는 것도 가능하다. 수동 변경을 감지하는 용도로만 붙이면 직접 비교 스크립트를 쓰는 것보다는 좋겠다고 생각을 해서 부분 도입을 고려해보기로 했다

### JPA(DDL-Auto)

엔티티 정의를 보고 Hibernate가 테이블을 직접 만들고 바꾼다.

Spring Boot를 쓰고 있으면 이미 있는 선택지라서 가장 먼저 검토했다. 별도 라이브러리를 받을 필요도 없고 설정 한 줄이면 되고, 엔티티만 관리하면 되니 관리 포인트로만 따지면 앞에서 본 어떤 도구보다도 적다.

<div class="sfa sfa-10">
<style>
.sfa{--ink:#1f2937;--muted:#6b7280;--line:#e5e7eb;--panel:#f8fafc;--blue:#3b82f6;--blue-soft:#dbeafe;--orange:#f59e0b;--orange-soft:#fef3c7;--red:#ef4444;--red-soft:#fee2e2;--green:#10b981;--green-soft:#d1fae5;--purple:#8b5cf6;--purple-soft:#ede9fe;box-sizing:border-box;max-width:720px;margin:28px auto;padding:16px;background:#fff;border:1px solid var(--line);border-radius:14px;color:var(--ink);font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;line-height:1.55;text-align:left}
.sfa *{box-sizing:border-box}
.sfa-head{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:15px;font-weight:700;line-height:1.4}
.sfa-tag{flex:none;font-size:11px;font-weight:600;color:#1d4ed8;background:var(--blue-soft);padding:2px 8px;border-radius:999px}
.sfa svg.sfa-stage{display:block;width:100%;height:auto;max-width:none;margin:0;overflow:visible}
.sfa svg *{transition:opacity .5s ease,fill .4s ease,stroke .4s ease}
.sfa svg text{font-size:12px;fill:var(--ink);font-family:inherit}
.sfa .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.sfa .s11{font-size:11px}.sfa .s12{font-size:12px}.sfa .s13{font-size:13px}.sfa .s18{font-size:18px}
.sfa .tb{font-weight:700}
.sfa .c-muted{fill:var(--muted)}.sfa .c-blue{fill:#2563eb}.sfa .c-red{fill:#dc2626}.sfa .c-orange{fill:#d97706}.sfa .c-green{fill:#059669}.sfa .c-purple{fill:#7c3aed}.sfa .c-white{fill:#fff}
.sfa .mv{transition:opacity .5s ease,transform .9s cubic-bezier(.4,0,.2,1)}
.sfa .hide{opacity:0!important}
.sfa.noanim *{transition:none!important}
@media (max-width:480px){.sfa{padding:10px;border-radius:10px}}
.sfa-10 .panel{fill:var(--panel);stroke:var(--line)}
.sfa-10 .pill{fill:var(--orange-soft);stroke:none}
.sfa-10 .pill-t{fill:#d97706}
.sfa-10 .pill.val{fill:var(--green-soft)}
.sfa-10 .pill-t.val{fill:#059669}
.sfa-10 .mlabel{fill:#d97706}
.sfa-10 .mlabel.val{fill:#059669}
.sfa-10 .arrow{stroke:var(--orange);stroke-width:2;fill:none}
.sfa-10 .ahead{fill:var(--orange);stroke:none}
.sfa-10 .arrow.val{stroke:var(--green)}
.sfa-10 .ahead.val{fill:var(--green)}
.sfa-10 .enew{fill:#2563eb;font-weight:700}
.sfa-10 .ename.cut{fill:var(--line)}
.sfa-10 .estrike{stroke:#dc2626;stroke-width:2}
.sfa-10 .dnew{fill:#059669;font-weight:700}
.sfa-10 .dname.left{fill:#d97706;font-weight:700}
.sfa-10 .w1,.sfa-10 .w2,.sfa-10 .w3{fill:var(--ink)}
.sfa-10 .cap.on{fill:#2563eb;font-weight:700}
.sfa-10 .cap.warn{fill:#d97706;font-weight:700}
.sfa-10 .cap.bad{fill:#dc2626;font-weight:700}
.sfa-10 .cap.ok{fill:#059669;font-weight:700}
@keyframes sfa10flow{to{stroke-dashoffset:-20}}
.sfa-10 .arrow.run{stroke-dasharray:6 6;animation:sfa10flow .7s linear infinite}
.sfa-10.noanim *{animation:none!important}
</style>
<svg class="sfa-stage" viewBox="0 0 640 404" role="img" aria-label="ddl-auto를 update로 두면 엔티티에 필드를 추가할 때 Hibernate가 ALTER TABLE을 자동 실행해 컬럼을 만들어준다. 그러나 엔티티에서 필드를 지워도 DB 컬럼은 그대로 남고, 변경 이력이 남지 않으며, Flyway와 함께 켜면 스키마를 바꾸는 주체가 둘이 된다. validate로 두면 Hibernate는 검증만 수행하고 엔티티와 실제 스키마가 어긋날 때 기동을 거부해 마이그레이션 누락을 잡아준다.">
<rect class="panel" x="16" y="40" width="216" height="160" rx="10"/>
<text class="mono s11 c-muted" x="28" y="60">Card.java</text>
<text class="mono s11 c-purple tb" x="28" y="82">@Entity</text>
<text class="mono s11" x="28" y="100">class Card {</text>
<text class="mono s11" x="28" y="120">  Long   id;</text>
<text class="mono s11 ename" x="28" y="140">  String name;</text>
<text class="mono s11 enew hide" x="28" y="160">  String thumbnail;</text>
<text class="mono s11" x="28" y="180">}</text>
<line class="estrike hide" x1="34" x2="120" y1="136" y2="136"/>
<text class="s11 c-muted" x="320" y="84" text-anchor="middle">ddl-auto</text>
<rect class="pill" x="262" y="96" width="116" height="26" rx="13"/>
<text class="mono s12 tb pill-t" x="320" y="114" text-anchor="middle">update</text>
<text class="s11 tb mlabel" x="320" y="142" text-anchor="middle">스키마를 직접 변경</text>
<path class="arrow aL" d="M236 109 H254"/>
<path class="ahead hL" d="M254 103 l9 6 l-9 6 z"/>
<path class="arrow aR" d="M386 109 H402"/>
<path class="ahead hR" d="M402 103 l9 6 l-9 6 z"/>
<rect class="panel" x="408" y="40" width="216" height="160" rx="10"/>
<text class="s11 c-muted" x="420" y="60">실제 DB</text>
<text class="mono s12 tb" x="420" y="84">card</text>
<text class="mono s11" x="420" y="106">  id         BIGINT</text>
<text class="mono s11 dname" x="420" y="126">  name       VARCHAR(100)</text>
<text class="mono s11 dnew hide" x="420" y="146">  thumbnail  VARCHAR(255)</text>
<rect class="panel" x="16" y="212" width="608" height="92" rx="10"/>
<text class="s11 tb c-orange plabel hide" x="28" y="232">update 모드의 문제</text>
<text class="s11 w1 hide" x="28" y="254">추가만 한다 — 엔티티에서 지운 컬럼은 DB에 그대로 남는다</text>
<text class="s11 w2 hide" x="28" y="276">변경 이력이 없다 — 언제 무엇이 왜 바뀌었는지 알 수 없다</text>
<text class="s11 w3 hide" x="28" y="298">Flyway와 같이 켜면 스키마를 바꾸는 주체가 둘이 된다</text>
<rect class="panel okp hide" x="16" y="316" width="608" height="56" rx="10"/>
<text class="s11 tb c-green okp hide" x="28" y="338">ddl-auto: validate — Hibernate는 검증만 수행한다</text>
<text class="s11 okp hide" x="28" y="360">엔티티와 실제 스키마가 어긋나면 기동을 거부해, 마이그레이션 누락을 바로 잡아준다</text>
<text class="cap s12 c-muted" x="320" y="392" text-anchor="middle">엔티티 정의를 보고 Hibernate가 테이블을 직접 만들고 바꾼다</text>
</svg>
<script>(function(){
var root=document.currentScript.closest('.sfa');
var NS='http://www.w3.org/2000/svg';
function q(s){return root.querySelector(s)}
function qa(s){return Array.prototype.slice.call(root.querySelectorAll(s))}
function els(s){return typeof s==='string'?qa(s):(Array.isArray(s)?s:[s])}
function vis(s,on){els(s).forEach(function(e){e.classList.toggle('hide',!on)})}
function cls(s,c,on){els(s).forEach(function(e){e.classList.toggle(c,on!==false)})}
function txt(s,t){els(s).forEach(function(e){e._tw=null;e.textContent=t})}
function mk(tag,a,parent){var e=document.createElementNS(NS,tag);for(var k in a)e.setAttribute(k,a[k]);if(parent)parent.appendChild(e);return e}
var gen=0,timers=[];
function instant(){return root.classList.contains('noanim')}
function later(fn,ms){if(instant())fn();else timers.push(setTimeout(fn,ms))}
function tween(s,a,b,ms,fmt){var el=q(s);fmt=fmt||function(v){return Math.round(v).toLocaleString('ko-KR')};el._tw=null;if(instant()||!ms){el.textContent=fmt(b);return}var g=gen,tok={};el._tw=tok;var t0=performance.now();(function f(now){if(g!==gen||el._tw!==tok)return;var p=Math.max(0,Math.min(1,(now-t0)/ms));el.textContent=fmt(a+(b-a)*p);if(p<1)requestAnimationFrame(f)})(t0)}
function snap(el,fn){el.style.transition='none';fn();void el.getBoundingClientRect();el.style.transition=''}
function player(steps,reset){
  var idx=-1,timer=null,visible=!('IntersectionObserver' in window);
  function go(k){
    clearTimeout(timer);
    if(idx>=0&&k===idx+1)steps[k].run();
    else{gen++;timers.forEach(clearTimeout);timers=[];root.classList.add('noanim');reset();for(var j=0;j<=k;j++)steps[j].run();void root.offsetWidth;root.classList.remove('noanim')}
    idx=k;tick();
  }
  function tick(){clearTimeout(timer);if(visible)timer=setTimeout(function(){go(idx+1<steps.length?idx+1:0)},steps[idx].d*.8)}
  if(!visible)new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)tick();else clearTimeout(timer)},{threshold:.35}).observe(root);
  go(0);
}
function cap(t,tone){
  txt('.cap',t);
  cls('.cap','on',tone==='on');
  cls('.cap','warn',tone==='warn');
  cls('.cap','bad',tone==='bad');
  cls('.cap','ok',tone==='ok');
}
function reset(){
  vis('.enew,.dnew,.estrike',false);
  vis('.plabel,.w1,.w2,.w3,.okp',false);
  cls('.ename','cut',false);
  cls('.dname','left',false);
  cls('.arrow','run',false);
  cls('.pill,.pill-t,.mlabel,.arrow,.ahead','val',false);
  txt('.pill-t','update');
  txt('.mlabel','스키마를 직접 변경');
  cap('엔티티 정의를 보고 Hibernate가 테이블을 직접 만들고 바꾼다');
}
player([
{d:3000,run:function(){}},
{d:3800,run:function(){
  cap('엔티티에 필드를 추가하면 기동할 때 ALTER TABLE이 자동 실행된다','on');
  vis('.enew',true);
  later(function(){cls('.aL,.aR','run')},400);
  later(function(){vis('.dnew',true);cls('.aL,.aR','run',false)},1400);
}},
{d:4000,run:function(){
  cap('그런데 지우는 건 처리하지 않는다 — update는 추가만 한다','warn');
  vis('.estrike',true);cls('.ename','cut');
  later(function(){
    cls('.dname','left');vis('.plabel,.w1',true);
  },1100);
}},
{d:3400,run:function(){
  cap('변경 이력이 남지 않아 언제 무엇이 바뀌었는지 알 수 없다','bad');
  vis('.w2',true);
}},
{d:3600,run:function(){
  cap('Flyway와 같이 켜면 스키마를 바꾸는 주체가 둘이 된다','bad');
  vis('.w3',true);
}},
{d:4800,run:function(){
  cap('validate로 두면 검증만 한다 — 누락을 기동 시점에 잡아준다','ok');
  cls('.pill,.pill-t,.mlabel,.arrow,.ahead','val');
  txt('.pill-t','validate');
  txt('.mlabel','검증만 수행');
  later(function(){vis('.okp',true)},900);
}}
],reset);
})();</script>
</div>

엔티티에 필드를 하나 추가하고 애플리케이션을 다시 띄우면 Hibernate가 알아서 ALTER TABLE을 실행해 컬럼을 만들어준다. 개발 초기에 테이블 구조가 자주 바뀔 때는 이게 제일 빠르다.

그런데 조금만 써보면 단독으로는 쓸 수 없다는 게 금방 드러난다.

첫째로 update는 추가만 한다. 엔티티에서 필드를 지워도 DB 컬럼은 그대로 남고, 타입을 바꿔도 반영되지 않는다. 결국 "엔티티가 곧 스키마"라는 전제가 깨지는데, 더 나쁜 건 깨진 걸 알려주지도 않는다는 점이다. 나중에 보면 쓰지 않는 컬럼이 DB에만 쌓여 있다.

둘째로 변경 이력이 남지 않는다. 언제 무엇이 왜 바뀌었는지 기록이 없으니 되돌릴 수도, 추적할 수도 없다. 애초에 ERD 관리를 고민한 출발점이 "변경을 추적하고 싶다"였는데 이 부분이 통째로 빠진다. 형상관리 툴로 보려던 Flyway와 비교하면 가장 큰 차이가 여기다.

셋째로 Hibernate가 판단해서 DDL을 실행하는 구조라 무엇이 실행될지 미리 확인할 방법이 없고, 실수로 create나 create-drop이 들어가면 테이블이 날아간다.

그래서 ddl-auto는 마이그레이션 수단으로는 후보에서 뺐다. 다만 validate 모드는 쓸 자리가 있었다. validate는 Hibernate가 테이블을 건드리지 않고 엔티티와 실제 스키마가 맞는지 검증만 하는데, 어긋나면 애플리케이션이 시작되지 않는다. Flyway로 마이그레이션을 관리하면서 validate를 켜두면 마이그레이션을 깜빡한 경우를 기동 시점에 바로 잡아주는 셈이다. 공짜로 얻는 안전망이라 안 쓸 이유가 없었다.

### 정리

<div class="sfa sfa-11">
<style>
.sfa{--ink:#1f2937;--muted:#6b7280;--line:#e5e7eb;--panel:#f8fafc;--blue:#3b82f6;--blue-soft:#dbeafe;--orange:#f59e0b;--orange-soft:#fef3c7;--red:#ef4444;--red-soft:#fee2e2;--green:#10b981;--green-soft:#d1fae5;--purple:#8b5cf6;--purple-soft:#ede9fe;box-sizing:border-box;max-width:720px;margin:28px auto;padding:16px;background:#fff;border:1px solid var(--line);border-radius:14px;color:var(--ink);font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;line-height:1.55;text-align:left}
.sfa *{box-sizing:border-box}
.sfa-head{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:15px;font-weight:700;line-height:1.4}
.sfa-tag{flex:none;font-size:11px;font-weight:600;color:#1d4ed8;background:var(--blue-soft);padding:2px 8px;border-radius:999px}
.sfa svg.sfa-stage{display:block;width:100%;height:auto;max-width:none;margin:0;overflow:visible}
.sfa svg *{transition:opacity .5s ease,fill .4s ease,stroke .4s ease}
.sfa svg text{font-size:12px;fill:var(--ink);font-family:inherit}
.sfa .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.sfa .s11{font-size:11px}.sfa .s12{font-size:12px}.sfa .s13{font-size:13px}.sfa .s18{font-size:18px}
.sfa .tb{font-weight:700}
.sfa .c-muted{fill:var(--muted)}.sfa .c-blue{fill:#2563eb}.sfa .c-red{fill:#dc2626}.sfa .c-orange{fill:#d97706}.sfa .c-green{fill:#059669}.sfa .c-purple{fill:#7c3aed}.sfa .c-white{fill:#fff}
.sfa .mv{transition:opacity .5s ease,transform .9s cubic-bezier(.4,0,.2,1)}
.sfa .hide{opacity:0!important}
.sfa.noanim *{transition:none!important}
@media (max-width:480px){.sfa{padding:10px;border-radius:10px}}
.sfa-11 .panel{fill:var(--panel);stroke:var(--line)}
.sfa-11 .pbox{fill:#fff;stroke:var(--line);stroke-width:1.5}
.sfa-11 .cbox{fill:#fff;stroke-width:1.5}
.sfa-11 .c-fw{stroke:var(--blue);fill:var(--blue-soft)}
.sfa-11 .c-tb{stroke:var(--green);fill:var(--green-soft)}
.sfa-11 .c-at{stroke:var(--orange);fill:var(--orange-soft)}
.sfa-11 .c-jp{stroke:var(--purple);fill:var(--purple-soft)}
.sfa-11 .t-fw{fill:#1d4ed8}
.sfa-11 .t-tb{fill:#059669}
.sfa-11 .t-at{fill:#d97706}
.sfa-11 .t-jp{fill:#7c3aed}
.sfa-11 .arrow{stroke:var(--blue);stroke-width:2;fill:none}
.sfa-11 .ahead{fill:var(--blue);stroke:none}
.sfa-11 .a2{stroke:var(--green)}
.sfa-11 .h2{fill:var(--green)}
.sfa-11 .dashc{stroke:var(--line);stroke-width:1.5;stroke-dasharray:3 3}
.sfa-11 .cap.on{fill:#2563eb;font-weight:700}
.sfa-11 .cap.ok{fill:#059669;font-weight:700}
.sfa-11 .cap.mix{fill:#d97706;font-weight:700}
@keyframes sfa11flow{to{stroke-dashoffset:-20}}
.sfa-11 .arrow.run{stroke-dasharray:6 6;animation:sfa11flow .7s linear infinite}
.sfa-11.noanim *{animation:none!important}
</style>
<svg class="sfa-stage" viewBox="0 0 640 400" role="img" aria-label="최종 설계. 마이그레이션 SQL을 단일 진실 공급원으로 두고 Flyway가 버전 순서대로 적용한다. 적용된 실제 스키마에서 tbls가 ERD와 문서를 자동 생성하고, CI의 tbls diff가 문서 최신화 누락을 막는다. Atlas의 schema diff는 수동 변경 검출에만, JPA validate는 마이그레이션 누락 검증에만 떼어 쓴다. 마지막으로 계정 권한을 분리해 사람이 직접 DDL을 실행하는 경로를 없앤다.">
<g class="chip ch1 hide">
  <rect class="cbox c-fw" x="16" y="56" width="118" height="36" rx="8"/>
  <text class="s12 tb t-fw" x="26" y="72">Flyway</text>
  <text class="s11 c-muted" x="26" y="86">마이그레이션 적용</text>
</g>
<g class="chip ch2 hide">
  <rect class="cbox c-tb" x="16" y="100" width="118" height="36" rx="8"/>
  <text class="s12 tb t-tb" x="26" y="116">tbls</text>
  <text class="s11 c-muted" x="26" y="130">ERD · 문서 생성</text>
</g>
<g class="chip ch3 hide">
  <rect class="cbox c-at" x="16" y="144" width="118" height="36" rx="8"/>
  <text class="s12 tb t-at" x="26" y="160">Atlas</text>
  <text class="s11 c-muted" x="26" y="174">schema diff 만</text>
</g>
<g class="chip ch4 hide">
  <rect class="cbox c-jp" x="16" y="188" width="118" height="36" rx="8"/>
  <text class="s12 tb t-jp" x="26" y="204">JPA</text>
  <text class="s11 c-muted" x="26" y="218">validate 만</text>
</g>
<g class="p1 hide">
  <rect class="pbox" x="152" y="56" width="196" height="52" rx="8"/>
  <text class="mono s11 tb" x="164" y="76">db/migration/</text>
  <text class="mono s11 c-muted" x="164" y="96">V1__init.sql · V2__…</text>
</g>
<path class="arrow a1 hide" d="M250 110 V132"/>
<path class="ahead h1 hide" d="M244 132 l6 9 l6 -9 z"/>
<text class="mono s11 c-blue lb1 hide" x="258" y="128">flyway migrate</text>
<g class="p2 hide">
  <rect class="pbox" x="152" y="144" width="196" height="52" rx="8"/>
  <text class="s11 tb" x="164" y="164">실제 DB 스키마</text>
  <text class="mono s11 c-muted" x="164" y="184">card · reaction · …</text>
</g>
<path class="arrow a2 hide" d="M250 198 V228"/>
<path class="ahead h2 hide" d="M244 228 l6 9 l6 -9 z"/>
<text class="mono s11 c-green lb2 hide" x="258" y="220">tbls doc</text>
<g class="p3 hide">
  <rect class="pbox" x="152" y="240" width="196" height="52" rx="8"/>
  <text class="mono s11 tb" x="164" y="260">db/docs/</text>
  <text class="mono s11 c-muted" x="164" y="280">README.md · ERD</text>
</g>
<line class="dashc d1 hide" x1="350" x2="372" y1="70" y2="70"/>
<text class="s11 tb c-blue g1 hide" x="380" y="68">SSOT</text>
<text class="s11 c-muted g1 hide" x="380" y="86">손으로 쓰는 유일한 곳</text>
<line class="dashc d2 hide" x1="350" x2="372" y1="158" y2="158"/>
<text class="s11 tb c-orange g2 hide" x="380" y="156">schema diff</text>
<text class="s11 c-muted g2 hide" x="380" y="174">수동 변경(drift) 검출</text>
<line class="dashc d3 hide" x1="350" x2="372" y1="192" y2="192"/>
<text class="s11 tb c-green g3 hide" x="380" y="196">ddl-auto validate</text>
<text class="s11 c-muted g3 hide" x="380" y="214">기동 시 마이그레이션 누락 검증</text>
<line class="dashc d4 hide" x1="350" x2="372" y1="254" y2="254"/>
<text class="s11 tb c-purple g4 hide" x="380" y="252">tbls diff · CI</text>
<text class="s11 c-muted g4 hide" x="380" y="270">문서 최신화 누락 시 빌드 실패</text>
<text class="s11 c-muted g5 hide" x="164" y="306">생성물 — 손으로 수정하지 않는다</text>
<rect class="panel prev hide" x="16" y="320" width="608" height="52" rx="10"/>
<text class="s11 tb c-green prev hide" x="28" y="340">예방 — 계정 권한 분리</text>
<text class="s11 prev hide" x="28" y="360">앱은 DML만, DDL은 마이그레이션 경로만. 평소 접속은 읽기 전용 계정으로 둔다</text>
<text class="cap s12 c-muted" x="320" y="392" text-anchor="middle">SSOT는 마이그레이션 SQL 하나로 둔다</text>
</svg>
<script>(function(){
var root=document.currentScript.closest('.sfa');
var NS='http://www.w3.org/2000/svg';
function q(s){return root.querySelector(s)}
function qa(s){return Array.prototype.slice.call(root.querySelectorAll(s))}
function els(s){return typeof s==='string'?qa(s):(Array.isArray(s)?s:[s])}
function vis(s,on){els(s).forEach(function(e){e.classList.toggle('hide',!on)})}
function cls(s,c,on){els(s).forEach(function(e){e.classList.toggle(c,on!==false)})}
function txt(s,t){els(s).forEach(function(e){e._tw=null;e.textContent=t})}
function mk(tag,a,parent){var e=document.createElementNS(NS,tag);for(var k in a)e.setAttribute(k,a[k]);if(parent)parent.appendChild(e);return e}
var gen=0,timers=[];
function instant(){return root.classList.contains('noanim')}
function later(fn,ms){if(instant())fn();else timers.push(setTimeout(fn,ms))}
function tween(s,a,b,ms,fmt){var el=q(s);fmt=fmt||function(v){return Math.round(v).toLocaleString('ko-KR')};el._tw=null;if(instant()||!ms){el.textContent=fmt(b);return}var g=gen,tok={};el._tw=tok;var t0=performance.now();(function f(now){if(g!==gen||el._tw!==tok)return;var p=Math.max(0,Math.min(1,(now-t0)/ms));el.textContent=fmt(a+(b-a)*p);if(p<1)requestAnimationFrame(f)})(t0)}
function snap(el,fn){el.style.transition='none';fn();void el.getBoundingClientRect();el.style.transition=''}
function player(steps,reset){
  var idx=-1,timer=null,visible=!('IntersectionObserver' in window);
  function go(k){
    clearTimeout(timer);
    if(idx>=0&&k===idx+1)steps[k].run();
    else{gen++;timers.forEach(clearTimeout);timers=[];root.classList.add('noanim');reset();for(var j=0;j<=k;j++)steps[j].run();void root.offsetWidth;root.classList.remove('noanim')}
    idx=k;tick();
  }
  function tick(){clearTimeout(timer);if(visible)timer=setTimeout(function(){go(idx+1<steps.length?idx+1:0)},steps[idx].d*.8)}
  if(!visible)new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)tick();else clearTimeout(timer)},{threshold:.35}).observe(root);
  go(0);
}
function cap(t,tone){
  txt('.cap',t);
  cls('.cap','on',tone==='on');
  cls('.cap','ok',tone==='ok');
  cls('.cap','mix',tone==='mix');
}
function reset(){
  vis('.ch1,.ch2,.ch3,.ch4',false);
  vis('.p1,.p2,.p3',false);
  vis('.a1,.h1,.lb1,.a2,.h2,.lb2',false);
  vis('.d1,.g1,.d2,.g2,.d3,.g3,.d4,.g4,.g5',false);
  vis('.prev',false);
  cls('.arrow','run',false);
  cap('SSOT는 마이그레이션 SQL 하나로 둔다','on');
}
player([
{d:3200,run:function(){
  vis('.ch1,.p1',true);
  later(function(){vis('.d1,.g1',true)},700);
}},
{d:3400,run:function(){
  cap('Flyway가 버전 순서대로 적용한다');
  vis('.a1,.h1,.lb1',true);cls('.a1','run');
  later(function(){vis('.p2',true);cls('.a1','run',false)},900);
}},
{d:3800,run:function(){
  cap('ERD와 문서는 tbls가 자동 생성한다 — 손으로 쓰지 않는다','ok');
  vis('.ch2',true);
  later(function(){
    vis('.a2,.h2,.lb2',true);cls('.a2','run');
    later(function(){vis('.p3,.g5',true);cls('.a2','run',false)},900);
  },400);
}},
{d:3600,run:function(){
  cap('CI에서 tbls diff 가 문서 최신화 누락을 막는다');
  vis('.d4,.g4',true);
}},
{d:4000,run:function(){
  cap('Atlas와 JPA는 필요한 기능만 떼어 쓴다','mix');
  vis('.ch3',true);
  later(function(){vis('.d2,.g2',true)},500);
  later(function(){vis('.ch4',true)},1100);
  later(function(){vis('.d3,.g3',true)},1600);
}},
{d:4600,run:function(){
  cap('권한을 나눠, 사람이 직접 DDL을 칠 수 있는 경로를 없앤다','ok');
  vis('.prev',true);
}}
],reset);
})();</script>
</div>

도구를 하나씩 보면서 깨달은 게 있는데, 내가 원했던 게 단일 기능이 아니었다는 점이다. 처음에는 "ERD를 최신으로 유지하는 도구"를 찾는 문제라고 생각했지만 실제로는 세 가지 역할이 필요했다. 변경을 DB에 적용하는 것, 그 결과를 ERD와 문서로 환원하는 것, 그리고 이 둘이 어긋나지 않았는지 확인하는 것이다. 하나의 라이브러리가 전부 해주지 않는 게 당연했던 셈이다.

그래서 역할별로 나눠서 붙였다.

적용은 Flyway가 맡는다. 마이그레이션 SQL이 SSOT가 되고, 내가 손으로 쓰는 건 이 파일 하나뿐이다. 러닝커브가 낮고 자료가 많고 Spring Boot 통합이 쉬워서 도입 비용이 가장 라이트하다는 게 1순위로 고른 이유였다.

ERD와 문서는 tbls가 만든다. Flyway의 가장 큰 한계가 명령형이라 "지금 테이블이 어떻게 생겼는지"를 한눈에 볼 수 없다는 점인데, 그 부분을 여기서 메운다. 실제 DB에서 Markdown 문서와 Mermaid ERD를 뽑아내니 ERD는 생성물이 되고, 출력이 평문이라 git diff도 되고 AI에게 그대로 넘길 수도 있다.

그리고 생성 도구를 붙이는 것만으로는 부족하다는 것도 알게 됐다. 생성 명령을 실행하는 걸 잊어버리면 똑같이 어긋나기 때문이다. 결국 필요한 건 생성 기능이 아니라 검증 기능이었다. tbls diff를 CI에 걸어서 문서가 갱신되지 않으면 빌드를 실패시키면, 최신화 누락이 의지 문제가 아니라 구조적으로 불가능해진다. 이게 이 설계에서 제일 중요한 한 줄이라고 생각한다.

나머지 두 도구는 전체를 가져오지 않고 기능만 떼어 썼다.

마지막으로 감지보다 예방이 먼저라는 것도 정리했다. 수동 변경을 아무리 잘 잡아내도 이미 일어난 뒤라 복구가 번거롭다. 그래서 계정을 나눠서 애플리케이션은 DML만 쓰고, DDL은 마이그레이션 경로에서만 쓰고, 평소 내가 접속할 때는 읽기 전용 계정을 쓰기로 했다. 1인 프로젝트에서도 효과가 있는 게, "급해서 그냥 ALTER 쳤다"가 의지가 아니라 권한 때문에 불가능해지기 때문이다.

## 지식베이스

퀴즈체크는 AI와 함께 개발하고 있기 때문에, 개발하면서 쌓이는 설계 결정·트러블슈팅·인프라 운영 지식을 AI가 참고할 수 있는 형태로 남기는 것도 개발 환경의 일부라고 판단했다. 그래서 프로젝트 전반에서 사용하는 지식들을 Wiki 형태로 구축하였다.

만든 이유는 단순했다. 트러블슈팅을 하고 나서 정리를 안 해두면 반년 뒤에 같은 문제를 처음부터 다시 파게 된다. 그래서 주제 단위로 쌓이고 검색되는 형태가 필요했다.

또한 내가 지금까지 정리한 문서들을 토대로 AI 질의응답 시 훨씬 퀄리티가 올라갈 것이라고 생각했기 때문이다

여기서 일반적인 위키와 다르게 잡은 부분이 있다. 이 위키는 나중에 헤딩 단위로 청킹되어 VectorDB에 들어가는 것을 전제로 문서를 쓴다. AI에게 "내 경험 기반으로 답해달라"고 하려면 결국 RAG를 붙이게 될 테고, 그때 문서를 다시 쓰는 일을 피하고 싶었다.

우선 모든 문서들은 RAG 최적화 구조로 위키에 등록되며, 해당 문서들은 내 작업 환경에 맞춰서 자동화를 진행하였다

### AI 에이전트 → 위키 수집 파이프라인

평소에 AI를 활용하는 입장에서 매번 프롬프트를 입력하고 해당 내용을 요약해서 위키에 적재하고는 했다

가끔씩 까먹고 종료하는 일도 빈번했으며, 이 점을 개선하려고 했다

중점적으로 생각한 것은 내가 인식하지 않아도 나의 프롬프트에 입력하고 얻은 정보들은 항상 나의 지식베이스에 등록이 되어야 한다

우선 생각한 것은 완전 자동화였다. 세션이 종료될 때 hook을 걸어 세션에 대한 요약본들을 지식베이스에 등록하는 방법을 하려고 했으나 다음과 같은 문제가 발생했다

### 리스크 1. 민감 정보가 섞인다

실제 세션을 보면 은근 민감한 정보들을 포함하고 있을 가능성이 있다. 이걸 완전 자동화로 위키에 등록하는 것은 위험하다고 생각했다

현재 위키 정보들을 GitHub 저장소로 관리하고 있었기 때문에 이러한 정보들을 비공개 저장소라도 올라간다는 것이 껄끄러웠다

### 리스크 2. 신호 대 잡음 비가 나쁘다

세션을 돌아보면 모두가 위키에 남길 만큼 가치 있는 문서는 아니다

현재 나는 글을 작성하면서 사용하는 SVG 생성 요청, 오타 교정 등 이런 부분들까지는 남길 필요가 없다

이러한 부분은 사실 종료 Hook 걸 때 조건으로 “가치 없는 내용은 빼줘” 이런 식으로 넣을 수 있기는 하지만 결국 이것은 내가 생각하기에 중요한 문서인데 스킵될 위험이 있었다

### 리스크 3. RAG 품질이 떨어진다

현재 내가 목표로 하는 위키는 **VectorDB 적재까지 생각 중이다**

이에 따라 저품질 청크가 늘면 검색 결과를 오염시킨다. 질문과 어설프게 비슷한 잡음 청크가 상위에 올라오면 정답 청크가 밀려난다. **고품질 16개가 저품질 300개보다 검색 정확도가 높다.**

자동화의 목적이 "AI가 내 경험을 참조하게 하는 것"인데, 자동화 때문에 참조 품질이 떨어지는 자기모순이 된다.

이러한 문제를 해결하기 위해 완전 자동화는 현실적으로 위험하다고 생각해서 중간에 인간 게이트를 둬서 내 판단하에 괜찮은 자료라고 생각되면 지식베이스에 등록하기로 결정했다

<div class="sfa sfa-12">
<style>
.sfa{--ink:#1f2937;--muted:#6b7280;--line:#e5e7eb;--panel:#f8fafc;--blue:#3b82f6;--blue-soft:#dbeafe;--orange:#f59e0b;--orange-soft:#fef3c7;--red:#ef4444;--red-soft:#fee2e2;--green:#10b981;--green-soft:#d1fae5;--purple:#8b5cf6;--purple-soft:#ede9fe;box-sizing:border-box;max-width:720px;margin:28px auto;padding:16px;background:#fff;border:1px solid var(--line);border-radius:14px;color:var(--ink);font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;line-height:1.55;text-align:left}
.sfa *{box-sizing:border-box}
.sfa-head{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:15px;font-weight:700;line-height:1.4}
.sfa-tag{flex:none;font-size:11px;font-weight:600;color:#1d4ed8;background:var(--blue-soft);padding:2px 8px;border-radius:999px}
.sfa svg.sfa-stage{display:block;width:100%;height:auto;max-width:none;margin:0;overflow:visible}
.sfa svg *{transition:opacity .5s ease,fill .4s ease,stroke .4s ease}
.sfa svg text{font-size:12px;fill:var(--ink);font-family:inherit}
.sfa .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.sfa .s11{font-size:11px}.sfa .s12{font-size:12px}.sfa .s13{font-size:13px}.sfa .s18{font-size:18px}
.sfa .tb{font-weight:700}
.sfa .c-muted{fill:var(--muted)}.sfa .c-blue{fill:#2563eb}.sfa .c-red{fill:#dc2626}.sfa .c-orange{fill:#d97706}.sfa .c-green{fill:#059669}.sfa .c-purple{fill:#7c3aed}.sfa .c-white{fill:#fff}
.sfa .mv{transition:opacity .5s ease,transform .9s cubic-bezier(.4,0,.2,1)}
.sfa .hide{opacity:0!important}
.sfa.noanim *{transition:none!important}
@media (max-width:480px){.sfa{padding:10px;border-radius:10px}}
.sfa-12 .lband{fill:var(--panel);stroke:var(--line)}
.sfa-12 .b1 .lband,.sfa-12 .lband.b1{fill:var(--blue-soft);stroke:var(--blue)}
.sfa-12 .lband.b2{fill:var(--orange-soft);stroke:var(--orange)}
.sfa-12 .lband.b3{fill:var(--green-soft);stroke:var(--green)}
.sfa-12 .t1{fill:#1d4ed8}
.sfa-12 .t2{fill:#d97706}
.sfa-12 .t3{fill:#059669}
.sfa-12 .card{fill:#fff;stroke:var(--line);stroke-width:1.5}
.sfa-12 .ibox{fill:#fff;stroke:var(--blue);stroke-width:1.5}
.sfa-12 .gbox{fill:#fff;stroke:var(--orange);stroke-width:1.5}
.sfa-12 .wbox{fill:#fff;stroke:var(--green);stroke-width:1.5}
.sfa-12 .phead{fill:var(--orange)}
.sfa-12 .pbody{fill:var(--orange);stroke:none}
.sfa-12 .arrow{stroke:var(--blue);stroke-width:2;fill:none}
.sfa-12 .ahead{fill:var(--blue);stroke:none}
.sfa-12 .ap,.sfa-12 .a3,.sfa-12 .a4{stroke:var(--green)}
.sfa-12 .hp,.sfa-12 .h3,.sfa-12 .h4{fill:var(--green)}
.sfa-12 .ax{stroke:var(--line)}
.sfa-12 .hx{fill:var(--line)}
.sfa-12 .cA.on,.sfa-12 .cD.on{fill:#059669;font-weight:700}
.sfa-12 .cB.off{fill:#dc2626;text-decoration:line-through}
.sfa-12 .cC.off{fill:var(--line)}
.sfa-12 .drop{fill:var(--muted)}
.sfa-12 .cap.on{fill:#2563eb;font-weight:700}
.sfa-12 .cap.warn{fill:#d97706;font-weight:700}
.sfa-12 .cap.ok{fill:#059669;font-weight:700}
@keyframes sfa12flow{to{stroke-dashoffset:-20}}
.sfa-12 .arrow.run{stroke-dasharray:6 6;animation:sfa12flow .7s linear infinite}
.sfa-12.noanim *{animation:none!important}
</style>
<svg class="sfa-stage" viewBox="0 0 640 400" role="img" aria-label="세션에서 나온 내용을 위키로 옮기는 3단계 파이프라인. 1단계 수집은 자동으로, 후보를 추출해 gitignore된 inbox 폴더에 쌓는다. 2단계 선별은 사람이 한다. 민감 정보와 잡음은 코드로 가를 수 없으므로 주 1회 직접 고르고, 가치 있는 후보만 통과시킨다. 3단계 문서화는 반자동으로, wiki-add 커맨드가 CONVENTIONS 규격 문서를 만들고 README 인덱스는 자동 갱신된다.">
<rect class="lband b1 hide" x="16" y="40" width="88" height="88" rx="8"/>
<text class="s12 tb t1 b1 hide" x="60" y="74" text-anchor="middle">① 수집</text>
<text class="s11 t1 b1 hide" x="60" y="92" text-anchor="middle">자동</text>
<g class="ses hide">
  <rect class="card" x="120" y="56" width="58" height="40" rx="6"/>
  <text class="s11" x="149" y="80" text-anchor="middle">세션</text>
  <rect class="card" x="186" y="56" width="58" height="40" rx="6"/>
  <text class="s11" x="215" y="80" text-anchor="middle">세션</text>
  <rect class="card" x="252" y="56" width="58" height="40" rx="6"/>
  <text class="s11" x="281" y="80" text-anchor="middle">세션</text>
</g>
<path class="arrow a1 hide" d="M320 76 H344"/>
<path class="ahead h1 hide" d="M344 70 l9 6 l-9 6 z"/>
<text class="s11 c-muted lb1 hide" x="334" y="104" text-anchor="middle">후보 추출</text>
<g class="inbox hide">
  <rect class="ibox" x="362" y="56" width="118" height="40" rx="6"/>
  <text class="mono s12 tb" x="421" y="81" text-anchor="middle">.inbox/</text>
</g>
<text class="s11 tb c-green gi hide" x="494" y="72">gitignore</text>
<text class="s11 c-muted gi hide" x="494" y="90">원격에 안 올라감</text>
<rect class="lband b2 hide" x="16" y="140" width="88" height="114" rx="8"/>
<text class="s12 tb t2 b2 hide" x="60" y="188" text-anchor="middle">② 선별</text>
<text class="s11 t2 b2 hide" x="60" y="206" text-anchor="middle">사람</text>
<text class="s11 cA hide" x="120" y="166">· ERD 도구 선정</text>
<text class="s11 cB hide" x="120" y="188">· 회사 재무 · 급여</text>
<text class="s11 cC hide" x="120" y="210">· 글 어투 수정</text>
<text class="s11 cD hide" x="120" y="232">· Spark 튜닝</text>
<g class="gate hide">
  <rect class="gbox" x="282" y="172" width="96" height="52" rx="8"/>
  <circle class="phead" cx="310" cy="190" r="7"/>
  <path class="pbody" d="M298 210 a12 10 0 0 1 24 0"/>
  <text class="s11 tb t2" x="348" y="202" text-anchor="middle">선별</text>
</g>
<path class="arrow ap hide" d="M386 186 H412"/>
<path class="ahead hp hide" d="M412 180 l9 6 l-9 6 z"/>
<text class="s11 tb c-green pass hide" x="428" y="190">통과 2건</text>
<path class="arrow ax hide" d="M386 216 H412"/>
<path class="ahead hx hide" d="M412 210 l9 6 l-9 6 z"/>
<text class="s11 tb drop hide" x="428" y="220">탈락 2건</text>
<text class="s11 c-muted drop hide" x="428" y="238">민감 정보 · 잡음</text>
<rect class="lband b3 hide" x="16" y="266" width="88" height="88" rx="8"/>
<text class="s12 tb t3 b3 hide" x="60" y="300" text-anchor="middle">③ 문서화</text>
<text class="s11 t3 b3 hide" x="60" y="318" text-anchor="middle">반자동</text>
<g class="wadd hide">
  <rect class="wbox" x="120" y="282" width="108" height="40" rx="6"/>
  <text class="mono s12 tb" x="174" y="307" text-anchor="middle">/wiki-add</text>
</g>
<text class="s11 c-muted wl hide" x="174" y="342" text-anchor="middle">CONVENTIONS 규격</text>
<path class="arrow a3 hide" d="M236 302 H258"/>
<path class="ahead h3 hide" d="M258 296 l9 6 l-9 6 z"/>
<g class="dcs hide">
  <rect class="wbox" x="276" y="282" width="116" height="40" rx="6"/>
  <text class="mono s12" x="334" y="307" text-anchor="middle">docs/…md</text>
</g>
<path class="arrow a4 hide" d="M400 302 H422"/>
<path class="ahead h4 hide" d="M422 296 l9 6 l-9 6 z"/>
<g class="idx hide">
  <rect class="wbox" x="440" y="282" width="134" height="40" rx="6"/>
  <text class="s12" x="507" y="307" text-anchor="middle">README 인덱스</text>
</g>
<text class="s11 c-muted il hide" x="507" y="342" text-anchor="middle">자동 갱신</text>
<text class="cap s12 c-muted" x="320" y="388" text-anchor="middle">세션에서 나온 내용은 그냥 두면 사라진다</text>
</svg>
<script>(function(){
var root=document.currentScript.closest('.sfa');
var NS='http://www.w3.org/2000/svg';
function q(s){return root.querySelector(s)}
function qa(s){return Array.prototype.slice.call(root.querySelectorAll(s))}
function els(s){return typeof s==='string'?qa(s):(Array.isArray(s)?s:[s])}
function vis(s,on){els(s).forEach(function(e){e.classList.toggle('hide',!on)})}
function cls(s,c,on){els(s).forEach(function(e){e.classList.toggle(c,on!==false)})}
function txt(s,t){els(s).forEach(function(e){e._tw=null;e.textContent=t})}
function mk(tag,a,parent){var e=document.createElementNS(NS,tag);for(var k in a)e.setAttribute(k,a[k]);if(parent)parent.appendChild(e);return e}
var gen=0,timers=[];
function instant(){return root.classList.contains('noanim')}
function later(fn,ms){if(instant())fn();else timers.push(setTimeout(fn,ms))}
function tween(s,a,b,ms,fmt){var el=q(s);fmt=fmt||function(v){return Math.round(v).toLocaleString('ko-KR')};el._tw=null;if(instant()||!ms){el.textContent=fmt(b);return}var g=gen,tok={};el._tw=tok;var t0=performance.now();(function f(now){if(g!==gen||el._tw!==tok)return;var p=Math.max(0,Math.min(1,(now-t0)/ms));el.textContent=fmt(a+(b-a)*p);if(p<1)requestAnimationFrame(f)})(t0)}
function snap(el,fn){el.style.transition='none';fn();void el.getBoundingClientRect();el.style.transition=''}
function player(steps,reset){
  var idx=-1,timer=null,visible=!('IntersectionObserver' in window);
  function go(k){
    clearTimeout(timer);
    if(idx>=0&&k===idx+1)steps[k].run();
    else{gen++;timers.forEach(clearTimeout);timers=[];root.classList.add('noanim');reset();for(var j=0;j<=k;j++)steps[j].run();void root.offsetWidth;root.classList.remove('noanim')}
    idx=k;tick();
  }
  function tick(){clearTimeout(timer);if(visible)timer=setTimeout(function(){go(idx+1<steps.length?idx+1:0)},steps[idx].d*.8)}
  if(!visible)new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)tick();else clearTimeout(timer)},{threshold:.35}).observe(root);
  go(0);
}
function cap(t,tone){
  txt('.cap',t);
  cls('.cap','on',tone==='on');
  cls('.cap','warn',tone==='warn');
  cls('.cap','ok',tone==='ok');
}
function reset(){
  vis('.b1,.ses,.a1,.h1,.lb1,.inbox,.gi',false);
  vis('.b2,.cA,.cB,.cC,.cD,.gate',false);
  vis('.ap,.hp,.pass,.ax,.hx,.drop',false);
  vis('.b3,.wadd,.wl,.a3,.h3,.dcs,.a4,.h4,.idx,.il',false);
  cls('.cA,.cD','on',false);
  cls('.cB,.cC','off',false);
  cls('.arrow','run',false);
  cap('세션에서 나온 내용은 그냥 두면 사라진다');
}
player([
{d:3200,run:function(){
  vis('.b1,.ses',true);
}},
{d:3800,run:function(){
  cap('후보 추출은 자동 — .inbox는 gitignore라 원격에 올라가지 않는다','on');
  vis('.a1,.h1,.lb1',true);cls('.a1','run');
  later(function(){vis('.inbox',true);cls('.a1','run',false)},900);
  later(function(){vis('.gi',true)},1500);
}},
{d:3400,run:function(){
  cap('후보가 쌓인다. 그런데 대부분은 위키에 들어갈 가치가 없다');
  vis('.b2',true);
  ['.cA','.cB','.cC','.cD'].forEach(function(s,i){
    later(function(){vis(s,true)},200+i*260);
  });
}},
{d:4400,run:function(){
  cap('선별은 사람이 한다 — 민감 정보와 잡음은 코드로 가를 수 없다','warn');
  vis('.gate',true);
  later(function(){
    cls('.cA,.cD','on');cls('.cB,.cC','off');
  },900);
  later(function(){vis('.ap,.hp,.pass',true)},1500);
  later(function(){vis('.ax,.hx,.drop',true)},2000);
}},
{d:3800,run:function(){
  cap('통과한 것만 CONVENTIONS 규격 문서로 만든다','ok');
  vis('.b3,.wadd,.wl',true);
  later(function(){
    vis('.a3,.h3',true);cls('.a3','run');
    later(function(){vis('.dcs',true);cls('.a3','run',false)},800);
  },600);
}},
{d:4200,run:function(){
  cap('수집은 자동, 판단은 사람, 문서화는 반자동','ok');
  vis('.a4,.h4',true);cls('.a4','run');
  later(function(){vis('.idx,.il',true);cls('.a4','run',false)},900);
}}
],reset);
})();</script>
</div>

세션이 종료되거나 중간마다 위키에 넣을 만한 후보군을 뽑아 inbox에 담는다.

그리고 문서 승격을 위해서 후보군을 나열하고, Summary를 확인하고 가치 있는 문서라고 판단되면 지식베이스에 등록하는 구조로 진행하기로 하였다

완전 자동화는 할 수 없었지만 내가 가장 경계한 “가치 있는 정보들이 사라짐” 부분은 방지할 수 있으며, 지식베이스의 질도 올릴 수 있다고 생각해서 해당 방법을 채택하였다

이렇게 쌓인 문서는 퀴즈체크를 개발하며 AI에게 질문할 때 근거 자료로 쓰이며, 앞에서 정리한 CI/CD와 ERD 관리 결정도 모두 이 위키에 문서로 등록되어 있다
