# Codex에서 실행할 때 (insane-loop)

SKILL.md 절차는 그대로 따르고, 아래 차이만 적용한다.

## 카드 질문 = 질문 도구 (이번 세션 도구 목록으로 판단)

루프 설정 카드(리뷰어·재드라이브·blocking 가정)는 골 시작 전에 반드시 실제로 띄운다. 추측으로 건너뛰지 않는다.

1. `request_user_input_async`가 있으면 카드 1콜 = 이 도구 1콜(문항 ≤4개).
   - 형식: `{"questions":[{"title":"헤더 — 한 줄 질문","options":["추천안 (추천) — 설명","대안 — 설명"]}]}`
   - 문항에는 `title`·`options`만. `question`·`header`·`id`를 넣으면 파싱 오류가 난다. 추천안이 맨 앞, "기타" 옵션은 넣지 않는다.
   - 부른 뒤 "위 질문에 답해 주시면 이어서 진행합니다" 한 줄만 쓰고 턴을 끝낸다. 답을 추측으로 진행하지 않는다.
2. Plan 모드라 `request_user_input`만 있으면: 1콜 3문항까지라 4문항 카드는 나눈다. `header`(12자 이내)·`id`(snake_case)·`question`, 선택지 2~3개, 추천 라벨 끝에 `(Recommended)`.
3. 둘 다 없으면 채팅에 번호 블록(`Q1. …` / `1. 추천안 — …` / `2. 대안 — …` / `3. 문장으로 직접 수정`)으로 내고 "Q1-1, Q2-2"처럼 답받는다. "모르면 전부 1번으로 진행"을 덧붙인다.
4. `codex exec`처럼 사람이 답할 수 없는 실행이면 묻지 않고 추천안(셀프리뷰·재드라이브 없음)으로 진행해 LOOP.md 회차 0에 가정으로 적는다.

`preview`는 없다. 보여 줄 비교는 도구를 부르기 직전 채팅에 짧게 쓴다.

## 다른 스킬 호출

Codex에는 `Skill` 도구와 슬래시 호출이 없다. "`/show-me-the-prd`·`/goaljaby`·`/playmaker`로 위임" 단계는 그 플러그인 스킬의 SKILL.md를 열어 그 절차를 따르는 것으로 바꾼다(설치 감지는 `~/.codex` 아래 플러그인 캐시 또는 마켓 클론에서 같은 이름의 폴더를 찾는다). 리뷰어(insane-review·pumasi 등)도 같은 방식이다. 서브에이전트가 필요한 곳은 `spawn_agent`를 쓰거나 순차로 실행한다.

## 골 시작 (스테이지 B-4)

Codex에는 `/goal` 슬래시 명령과 "마지막 줄 `/goal`" 훅 자동 실행이 없다. goaljaby 스킬이 사용자 승인 뒤 `create_goal` 도구로 골을 시작한다(상태 확인·갱신은 `get_goal`·`update_goal`). 따라서 `/goal` 줄을 마지막 줄에 두라는 규칙과 "붙여넣으라고 안내" 문구는 적용하지 않는다. 승인 전에는 골을 만들지 않고, LOOP.md status `active`는 `create_goal` 호출 직전에 쓴다. 골 시작 후 질문 0, `gate_pending` 파킹 규칙은 동일하다.

## 보드

Codex에는 mod가 없어 playmaker 패널이 자동으로 열리지 않는다. 보드가 필요하면 playmaker의 웹 보드 또는 tower(`skills/tower/SKILL.md`)를 브라우저로 연다. 사용자가 원할 때만 열고, 거절하면 다시 묻지 않는다. 카드 행동 지시문은 오지 않으므로 gate 답은 채팅으로 받아 같은 재진입 규칙으로 처리한다.

## 그 밖의 차이

- 첫 실행 설정(`setup/setup.sh`)은 Claude Code 전용이다. Codex에서는 실행하지 않는다.
- 의존 감지의 `$HOME/.claude/plugins/cache/...` 경로는 Claude Code 기준이다. Codex에서는 설치된 스킬 목록으로 판단한다.
