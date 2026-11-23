# Changelog

## [0.4.0] - 2026-11-23

### Changed — 공개 전환, gptaku-plugins 마켓 등록

- 라이선스를 insane:// Member License에서 MIT로 바꿨다(LICENSE·DISCLAIMER·README×5·plugin.json). 이제 gptaku-plugins 마켓에서 누구나 설치한다.
- 정본 레포를 `fivetaku/insane-loop`(공개)로 옮겼다. insane-plugins 프라이빗 마켓의 in-tree 사본은 이 레포를 가리키는 서브모듈로 바뀐다.
- `plugin.json`에 `homepage`·`repository`·`dependencies: ["gptaku-core"]`를 추가하고, gptaku-core 라우터용 `routing.json`을 넣었다.
- `setup/`의 첫 실행·업데이트 알림 훅을 마켓 공용 템플릿(shared/update-hook)과 맞췄다. 첫 실행 때 gptaku-plugins 자동 업데이트를 켤지 한 번 묻는다(`setup.sh ask autoupdate`).

## [0.3.2] - 2026-11-09

### Changed — goaljaby 0.8 자동 골 시작에 맞춤

- goaljaby 0.8.0+는 승인 턴 응답의 마지막 줄 `/goal …`을 `turn.complete` 훅이 바로 실행한다(Paseo 포함). 0.3.1의 "Paseo에서는 `/goal` 줄을 붙여넣으라고 안내" 규칙을 걷어내고, 안내는 goaljaby 0.8.0 미만·훅 실패 토스트·goaljaby 미설치 폴백일 때만 한다.
- 승인 턴에서 insane-loop가 `/goal` 줄 뒤에 아무것도 덧붙이지 않도록 명시 — 훅은 마지막 줄만 읽으므로 LOOP.md 기록·보드 안내는 Step 10 출력 전에 끝낸다.
- LOOP.md `active` 시점: goaljaby 0.8.0+면 `/goal` 줄 직전, 그 밖에는 골이 실제로 시작된 첫 턴. Turn 0 의존 감지에 goaljaby 버전 확인 추가.

## [0.3.1] - 2026-10-22

### Fixed — 실전 1회차(md-progress, Paseo) 발견 3건

- 루프 설정 카드를 "비대화형 세션 같다"는 추측으로 건너뛰고 기본값을 쓰던 문제: 카드는 반드시 실제로 띄우고, 호출이 실패했을 때만 기본값 + LOOP.md 기록.
- goaljaby의 마지막 줄 `/goal`이 실행되지 않는 환경(Paseo)에서 골 시작 없이 턴이 끝나던 문제: 골이 실제로 시작되기 전에는 `active`로 바꾸지 않고, 사용자에게 `goal-command.md`의 `/goal` 줄을 보내라고 안내.
- 마일스톤 작업을 한꺼번에 `[>]`→`[x]`로 바꿔 보드가 진행을 못 보여 주던 문제: `[>]`는 지금 손대는 작업 한 줄씩.

## [0.3.0] - 2026-10-21

### Changed — playmaker 보드 연동 + 하위 플러그인 현행화

- **보드 한 개만**: playmaker가 설치돼 있으면 골 발사 직전의 tower 제안을 생략한다. `/goal` 시작 때 playmaker가 골 보드를 저절로 열고(작업 카드 + LOOP.md 루프 줄), 카드 행동('gate 답하기'·'접근 바꿔서 다시'·'DoD 다시 판정')은 사다리·재진입 규칙대로 처리한다. tower는 playmaker가 없을 때의 대체 보드이자 여러 프로젝트 모아 보기로 남긴다.
- **PLAN.md 작업 마커**: 개선 회차에서 관련 작업 줄을 고치기 시작하면 `[>]`, 재검증 통과 `[x]`, 사다리 3단으로 멈추면 `[!]`, gate 답을 받아 재진입하면 `[!]`→`[>]`. goaljaby 0.7+ 규칙대로 마커만 바꾸고, 관련 줄이 없는 새 작업은 LOOP.md `적용 태스크`에 적는다(recovery-ladder.md §작업 마커).
- **리뷰어**: insane-review 설명을 최신 Pro 모델 기준으로 고치고, 추론 강도(기본 Pro, LOOP.md `reviewer:` 줄의 `effort=`가 있으면 그대로 `--effort`)를 명시. pumasi 후보 경쟁을 사다리 2단 선택지로 추가 — 막힌 원인이 설계 방향일 때 접근안 2개를 문서로 받아 기준표로 고르고, 코드 수정 자체는 후보로 돌리지 않는다.
- **goaljaby 가정 원장**: 원장 보존·승계는 goaljaby 0.6.3+ 기본 동작이므로 전달 컨텍스트를 "blocking 항목을 VALIDATION 검증 항목으로"로 줄였다. 하위 플러그인 기준 버전 표기 현행화(show-me-the-prd 0.10.2, goaljaby 0.7+).
- README 5개 언어: 보드(playmaker) 절, 사다리 3단 `[!]`, 리뷰어 표(pumasi), 소프트 의존에 playmaker 추가.

## [0.2.1] - 2026-07-23

### Fixed — 안정성·프라이빗 마켓 정합 (검증 리서치 후속)

- `tower.mjs`: 포트 점유(EADDRINUSE) 시 스택 크래시 대신 안내 메시지 후 정상 종료(`server.on("error")` 추가). SSE 브로드캐스트를 클라이언트별 try/catch로 감싸 죽은 소켓 하나가 나머지 클라이언트 업데이트를 막지 않게 수정(죽은 소켓은 즉시 제거).
- 지시서: `LOOP.md status: done`이면 스테이지 C에 재진입해 재검증하지 않고 완료 요약만 재표시 — 명시적 재개 요청 시에만 active 복귀.
- `setup/setup.sh`: 손상된 `~/.claude/settings.json`을 만나면 `.bak` 백업 후 중단 — 덮어쓰기 제거. 배열이 아닌 SessionStart도 건드리지 않음.
- `setup/gptaku-update-check.cjs`: 마켓플레이스 경로 하드코드 제거 — gptaku-plugins·insane-plugins 클론을 모두 검사(마켓별 캐시), 알림 문구 일반화.
- 문서: 라이선스 표기를 실제 LICENSE(insane:// Member License)와 일치하도록 교정(README×5·DISCLAIMER·CHANGELOG), `shared/questioning-policy.md` 마켓 루트 벤더링으로 댕글링 참조 해소.

## [0.2.0] - 2026-07-22

### Added — /insane-loop:tower 라이브 관제탑 (MES식 상황판, 내장 기능)

- `skills/insane-loop/scripts/tower.mjs`: LOOP.md·PRD·goaljaby 산출물을 감시해 공정 레일(A PRD→B 골 세팅→C 회차 루프→D 완료)·회차 타임라인·DoD 게이지·gate_pending 배너를 브라우저에서 실시간(SSE) 표시. 읽기 전용·결정론(LLM 무개입)·zero-dep(node 빌트인)·127.0.0.1 전용·경로 격리(.. / symlink 거부). 문서 요약 패널(제목·리드 기계 추출) + 전문 뷰어 포함. Apple design.md 토큰 기반 라이트 룩.
- `commands/tower.md`: 기동 커맨드 — 기존 인스턴스 재사용(중복 기동 방지), 머신당 1대가 여러 루프를 카드로 분리 집계.
- `skills/insane-loop/scripts/simulate-loop.mjs`: 샌드박스 데모 재생기(회차 5회·gate_pending 시나리오).
- `skills/insane-loop/scripts/tests/tower-parse.test.mjs`: 파서 계약 테스트 9종 (`node --test`) — 저널/체크리스트/가정 원장 파싱, 공정 판정, 경로 격리, 대시보드 인라인 스크립트 파싱 회귀(템플릿 이스케이프 백지 화면 결함 고정).
- 지시서 스테이지 B-4: 골 발사 직전 관제탑 1회 제안(거절 시 재질문 없음). SKILL.md에 동시 실행 경계 명문화(같은 프로젝트 루프 2개 금지).

## [0.1.2] - 2026-07-09

### Changed — 디자인 레퍼런스 파이프라인 관통 명시

- 스테이지 A: show-me-the-prd v0.10+가 UI 기획일 때 `PRD/references/`(디자인 레퍼런스)까지 생성함을 명시.
- 스테이지 B: goaljaby v0.6+가 references/를 PLAN/VALIDATION으로 자동 승계하므로 별도 전달 불필요. 딥 리뷰어 투입 시에만 리뷰 컨텍스트에 스타일 방향(`sources.json` `query.style`) 한 줄 포함.

## [0.1.1] - 2026-07-07

### Changed — 질문 경계를 "골 시작"으로 명확화

- **골 시작 전: 물어볼 결정이 남아 있으면 모두 묻는다** — 기존 "설정 카드 1콜" 예산 제거. blocking 가정 미해소 상태로 골을 발사하지 않는다 (콜당 ≤4문항 배칭은 유지).
- **골 시작 후: 질문 0** — 사다리 3단도 골 도중 질문을 띄우지 않고, `gate_pending`+질문 내용을 LOOP.md에 기록하고 골을 멈춘다. 질문은 사용자가 재진입할 때 제시.
- 반영 파일: commands/insane-loop.md(원칙 4·스테이지 B·사다리 3단), SKILL.md, references/recovery-ladder.md

## [0.1.0] - 2026-07-07

### Added — 최초 스캐폴딩 (Phase 1~2 설계 반영)

- `/insane-loop` 커맨드: 상태 감지 라우터(LOOP.md → VALIDATION → PRD/ → 백지) + 스테이지 A/B/C 오케스트레이션
- 4대 원칙: 엔진=/goal·문서=DoD / 오케스트레이션만(재구현·어댑터 금지) / 승인 게이트 존중 / 질문 예산(설정 카드 1콜)
- 골 내부 개선 회차: 검증 → 리뷰어 → 개선 적용 → 재검증, DoD(VALIDATION 전체 통과 + blocking 가정 0)까지 반복
- 갭 리커버리 사다리(재시도→접근 변경→재계획 게이트) + 멈춤 원인 매핑 — goaljaby RECOVERY 반영용 원문(`references/recovery-ladder.md`)
- 리뷰어 선택 4종: 셀프리뷰(기본) / insane-review / codex / gjc — 감지된 것만 노출, 있는 그대로 호출(`references/reviewer-menu.md`)
- LOOP.md 단일 저널(회차 기록·resume 지점·gate_pending)
- 표준 구성: setup.sh(첫 실행 셋업 + 업데이트 알림 훅), LICENSE(insane:// 멤버 라이선스) + DISCLAIMER.md

### 기획 근거

- gjc(gajae-code) deep-interview 분석 → Draft-First A/B 검증(사전 등록 기준 4/4 통과) → 파이프라인 설계
- 기획서: 마켓플레이스 repo `docs/insane-loop-plan-2026-07-06.md`
