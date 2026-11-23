---
name: insane-loop
description: >
  Goal-driven pipeline loop orchestrator — routes idea→PRD(show-me-the-prd)→goal setup(goaljaby)→/goal
  execution, then keeps iterating verify→review→improve cycles INSIDE the goal until the documented
  Definition of Done (all VALIDATION items pass AND zero blocking assumptions) is met. Never stops early:
  recovery ladder (retry→change approach with deep reviewer→re-plan gate) plus driven guard re-enter the
  loop whenever it stalls. Reviewers are selectable and invoked as-is: self-review (default) /
  insane-review / codex / gjc / pumasi (candidate competition). Uses playmaker as the live goal board when installed. Korean triggers: "인세인 루프", "루프 돌려줘", "완성될 때까지 돌려",
  "아이디어부터 완성까지", "파이프라인 돌려줘", "PRD부터 골까지". English triggers: "insane loop",
  "run the loop", "loop until done", "idea to done pipeline".
---

# insane-loop — 문서 정의 완성까지 골로 도는 파이프라인 루프

## 핵심 개념

- **DoD (완성 정의)** = VALIDATION 전체 통과 **AND** blocking 가정 0. 문서가 정의하고, 루프가 도달한다.
- **엔진 = /goal.** 개선 회차는 골 내부의 반복 단계다. insane-loop는 골을 세팅하고(goaljaby 경유),
  멈추면 다시 걸고(드리븐), 회차를 기록한다(LOOP.md).
- **오케스트레이션만.** 하위 플러그인·리뷰어를 있는 그대로 호출한다. 전달은 경로+프롬프트 컨텍스트.
- **한방 완성이 아니라 미세 루프 반복 고도화.** 각 단계는 "시작하기에 충분한" 수준으로 빠르게
  통과시키고, 루프가 품질을 조인다. (근거: gjc deep-interview 분석 + Draft-First A/B 검증)

## 실행 환경 (Claude Code / Codex)

- **Claude Code**: 루프 설정 카드·확인 카드는 `AskUserQuestion`으로 묻는다. 하위 플러그인은 `/show-me-the-prd`·`/goaljaby`로 부른다.
- **Codex**: 시작 전에 이 폴더의 `references/codex.md`를 읽는다(질문 도구 순서, 다른 스킬 호출, 골 시작, 보드 차이). async 호출 형식: `{"questions":[{"title":"헤더 — 질문","options":["추천안 (추천) — 설명","대안 — 설명"]}]}` — 문항에는 `title`·`options`만, `question`·`header`·`id`는 넣지 않는다.
- 아래 `references/…`는 이 SKILL.md가 있는 폴더 기준이다. Codex에서는 `${CLAUDE_PLUGIN_ROOT}`를 이 플러그인 루트(이 SKILL.md에서 두 단계 위 폴더)로 바꿔 읽는다.

실행 절차는 이 문서 맨 아래 "실행 절차"다(명령 `/insane-loop`은 이 문서를 읽고 따르게 하는 얇은 진입점). 규칙 상세와 LOOP.md 포맷도 이 문서가 정의한다.

## 보드 — playmaker (기본) / 관제탑 tower

- **playmaker가 설치돼 있으면 그것이 기본 보드다.** `/goal` 시작과 함께 골 폴더의 작업 카드(PLAN.md 마커)와
  LOOP.md 루프 줄(회차·검증 x/y·사다리 단계·⏸ 판단 대기)을 세션 안 pane(Paseo에서는 웹 탭)에 띄운다.
  카드 행동('gate 답하기'·'접근 바꿔서 다시'·'DoD 다시 판정')은 세션에 지시문으로 들어온다 — 받은 지시는
  이 문서의 사다리·재진입 규칙대로 처리한다. playmaker는 파일에 쓰지 않으므로 마커·LOOP.md 갱신은 루프가 한다.
  이때 스테이지 B-4의 tower 제안은 하지 않는다.

`/insane-loop:tower` — playmaker가 없을 때의 대체 보드이자, 여러 프로젝트 루프 모아 보기. LOOP.md·PRD·goaljaby 산출물을 감시해 공정 레일·회차·DoD·gate_pending을
브라우저에서 실시간 표시하는 **읽기 전용** 상황판 (`skills/insane-loop/scripts/tower.mjs`, zero-dep).
playmaker가 없을 때만 골 발사 직전 한 번 제안한다(지시서 스테이지 B-4). 머신당 1대가 여러 루프를 집계한다 — 프로젝트
디렉토리가 다르면 겹치지 않는다. **같은 프로젝트에서 루프 동시 2개 금지** (LOOP.md 동시 쓰기 꼬임).

## 스테이지 계약

Read `references/stage-contracts.md` — 스테이지별 입출력(경로·전달 컨텍스트 문구).

## 리뷰어

Read `references/reviewer-menu.md` — 감지·선택지 구성·호출 방법. 원칙: **있는 그대로 호출, 녹이지 않음.**
선택은 골 시작 전 루프 설정 카드에서 확정(자율 주행 중 카드 UI 불가). 골 내 기본 = 셀프리뷰.

## 리커버리 사다리 + 드리븐 가드

Read `references/recovery-ladder.md` — goaljaby에 전달해 RECOVERY.md에 새겨지는 원문.
요지: 1단 재시도 → 2단 접근 변경(딥 리뷰어, 설계 방향이 갈리면 pumasi 후보 경쟁) → 3단 재계획(사용자 게이트 `gate_pending` + 막힌 작업 PLAN.md `[!]`).
작업 마커: 고치기 시작 `[>]`, 재검증 통과 `[x]`, 사람 판단 대기 `[!]` — 마커만 바꾸고 작업 문장은 건드리지 않는다(goaljaby 0.7+ 규칙).
멈춤 원인 매핑: 같은 에러 반복→2단 강제 / 도구·환경 실패→기록 후 우회 / 모호→기본값+가정 원장
기록 후 계속(질문 금지) / 완료 착각→검증 증거 요구. 정당한 멈춤 = DoD 충족 · gate_pending · 사용자 중단.

## LOOP.md 포맷 (프로젝트 루트, 저널 단일 파일)

```markdown
# insane-loop 저널: {골 이름}

- status: active | gate_pending | done | stopped
- dod: VALIDATION 전체 통과 + blocking 가정 0
- prd: {PRD 경로} / validation: {VALIDATION.md 경로}
- reviewer: self | insane-review | codex | gjc | pumasi ({투입 시점: 사다리2단 | 마일스톤}; insane-review는 사용자가 정한 추론 강도가 있으면 `effort=` 덧붙임)
- redrive: none | loop
- blocking_assumptions_remaining: [번호 목록 — PRD 가정 원장 참조]

## 회차 {n} — {ISO 날짜}
- 검증: {통과 x/y} / 실패 항목: {목록}
- 사다리 단계: {1|2|3} / 리뷰어: {이번 회차 사용}
- 적용 태스크: {요약}
- 판정: {계속 | gate_pending: 질문 | done}
```

규칙: 회차마다 블록 1개 append. `.gjc`식 상태 디렉토리·상태 머신 금지 — 이 파일 하나가 resume 지점이다.
`gate_pending`일 때는 질문 내용을 판정 줄에 남겨 재개 시 그 질문부터 시작한다.

## 질문 경계 = 골 시작 (questioning-policy §1·§2·§6 상속)

- **골 시작 전: 물어볼 결정이 남아 있으면 모두 묻는다.** 콜당 ≤4문항 배칭, 콜 수 제한 없음.
  blocking 가정 미해소 상태로 골을 발사하지 않는다. 사실(§6b)은 조사, 결정만 질문.
- **골 시작 후: 질문 0.** 기본값 채택 + 가정 원장 기록 후 계속. 사다리 3단도 질문을 띄우지 않고
  골을 멈춰 `gate_pending`+질문 내용을 LOOP.md에 기록 — 질문은 사용자 재진입 시 제시한다.

## 실패 모드 (하지 말 것)

- DoD 미달인데 완료 선언 — 검증 증거 없이 done 금지 (드리븐 가드가 잡는 1순위)
- 같은 접근 3회 반복 — 2회 실패면 접근을 바꿔야 한다 (사다리 2단)
- 하위 플러그인 게이트 우회 — goaljaby Step 9는 반드시 사람이 통과시킨다
- 리뷰어 출력 파싱/계약 강제 — 프롬프트 컨텍스트로 주고받는다
- 자율 주행 중 사용자 호출 남발 — 질문은 gate_pending에서만

---

# 실행 절차 (명령 /insane-loop의 본문)

**문서로 정의된 완성(DoD)에 도달할 때까지 파이프라인을 골로서 계속 돌린다.**
DoD = VALIDATION 전체 통과 **AND** blocking 가정 0. 이 조건을 충족하기 전에는 루프가 끝나지 않는다.

입력 = 명령 인자(`입력`) 또는 사용자가 요청에 쓴 내용.

## 4대 원칙

1. **루프의 엔진은 /goal, 문서가 DoD다.** 개선 회차(검증→리뷰→개선→재검증)는 골 내부의 반복 단계다. 골 밖 수동 턴제 루프가 아니다.
2. **오케스트레이션만, 재구현 금지.** 하위 플러그인(show-me-the-prd, goaljaby, playmaker)과 리뷰어(셀프리뷰/insane-review/codex/gjc/pumasi)는 **있는 그대로 호출**한다. 어댑터·출력 계약 강제 없음. 전달은 파일 경로 + 프롬프트 컨텍스트뿐.
3. **승인 게이트 존중.** goaljaby Step 9(사람 검토) 등 하위 게이트를 절대 우회하지 않는다. 개선 적용도 요약을 보이고 진행한다.
4. **질문 경계 = 골 시작 (shared/questioning-policy.md §1·§2·§6):** **골 시작 전에는 물어볼 결정이 남아 있으면 모두 묻는다** — 카드는 콜당 ≤4문항으로 배치하되 콜 수 제한 없음. blocking 가정·방향 결정이 미해소인 채로 골을 발사하지 않는다(사실은 §6b대로 조사, 결정만 질문). **골 시작 후에는 질문 0** — 기본값+가정 원장 기록 후 계속하고, 사다리 3단은 질문을 띄우는 게 아니라 골을 멈추고 `gate_pending`으로 파킹한다(질문은 사용자가 돌아와 재진입할 때 제시).

## Turn 0: 상태 감지 (자동 — 유저에게 묻지 않음)

입력와 현재 디렉토리를 다음 순서로 감지해 진입 스테이지를 정한다:

1. `LOOP.md` 존재 → **스테이지 C (resume)**. 단 `status: done`이면 재검증에 들어가지 말고 완료 보고 요약만 다시 보여주고 종료한다 — 사용자가 명시적으로 재개/재검증을 요청한 경우에만 status를 active로 되돌리고 스테이지 C에 진입.
2. `VALIDATION.md`(또는 goaljaby 산출물 4종) 존재 → **스테이지 C (DoD 판정부터)**
3. `PRD/` 폴더(01_PRD.md) 존재 → **스테이지 B (골 세팅)**
4. 아무것도 없음(또는 입력가 아이디어 텍스트) → **스테이지 A (PRD부터)**

의존 감지 (Glob/Bash, 유저에게 묻지 않음):
- `$HOME/.claude/plugins/cache/*/show-me-the-prd` / `*/goaljaby` / `*/insane-review` / `*/pumasi` / `*/playmaker`
- `command -v codex`, `command -v gjc`
- goaljaby 버전: 위 캐시 경로의 버전 디렉토리 이름 — 0.8.0 이상이면 승인 뒤 `/goal` 자동 시작(B-4)
감지 결과는 스테이지 라우팅, 리뷰어 선택지 구성, 보드 선택(B-4)에만 쓴다. 상세: Read `references/reviewer-menu.md`

## 스테이지 A: 아이디어 → PRD

- show-me-the-prd 설치됨 → `/show-me-the-prd {아이디어}`로 위임한다 (선초안 흐름이 가정 원장까지, UI 기획일 때 `PRD/references/` 디자인 레퍼런스까지 만들어준다 — 기준 v0.10.2). 완료 후 스테이지 B로.
- 미설치 → 설치 안내 한 줄 + 폴백: 기존 PRD 경로를 받거나, 이 세션에서 직접 최소 PRD를 쓴다. 정책 파일(questioning-policy)은 이 플러그인에 없으니 찾지 말고 아래 순서를 따른다:
  1. **방향 결정 카드 1콜(≤4문항)** — MVP 범위·기술 방향처럼 초안을 가르는 *결정*을 카드 질문으로 실제로 묻고 답을 기다린다(조사로 알 수 있는 사실은 묻지 않는다). 결정을 기본값으로 채워 넘어가지 않는다. 사용자가 "시작 단계까지만"이라고 해도 이 카드는 시작 단계에 속한다.
  2. 답을 받으면 `PRD/01_PRD.md`에 목표/수용 기준/가정 원장을 쓴다.
  3. 원장에 blocking 가정이 남으면 스테이지 B 루프 설정 카드에 합쳐 묻는다.

## 스테이지 B: PRD → 루프형 골 세팅

1. **루프 설정 질문 (골 전 — 물어볼 건 여기서 전부):** 이 카드는 **반드시 AskUserQuestion으로 실제로 띄운다.** "비대화형 세션 같다"는 추측으로 건너뛰고 기본값을 쓰지 않는다(Paseo·SDK 세션도 질문이 정상 전달된다). 호출이 실제로 실패했을 때만 기본값(셀프리뷰·재드라이브 없음)을 쓰고 LOOP.md 회차 0에 실패 사실을 적는다. show-me-the-prd·goaljaby의 확인 카드도 같은 원칙이다.
   - 리뷰어: 감지된 것만 노출 — 셀프리뷰 (추천, 매 회차·비용 제로) / insane-review (깊은 회차, ChatGPT Pro 구독 필요, 추론 강도 기본 Pro) / codex / gjc / pumasi 후보 경쟁 (사다리 2단 전용 — 막힌 원인이 설계 방향일 때 접근안 2개 비교). 딥 리뷰어 선택 시 투입 시점(마일스톤 or 사다리 2단)도 옵션에 포함. 사용자가 insane-review 추론 강도를 따로 말했으면 LOOP.md `reviewer:` 줄에 같이 적는다.
   - 주기 재드라이브 옵트인: 없음 (추천) / 세션 내 /loop
   - **PRD의 blocking 가정 전부** + 골 도중 결정이 필요해질 게 뻔한 항목 — 콜당 ≤4문항으로 배치해 **해소될 때까지** 묻는다. 골 시작 후에는 물을 수 없으므로 여기가 마지막 질문 기회다.
2. **`LOOP.md` 생성** — 포맷: 이 문서 §LOOP.md. 골 정의·DoD·리뷰어 설정·회차 0 기록.
3. **goaljaby 호출** — `/goaljaby {PRD 경로}`. 호출 시 다음을 **프롬프트 컨텍스트로** 전달한다 (goaljaby 문서 5종에 새겨지도록):
   - PRD `## 가정 원장`의 **blocking 항목** → VALIDATION 검증 항목으로 반영 요청 (원장 자체의 보존·승계는 goaljaby 0.6.3+가 알아서 한다 — 다시 시키지 않는다)
   - 골 종료 조건(= DoD: VALIDATION 전체 통과 + blocking 가정 0) → goal-command·VALIDATION에 명시 요청
   - 리커버리 사다리 + 멈춤 원인 매핑 + 개선 회차 재진입 규칙 → RECOVERY에 반영 요청. 원문: Read `references/recovery-ladder.md` (개선 회차의 PLAN.md 작업 마커 규칙 포함 — goaljaby 0.7+ 체크리스트 `[ ]`/`[>]`/`[x]`/`[!]`를 그대로 쓴다)
   - `PRD/references/`(디자인 레퍼런스)가 있으면 goaljaby가 자동 승계한다(PLAN 참조 + VALIDATION 시각 검증). 별도 전달 불필요 — 단, 딥 리뷰어 투입 시 리뷰 컨텍스트에 스타일 방향(`sources.json`의 `query.style`) 한 줄을 포함한다.
4. goaljaby Step 9 승인 게이트는 그대로 — 승인되면 goaljaby가 `/goal`을 발사하고 골이 시작된다. LOOP.md status를 `active`로.
   - **골 자동 시작 (goaljaby 0.8.0+):** 승인 턴 응답의 *마지막 줄* `/goal …`은 goaljaby의 `turn.complete` 훅이 턴 종료 시 `/goal` 명령으로 바로 실행한다(Paseo 포함, 사람 재입력 없음). 사용자에게 붙여넣으라고 안내하지 않는다.
   - **`/goal` 줄 뒤에는 아무것도 쓰지 않는다.** 훅은 마지막 줄만 읽으므로, LOOP.md 기록·보드 안내·요약은 모두 goaljaby Step 10 출력 *전에* 끝낸다. 그 뒤에 한 줄이라도 덧붙이면 골이 시작되지 않는다.
   - LOOP.md status `active`: goaljaby 0.8.0+면 승인 직후, Step 10의 `/goal` 줄이 나가기 *전에* 쓴다(훅이 곧 골을 시작한다). 0.8.0 미만이거나 폴백이면 사용자가 `/goal`을 보내 골이 실제로 시작된 첫 턴에 쓴다.
   - 자동 시작이 안 되는 경우만 안내한다: 감지된 goaljaby가 0.8.0 미만이거나, 사용자가 훅 실패 토스트("골잡이: /goal을 자동으로 시작하지 못했습니다")나 골이 시작되지 않았다고 알려 올 때(토스트는 턴이 끝난 뒤 뜨므로 어시스턴트는 직접 보지 못한다). 이때는 완료라고 말하지 말고 `goal-command.md`의 `/goal …` 줄을 입력창에 한 번 보내 달라고 한 줄로 안내한다(0.8.0 미만이면 goaljaby 업데이트도 함께 권한다).
   - **보드 (한 개만 띄운다):** playmaker가 감지되면 아무것도 제안하지 않는다 — `/goal`이 시작될 때 playmaker가 골 보드(작업 카드 + 루프 회차·DoD·⏸ 판단 대기 줄)를 저절로 연다. playmaker가 없을 때만, 골 발사 직전(아직 질문 경계 안) 관제탑이 안 떠 있으면 **한 번만** 제안한다: "브라우저 상황판(tower)을 띄우고 주행할까요?" — 수락 시 `/insane-loop:tower` Step 2~3 절차로 백그라운드 기동(이미 떠 있으면 브라우저만). 거절하면 다시 묻지 않는다. tower는 여러 프로젝트의 루프를 한 화면에서 모아 볼 때 사용자가 직접 띄운다.
- goaljaby 미설치 → 설치 안내 + 폴백: recovery-ladder.md와 PRD로 이 세션에서 goal-command 초안을 직접 작성해 사용자 승인 후 `/goal` 발사. 이 경우 자동 실행 훅이 없으므로 `/goal …` 줄을 마지막 줄에 두고, 사용자가 그 줄을 입력창에 한 번 보내야 골이 시작된다고 안내한다(goaljaby 0.8.0+ 설치 시 자동 시작).

## 스테이지 C: 루프 진행 / 재개 (골 내부 반복)

**매 회차 (골 자율 주행 안에서):**
1. **검증**: VALIDATION.md 항목 실행 + LOOP.md의 잔여 blocking 가정 대조 → 실패/미확정 목록
2. **DoD 판정**: 전체 통과 + blocking 가정 0 → **완료** (LOOP.md status `done`, 회차 요약 보고, 잔여 non-blocking 가정 목록 노출)
3. 미달 → **리커버리 사다리 단계 판정** (LOOP.md 회차 기록 기준):
   - 1단 (단발 실패): 같은 접근으로 수정 → 재검증
   - 2단 (같은 항목 2회 연속): 접근 변경 — 설정된 딥 리뷰어 투입 또는 다른 각도 셀프리뷰. 실패 목록+가정 원장+관련 코드를 컨텍스트로 리뷰어를 **있는 그대로** 호출. 리뷰어가 pumasi면 막힌 원인이 설계 방향일 때만 후보 경쟁(`candidates: 2`)으로 접근안 2개를 받아 기준표로 하나를 고른 뒤 적용한다 — 코드 수정 자체를 후보로 경쟁시키지 않는다(같은 파일 충돌)
   - 3단 (3회 연속 or 구조적 갭): LOOP.md에 `gate_pending`+질문 내용 기록하고, 막힌 작업의 PLAN.md 줄을 `[!]`(사람 대기)로 바꾼 뒤 **골을 멈춘다** — 골 도중 질문을 띄우지 않는다. 방향 질문은 사용자가 돌아와 `/insane-loop`로 재진입할 때 제시
4. **개선 적용**: 리뷰 결과에서 태스크를 추려 적용, PROGRESS.md·LOOP.md 갱신 → 재검증(1번으로)
   - PLAN.md 작업 마커(goaljaby 0.7+): 실패 항목과 관련된 작업 줄은 고치기 시작할 때 `[>]`, 재검증을 통과하면 `[x]`로 바꾼다. `[>]`는 지금 실제로 손대는 작업에만 — 마일스톤 전체를 한꺼번에 `[>]`로 바꾸고 끝에 한꺼번에 `[x]`로 바꾸지 않는다(보드가 진행을 못 보여 준다). **마커만** 바꾸고 작업 문장은 고치지 않는다. 관련 줄이 없는 새 개선 작업은 PLAN에 추가하지 않고 LOOP.md 회차의 `적용 태스크`에 적는다. 이 마커가 playmaker 보드에 그대로 보인다.

**드리븐 규칙 (조기 종료 금지):** DoD 미달 상태에서 턴/골을 끝내려는 자신을 발견하면 — 완료 선언 전에 반드시 VALIDATION 통과 증거를 확인하고, 증거가 없으면 사다리 단계로 재진입한다. 모호하면 질문 대신 기본값+가정 원장 기록 후 계속. 포기 대신 사다리 2단. 정당한 멈춤은 세 가지뿐: DoD 충족 / `gate_pending` / 사용자 명시 중단.

**Resume:** LOOP.md가 있으면 마지막 회차 블록에서 이어간다. `gate_pending`이면 그 질문부터 — 답을 받으면 `[!]` 작업을 `[>]`로 되돌리고 status를 `active`로 바꾼 뒤 이어간다. playmaker 카드의 'gate 답하기'로 들어온 답도 같은 재진입이다. `done`이면 이어가지 않는다(완료 요약만 재표시 — 위 감지 순서 1 참조).

## 완료 보고

DoD 충족 시: 총 회차 수 / 회차별 판정 추이 / 사용된 리뷰어 / 남은 non-blocking 가정 목록 / 다음 제안(릴리즈·리팩터 등) 을 간결히 보고한다.
