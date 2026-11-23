import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptUrl = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "..", "tower.mjs")).href;

const LOOP_FIXTURE = `# insane-loop 저널: demo

- status: gate_pending
- dod: VALIDATION 전체 통과 + blocking 가정 0
- reviewer: self (사다리2단: codex)
- blocking_assumptions_remaining: [4, 5]

## 회차 1 — 2026-07-18
- 검증: 통과 2/7 / 실패 항목: SSE, 배너
- 사다리 단계: 1 / 리뷰어: self
- 판정: 계속

## 회차 2 — 2026-07-18
- 검증: 통과 5/7 / 실패 항목: 없음
- 사다리 단계: 2 / 리뷰어: codex
- 판정: gate_pending: FAIL 신호 범위를 확정할까요?

\`\`\`markdown
## 회차 99 — 가짜 (펜스 안)
- 검증: 통과 9/9
\`\`\`
`;

test("#given a LOOP.md journal #when parsed #then header fields and round blocks come out typed", async () => {
	// given
	const { parseLoopJournal } = await import(scriptUrl);
	// when
	const journal = parseLoopJournal(LOOP_FIXTURE);
	// then
	assert.equal(journal.status, "gate_pending");
	assert.deepEqual(journal.blockingAssumptions, [4, 5]);
	assert.equal(journal.rounds.length, 2);
	assert.deepEqual(
		journal.rounds.map((round) => [round.n, round.verifyPassed, round.verifyTotal, round.ladderStage]),
		[
			[1, 2, 7, 1],
			[2, 5, 7, 2],
		],
	);
	assert.equal(journal.rounds[1].gateQuestion, "FAIL 신호 범위를 확정할까요?");
	assert.equal(journal.rounds[0].failedItems, "SSE, 배너");
});

test("#given fenced fake rounds #when parsed #then fence content is ignored", async () => {
	// given
	const { parseLoopJournal } = await import(scriptUrl);
	// when / then --- the fenced 회차 99 must not appear
	assert.ok(!parseLoopJournal(LOOP_FIXTURE).rounds.some((round) => round.n === 99));
});

test("#given an unknown status value #when parsed #then it becomes a diagnostic, not a guess", async () => {
	// given
	const { parseLoopJournal } = await import(scriptUrl);
	// when
	const journal = parseLoopJournal("- status: flying\n");
	// then
	assert.equal(journal.status, null);
	assert.ok(journal.diagnostics.some((diag) => diag.includes("flying")));
});

test("#given a VALIDATION checklist #when parsed #then pass counts come from column-zero checkboxes only", async () => {
	// given
	const { parseChecklist } = await import(scriptUrl);
	const text = "# V\n\n- [x] one\n- [ ] two\n  - [x] nested (ignored)\n";
	// when
	const checklist = parseChecklist(text);
	// then
	assert.equal(checklist.total, 2);
	assert.equal(checklist.passed, 1);
});

test("#given a PRD assumption ledger table #when parsed #then numbered rows come out", async () => {
	// given
	const { parseAssumptionLedger } = await import(scriptUrl);
	const text = "# PRD\n\n## 가정 원장\n\n| # | 가정 | 영향 문서 | 확인 |\n|---|---|---|---|\n| 1 | 로컬 전용 | 01 | 자명 |\n| 4 | FAIL 규약 | 04 | 미확인 |\n";
	// when
	const rows = parseAssumptionLedger(text);
	// then
	assert.deepEqual(
		rows.map((row) => [row.n, row.confirmed]),
		[
			[1, "자명"],
			[4, "미확인"],
		],
	);
});

test("#given stage derivation inputs #when loop is gate_pending with rounds #then stage C is gated and D pending", async () => {
	// given
	const { deriveStages, parseLoopJournal } = await import(scriptUrl);
	const project = {
		prdFiles: Array(5).fill({ exists: true }),
		goalFiles: Array(5).fill({ exists: true }),
		loop: parseLoopJournal(LOOP_FIXTURE),
	};
	// when
	const stages = deriveStages(project);
	// then
	assert.deepEqual(
		stages.map((stage) => [stage.id, stage.status]),
		[
			["A", "done"],
			["B", "done"],
			["C", "gated"],
			["D", "pending"],
		],
	);
});

test("#given the inspector path guard #when a path escapes the root (dotdot or symlink) #then it refuses", async () => {
	// given
	const { safeReadTail } = await import(scriptUrl);
	const outside = await mkdtemp(join(tmpdir(), "tower-out-"));
	const root = await mkdtemp(join(tmpdir(), "tower-root-"));
	try {
		await writeFile(join(outside, "secret.txt"), "secret", "utf8");
		await writeFile(join(root, "ok.txt"), "fine", "utf8");
		await symlink(join(outside, "secret.txt"), join(root, "leak.txt"));
		// when / then
		assert.equal(await safeReadTail(root, "ok.txt"), "fine");
		await assert.rejects(() => safeReadTail(root, "../" + outside.split("/").at(-1) + "/secret.txt"));
		await assert.rejects(() => safeReadTail(root, "leak.txt"), /symlink/);
		await assert.rejects(() => safeReadTail(root, join(outside, "secret.txt")), /relative/);
	} finally {
		await rm(outside, { recursive: true, force: true });
		await rm(root, { recursive: true, force: true });
	}
});

test("#given a sandbox project on disk #when collected #then the DoD gauge combines validation and blocking assumptions", async () => {
	// given
	const { collectProject } = await import(scriptUrl);
	const dir = await mkdtemp(join(tmpdir(), "tower-proj-"));
	try {
		await writeFile(join(dir, "LOOP.md"), "- status: active\n- blocking_assumptions_remaining: [4]\n\n## 회차 1 — d\n- 검증: 통과 1/2 / 실패 항목: x\n- 사다리 단계: 1\n- 판정: 계속\n");
		await writeFile(join(dir, "VALIDATION.md"), "- [x] a\n- [ ] b\n");
		// when
		const project = await collectProject(dir);
		// then
		assert.equal(project.dod.validationPassed, 1);
		assert.equal(project.dod.validationTotal, 2);
		assert.equal(project.dod.blockingRemaining, 1);
		assert.equal(project.dod.met, false);
		assert.equal(project.stages.find((stage) => stage.id === "C").status, "in-progress");
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});


test("#given the embedded dashboard page #when its inline script is extracted #then it parses as valid JS (template-escape regression)", async () => {
	// given --- backslashes inside the template literal can silently vanish (\/ becomes /)
	const vm = await import("node:vm");
	const { DASHBOARD_HTML } = await import(scriptUrl);
	const match = DASHBOARD_HTML.match(/<script>([\s\S]*?)<\/script>/);
	assert.ok(match, "dashboard must embed an inline script");
	// when / then --- a SyntaxError here means the whole dashboard renders blank
	new vm.Script(match[1]);
});
