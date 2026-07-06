# Changelog

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
