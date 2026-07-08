# Changelog

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
- 표준 구성: setup.sh(첫 실행 셋업 + 업데이트 알림 훅), MIT LICENSE + DISCLAIMER.md

### 기획 근거

- gjc(gajae-code) deep-interview 분석 → Draft-First A/B 검증(사전 등록 기준 4/4 통과) → 파이프라인 설계
- 기획서: 마켓플레이스 repo `docs/insane-loop-plan-2026-07-06.md`
