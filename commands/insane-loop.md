---
name: insane-loop
description: "아이디어→PRD→골→검증→개선을 문서 정의 완성까지 골로 계속 돌리는 루프 오케스트레이터"
argument-hint: "[아이디어 | PRD 경로 | 프로젝트 경로 — 비우면 현재 디렉토리 상태 감지]"
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
  - WebSearch
  - WebFetch
---

<!-- first-run setup: idempotent, non-blocking, self-skips after first run -->
**Step 0 — run once at the very start, before anything else:** run `bash "${CLAUDE_PLUGIN_ROOT}/setup/setup.sh" ask autoupdate`. If its output starts with `STAR_ASK`, immediately call the **AskUserQuestion** tool once, with the question and options phrased **in the user's language**: prefer the current conversation's language if it is evident; otherwise fall back to the language code that follows `STAR_ASK` in the output (`ko`→Korean, `ja`→Japanese, `en`→English). Never default to Korean blindly.
- header: a short localized "GitHub Star" label
- question: ask whether they'd like to give this plugin (and the gptaku-plugins marketplace) a GitHub ⭐ to support it — note it is optional and every feature works either way
- options: exactly two — (1) yes, star it → then run `bash "${CLAUDE_PLUGIN_ROOT}/setup/setup.sh" star yes`; (2) no thanks → then run `bash "${CLAUDE_PLUGIN_ROOT}/setup/setup.sh" star no`
- If the output contains a line `AUTOUPDATE_ASK <lang>`: ask the user ONCE with AskUserQuestion, written in the language the user is using in this conversation (fall back to <lang> — ko/ja/en — only if the conversation gives no signal). Question: gptaku-plugins can update itself automatically so you always get fixes without running /plugin manually. Turn on auto-update? Options (2): "Turn on auto-update" / "Not now".
  - "Turn on auto-update" → run `bash "${CLAUDE_PLUGIN_ROOT}/setup/setup.sh" autoupdate yes` (prints `AUTOUPDATE_SET <status>`; on `on`/`already` say it is enabled, otherwise say it could not be changed and point to /plugin → Marketplaces → gptaku-plugins → Turn on auto-update).
  - "Not now" → run `bash "${CLAUDE_PLUGIN_ROOT}/setup/setup.sh" autoupdate no`.
  If both STAR_ASK and AUTOUPDATE_ASK appear, put both questions in ONE AskUserQuestion call (two questions).

If the output is empty, just continue silently. (AskUserQuestion must NOT be in frontmatter allowed-tools.) Do not narrate beyond the question itself.

# /insane-loop Command

입력: `$ARGUMENTS`

**지금 바로** `${CLAUDE_PLUGIN_ROOT}/skills/insane-loop/SKILL.md`를 Read하고, 맨 아래 "실행 절차"(Turn 0 → 스테이지 A/B/C → 완료 보고)를 이 명령의 실행 지시서로 따른다. 참고 자료가 아니라 지금 실행할 절차다.

- 루프 설정 카드와 확인 카드는 **AskUserQuestion 도구를 실제로 호출**한다(콜당 ≤4문항, 추천 옵션 첫 번째). 채팅 번호 목록으로 대신하지 않는다.
- SKILL.md의 `references/…` 경로는 `${CLAUDE_PLUGIN_ROOT}/skills/insane-loop/references/…`다. `references/codex.md`는 Codex 전용이라 읽지 않는다.
