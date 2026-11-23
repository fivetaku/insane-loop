---
name: tower
description: "insane-loop 실행을 MES식 브라우저 상황판으로 관제한다. '상황판 띄워줘', '루프 어디까지 갔어', '관제탑 열어줘', 'tower' 요청에 사용. 단, 루프를 새로 시작하려면 /insane-loop를 사용한다."
argument-hint: "[감시 루트 경로 — 비우면 현재 디렉토리] [--port N]"
allowed-tools:
  - Bash
  - Read
---

# /insane-loop:tower

인자: `$ARGUMENTS`

**지금 바로** `${CLAUDE_PLUGIN_ROOT}/skills/tower/SKILL.md`를 Read하고, 그 "실행 흐름"(Step 1~4)을 이 명령의 실행 지시서로 따른다. 참고 자료가 아니라 지금 실행할 절차다.
