---
name: tower
description: "insane-loop 실행을 MES식 브라우저 상황판으로 관제한다. '상황판 띄워줘', '루프 어디까지 갔어', '관제탑 열어줘', 'tower' 요청에 사용. 단, 루프를 새로 시작하려면 /insane-loop를 사용한다."
argument-hint: "[감시 루트 경로 — 비우면 현재 디렉토리] [--port N]"
allowed-tools:
  - Bash
  - Read
---

# /insane-loop:tower — 라이브 관제탑

insane-loop가 남기는 파일(LOOP.md·PRD/·goaljaby 산출물)을 감시해 공정 레일·회차 타임라인·DoD 게이지·gate_pending 배너를 **브라우저에서 실시간(SSE)** 으로 보여준다. 관측 전용(read-only)·결정론(LLM 무개입)·zero-dep. insane-loop에 내장된 기능이며 별도 설치가 없다.

## 실행 흐름

### Step 1: 인자 해석

- `$ARGUMENTS`에서 감시 루트(기본: 현재 디렉토리)와 `--port N`(기본 7180)을 읽는다.
- 루트는 **LOOP.md를 가진 프로젝트들의 상위 폴더**면 된다 (깊이 3까지 자동 발견). 여러 루프가 동시에 돌아도 카드로 분리 표시된다 — 겹치지 않는다.

### Step 2: 기존 인스턴스 확인 (중복 기동 방지)

```bash
curl -s --max-time 1 http://127.0.0.1:{PORT}/api/state >/dev/null 2>&1 && echo RUNNING || echo FREE
```

- `RUNNING`이면 새로 띄우지 않고 브라우저만 연다: `open http://127.0.0.1:{PORT}/` — 관제탑은 머신당 1대가 여러 루프를 집계하는 모델이다.
- `FREE`면 Step 3.

### Step 3: 기동 (백그라운드)

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/insane-loop/scripts/tower.mjs" --root {ROOT} --port {PORT} --open
```

백그라운드로 실행하고, 사용자에게 URL(`http://127.0.0.1:{PORT}/`)을 보고한다.

### Step 4: 안내 한 줄

- gate_pending 주황 배너가 뜨면 루프가 사용자 입력을 기다리는 것 — 터미널에서 재개하라고 안내.
- 데모가 필요하면: `node "${CLAUDE_PLUGIN_ROOT}/skills/insane-loop/scripts/simulate-loop.mjs" --dir {ROOT}/tower-demo` (샌드박스에만 쓴다).

## 경계

- playmaker가 설치돼 있으면 골 하나의 진행은 playmaker 보드가 기본이다(`/goal` 시작 때 자동으로 열림). 관제탑은 여러 프로젝트 루프를 한 화면에서 모아 볼 때 쓴다.
- 관제탑은 루프를 제어하지 않는다 (재개/중단은 터미널). 감시 대상 파일에 아무것도 쓰지 않는다.
- 같은 프로젝트 폴더에서 루프 두 개를 동시에 돌리지 말 것 — LOOP.md 동시 쓰기는 저널을 꼬이게 한다 (관제탑은 flapping으로 보여줄 뿐 막지 못한다).
