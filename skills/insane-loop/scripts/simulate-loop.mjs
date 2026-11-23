// simulate-loop.mjs - sandbox replay of an insane-loop run, for watching loop-tower live.
//
// Writes ONLY inside its own sandbox directory (never a real project). Replays:
// PRD creation -> goal setup -> 4 improvement rounds (ladder stage 2 and one
// gate_pending included) -> done, with VALIDATION checkboxes flipping along the way.
//
// Usage:  node simulate-loop.mjs [--dir DIR] [--step-ms N]
//   --dir      sandbox root (default ./tower-sim/demo-project)
//   --step-ms  delay between steps (default 1800)

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
let dir = resolve("tower-sim", "demo-project");
let stepMs = 1800;
for (let i = 0; i < args.length; i += 1) {
	if (args[i] === "--dir") dir = resolve(args[++i]);
	else if (args[i] === "--step-ms") stepMs = Number.parseInt(args[++i], 10);
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function validationMd(checked) {
	const items = [
		"tower.mjs가 127.0.0.1에서 기동된다",
		"SSE로 상태가 push된다",
		"LOOP.md 회차가 보드에 표시된다",
		"gate_pending 배너가 표시된다",
		"검증 패널이 실시간 갱신된다",
		"인스펙터가 경로 격리를 지킨다",
		"시뮬레이터 재생이 무새로고침으로 보인다",
	];
	return `# VALIDATION\n\n${items.map((item, index) => `- [${index < checked ? "x" : " "}] ${item}`).join("\n")}\n`;
}

function loopMd({ status, blocking, rounds }) {
	const head = [
		"# insane-loop 저널: demo-project",
		"",
		`- status: ${status}`,
		"- dod: VALIDATION 전체 통과 + blocking 가정 0",
		"- prd: PRD/01_PRD.md / validation: VALIDATION.md",
		"- reviewer: self (사다리2단: codex)",
		"- redrive: loop",
		`- blocking_assumptions_remaining: [${blocking.join(", ")}]`,
		"",
	];
	return head.join("\n") + rounds.join("\n") + "\n";
}

function round(n, date, verify, ladder, verdict, extras = "") {
	return [
		`## 회차 ${n} — ${date}`,
		`- 검증: 통과 ${verify} / 실패 항목: ${extras || "없음"}`,
		`- 사다리 단계: ${ladder} / 리뷰어: ${ladder >= 2 ? "codex" : "self"}`,
		"- 적용 태스크: 데모 개선 작업",
		`- 판정: ${verdict}`,
		"",
	].join("\n");
}

async function main() {
	console.log(`simulate-loop: sandbox=${dir} step=${stepMs}ms`);
	await mkdir(join(dir, "PRD"), { recursive: true });

	console.log("1/8 PRD 생성 (공정 A)");
	const prd = `# PRD: demo\n\n데모 프로젝트.\n\n## 가정 원장\n\n| # | 가정 | 영향 문서 | 확인 |\n|---|------|----------|------|\n| 1 | 로컬 전용 | 01 | 자명 |\n| 4 | FAIL 신호 규약 | 04 | 미확인 |\n| 5 | evidence 탐색 범위 | 02 | 미확인 |\n`;
	await writeFile(join(dir, "PRD", "01_PRD.md"), prd);
	await writeFile(join(dir, "PRD", "02_DATA_MODEL.md"), "# 데이터 모델\n");
	await sleep(stepMs);
	await writeFile(join(dir, "PRD", "03_PHASES.md"), "# Phase\n");
	await writeFile(join(dir, "PRD", "04_PROJECT_SPEC.md"), "# 스펙\n");
	await writeFile(join(dir, "PRD", "README.md"), "# PRD\n");
	await sleep(stepMs);

	console.log("2/8 골 세팅 (공정 B)");
	await writeFile(join(dir, "VALIDATION.md"), validationMd(0));
	await writeFile(join(dir, "RECOVERY.md"), "# RECOVERY\n사다리 1→2→3\n");
	await sleep(stepMs);
	await writeFile(join(dir, "PLAN.md"), "# PLAN\n");
	await writeFile(join(dir, "PROGRESS.md"), "# PROGRESS\n");
	await writeFile(join(dir, "goal-command.md"), "# goal-command\n");
	await sleep(stepMs);

	console.log("3/8 골 발사 - 회차 1 (사다리 1단)");
	const rounds = [round(1, "2026-07-18", "2/7", 1, "계속")];
	await writeFile(join(dir, "LOOP.md"), loopMd({ status: "active", blocking: [4, 5], rounds }));
	await writeFile(join(dir, "VALIDATION.md"), validationMd(2));
	await sleep(stepMs);

	console.log("4/8 회차 2 (같은 실패 반복 - 사다리 2단, 딥 리뷰어)");
	rounds.push(round(2, "2026-07-18", "4/7", 2, "계속", "SSE 재연결, 게이트 배너"));
	await writeFile(join(dir, "LOOP.md"), loopMd({ status: "active", blocking: [4, 5], rounds }));
	await writeFile(join(dir, "VALIDATION.md"), validationMd(4));
	await sleep(stepMs);

	console.log("5/8 회차 3 - 구조적 갭, gate_pending (공정 C 게이트)");
	rounds.push(round(3, "2026-07-18", "5/7", 3, "gate_pending: FAIL 신호 규약(가정 4)을 어느 범위로 확정할까요?"));
	await writeFile(join(dir, "LOOP.md"), loopMd({ status: "gate_pending", blocking: [4], rounds }));
	await writeFile(join(dir, "VALIDATION.md"), validationMd(5));
	await sleep(stepMs * 2.5);

	console.log("6/8 사용자 재진입 - 회차 4 재개");
	rounds.push(round(4, "2026-07-18", "7/7", 1, "계속", "없음"));
	await writeFile(join(dir, "LOOP.md"), loopMd({ status: "active", blocking: [], rounds }));
	await writeFile(join(dir, "VALIDATION.md"), validationMd(7));
	await sleep(stepMs);

	console.log("7/8 DoD 충족 - done");
	rounds.push(round(5, "2026-07-18", "7/7", 1, "done"));
	await writeFile(join(dir, "LOOP.md"), loopMd({ status: "done", blocking: [], rounds }));
	await sleep(stepMs);

	console.log("8/8 완료. tower에서 공정 D가 초록인지 확인하세요.");
}

main();
