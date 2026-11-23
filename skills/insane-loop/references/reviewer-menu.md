# 리뷰어 메뉴 — 감지·선택·호출

원칙: **있는 그대로 호출, 녹이지 않는다.** 어댑터 레이어·출력 형식 계약 없음. 컨텍스트(검증 실패
목록 + 가정 원장 + 관련 코드 경로)를 프롬프트에 얹어 호출하고, 응답을 그대로 읽어 태스크를 추린다.

## 감지 (Turn 0, 유저에게 묻지 않음)

```bash
ls $HOME/.claude/plugins/cache/*/insane-review 2>/dev/null   # insane-review 설치 여부
ls $HOME/.claude/plugins/cache/*/pumasi 2>/dev/null          # pumasi 설치 여부 (후보 경쟁)
command -v codex >/dev/null 2>&1 && codex --version          # Codex CLI
command -v gjc   >/dev/null 2>&1 && gjc --version            # gajae-code CLI
```

감지된 것만 루프 설정 카드의 선택지로 노출한다. 아무것도 없으면 카드에서 리뷰어 문항 생략(셀프리뷰 고정).

## 선택지 구성 (루프 설정 카드 — 골 시작 전 1회 확정)

| 옵션 | 설명(카드 description에 쓸 내용) | 투입 방식 |
|---|---|---|
| 셀프리뷰 (추천) | 현 세션 Claude가 즉시 검토. 비용 제로 — 미세 루프는 싸야 자주 돈다 | 매 회차 기본 |
| insane-review | ChatGPT Pro 웹의 최신 모델로 교차진단 (ChatGPT Pro 구독 필요). 추론 강도 기본 Pro. 전용 브라우저가 뒤에서 돌아 사용자를 부르지 않는다. 같은 폴더 리뷰가 한 ChatGPT 프로젝트에 쌓여 회차 간 맥락 누적. 느림 | 사다리 2단 또는 마일스톤 (카드에서 선택) |
| codex | Codex CLI 교차검토 (OpenAI 구독) | 사다리 2단 또는 마일스톤 |
| gjc | gajae-code 멀티모델 교차검토 | 사다리 2단 또는 마일스톤 |
| pumasi 후보 경쟁 | 외부 워커 2개가 서로 다른 접근안을 따로 쓰고, 기준표로 하나를 고른다. 막힌 원인이 설계 방향일 때만 쓴다 | 사다리 2단 전용 |

선택 결과는 LOOP.md `reviewer:` 줄에 기록 — 자율 주행 중에는 카드 UI가 불가하므로 여기 기록이 유일한 설정원이다.

## 호출 방법 (있는 그대로)

- **셀프리뷰**: 현 세션에서 검토 턴 수행. 관점을 바꿔 재검토할 때는 실패 항목별 반박 시도(왜 이 수정이 틀렸을 수 있는가)로.
- **insane-review**: `/insane-review` 스킬 흐름 그대로 (repomix 패킹 → ChatGPT Pro → 회수). 정밀 진단이므로 풀 코드 — `--compress` 금지, `--force-answer-after` 금지 (스킬 자체 규칙). 추론 강도: LOOP.md `reviewer:` 줄에 `effort=`가 있으면 그 값을 `--effort`로 그대로 넘기고, 없으면 기본 Pro. 다른 값으로 바꿔 보내지 않는다.
- **codex**: `codex exec "{컨텍스트+질문}"` 비대화 모드.
- **gjc**: `gjc --print "{컨텍스트+질문}"` (프롬프트는 --print 뒤 positional).
- **pumasi 후보 경쟁**: `/pumasi` 스킬 흐름 그대로, task 하나에 `candidates: 2`를 붙인다. 지시는 "실패 항목 + 가정 원장 + 지금까지 시도한 접근(LOOP.md 회차)을 보고, 다른 접근안 하나를 `docs/loop-approach-c<i>.md`로 쓴다 — 코드는 고치지 않는다". 둘 다 끝나면 기준표(요구 충족·근거·실행 가능성·지난 실패와의 차이)로 하나를 고르고, 채택 이유를 LOOP.md 회차에 남긴 뒤 그 접근으로 루프가 직접 고친다. 코드 수정 자체를 후보로 돌리지 않는다(같은 파일 충돌).

CLI 두 종은 응답이 텍스트로 돌아온다 — 파싱하지 말고 읽어서 개선 태스크를 추린다.
호출 실패(미로그인·타임아웃 등) 시: LOOP.md에 기록하고 셀프리뷰로 폴백, 루프는 계속.
