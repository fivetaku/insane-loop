// tower.mjs - insane-loop live control tower (MES-style dashboard).
//
// READ-ONLY observer: derives everything deterministically from files insane-loop
// already writes (LOOP.md, PRD/, goaljaby artifacts). No LLM, no npm deps (node
// builtins only), no writes into watched directories, binds 127.0.0.1 only.
//
// Usage:  node tower.mjs [--root DIR] [--port N] [--open]
//   --root  watch root to scan for projects (dirs containing LOOP.md), default cwd
//   --port  default 7180
//   --open  open the dashboard in the default browser after start

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { watch } from "node:fs";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const GOAL_ARTIFACTS = ["VALIDATION.md", "RECOVERY.md", "PLAN.md", "PROGRESS.md", "goal-command.md"];
const PRD_FILES = ["PRD/01_PRD.md", "PRD/02_DATA_MODEL.md", "PRD/03_PHASES.md", "PRD/04_PROJECT_SPEC.md", "PRD/README.md"];
const SCAN_DEPTH = 3;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".omo"]);

// ---------- parsing (fence-aware, column-zero, fail-soft: ulw-map discipline) ----------

function createFenceTracker() {
	let fenceChar = null;
	let fenceLength = 0;
	return (line) => {
		const match = /^(`{3,}|~{3,})(.*)$/.exec(line);
		if (match) {
			const char = match[1][0];
			const length = match[1].length;
			if (fenceChar === null) {
				fenceChar = char;
				fenceLength = length;
			} else if (char === fenceChar && length >= fenceLength && match[2].trim() === "") {
				fenceChar = null;
				fenceLength = 0;
			}
			return true;
		}
		return fenceChar !== null;
	};
}

function lines(text) {
	return text.replaceAll("\r\n", "\n").split("\n");
}

// LOOP.md per the insane-loop SKILL.md format definition. Unknown lines are
// ignored; malformed known lines become diagnostics instead of guesses.
export function parseLoopJournal(text) {
	const journal = {
		status: null,
		reviewer: null,
		redrive: null,
		dod: null,
		blockingAssumptions: [],
		rounds: [],
		diagnostics: [],
	};
	const insideFence = createFenceTracker();
	let round = null;
	for (const line of lines(text)) {
		if (insideFence(line)) continue;
		const roundHead = /^##\s+회차\s+(\d+)\s*[—–-]?\s*(.*)$/.exec(line);
		if (roundHead) {
			round = {
				n: Number.parseInt(roundHead[1], 10),
				date: roundHead[2].trim() || null,
				verifyPassed: null,
				verifyTotal: null,
				failedItems: null,
				ladderStage: null,
				reviewerUsed: null,
				verdict: null,
				gateQuestion: null,
			};
			journal.rounds.push(round);
			continue;
		}
		if (/^#\s/.test(line)) {
			round = null;
			continue;
		}
		const field = /^-\s+([^:]+):\s*(.*)$/.exec(line);
		if (!field) continue;
		const key = field[1].trim();
		const value = field[2].trim();
		if (round === null) {
			if (key === "status") {
				if (["active", "gate_pending", "done", "stopped"].includes(value)) journal.status = value;
				else journal.diagnostics.push(`알 수 없는 status 값: ${value}`);
			} else if (key === "reviewer") journal.reviewer = value;
			else if (key === "redrive") journal.redrive = value;
			else if (key === "dod") journal.dod = value;
			else if (key === "blocking_assumptions_remaining") {
				journal.blockingAssumptions = [...value.matchAll(/\d+/g)].map((m) => Number.parseInt(m[0], 10));
			}
			continue;
		}
		if (key === "검증") {
			const nums = /(\d+)\s*\/\s*(\d+)/.exec(value);
			if (nums) {
				round.verifyPassed = Number.parseInt(nums[1], 10);
				round.verifyTotal = Number.parseInt(nums[2], 10);
			} else {
				journal.diagnostics.push(`회차 ${round.n}: 검증 x/y를 읽지 못함 (${value})`);
			}
			const failed = /실패 항목:\s*(.*)$/.exec(value);
			if (failed) round.failedItems = failed[1].trim();
		} else if (key.startsWith("사다리")) {
			const stage = /([123])/.exec(value);
			if (stage) round.ladderStage = Number.parseInt(stage[1], 10);
			const reviewer = /리뷰어:\s*(.*)$/.exec(value);
			if (reviewer) round.reviewerUsed = reviewer[1].trim();
		} else if (key === "판정") {
			round.verdict = value;
			if (value.includes("gate_pending")) {
				round.gateQuestion = value.replace(/^gate_pending[:\s]*/, "").trim() || null;
			}
		}
	}
	return journal;
}

// Column-zero checkbox checklist (VALIDATION.md and friends).
export function parseChecklist(text) {
	const items = [];
	const insideFence = createFenceTracker();
	for (const line of lines(text)) {
		if (insideFence(line)) continue;
		const box = /^- \[( |x|X)\]\s+(.+)$/.exec(line);
		if (box) items.push({ title: box[2].trim(), done: box[1] !== " " });
	}
	return { items, passed: items.filter((item) => item.done).length, total: items.length };
}

// `## 가정 원장` table rows in PRD/01_PRD.md: | # | 가정 | 영향 문서 | 확인 |
export function parseAssumptionLedger(text) {
	const rows = [];
	const insideFence = createFenceTracker();
	let inLedger = false;
	for (const line of lines(text)) {
		if (insideFence(line)) continue;
		if (/^##\s/.test(line)) {
			inLedger = /^##\s+가정 원장/.test(line);
			continue;
		}
		if (!inLedger) continue;
		const row = /^\|\s*(\d+)\s*\|(.+)\|(.+)\|(.+)\|\s*$/.exec(line);
		if (row) {
			rows.push({
				n: Number.parseInt(row[1], 10),
				assumption: row[2].trim(),
				scope: row[3].trim(),
				confirmed: row[4].trim(),
			});
		}
	}
	return rows;
}

// Deterministic doc summary: title (first h1), lead paragraph, section headings.
// No LLM - what the file says is what the panel shows.
export function extractDocSummary(text, maxLead = 240) {
	const insideFence = createFenceTracker();
	let title = null;
	const headings = [];
	const leadLines = [];
	let pastTitle = false;
	let leadDone = false;
	for (const line of lines(text)) {
		if (insideFence(line)) continue;
		const h1 = /^#\s+(.*)$/.exec(line);
		if (h1 && title === null) {
			title = h1[1].trim();
			pastTitle = true;
			continue;
		}
		const hn = /^#{2,6}\s+(.*)$/.exec(line);
		if (hn) {
			headings.push(hn[1].trim());
			leadDone = true;
			continue;
		}
		if (pastTitle && !leadDone) {
			const trimmed = line.trim();
			if (trimmed === "") {
				if (leadLines.length > 0) leadDone = true;
				continue;
			}
			if (/^[>|*-]/.test(trimmed)) continue;
			leadLines.push(trimmed);
			if (leadLines.join(" ").length >= maxLead) leadDone = true;
		}
	}
	let lead = leadLines.join(" ");
	if (lead.length > maxLead) lead = `${lead.slice(0, maxLead - 1)}…`;
	return { title, lead, headings: headings.slice(0, 12) };
}

// Stage derivation per the confirmed PRD 02 rules.
export function deriveStages(project) {
	const prdDone = project.prdFiles.filter((file) => file.exists).length;
	const goalDone = project.goalFiles.filter((file) => file.exists).length;
	const loop = project.loop;
	const rounds = loop?.rounds?.length ?? 0;
	const stageA =
		prdDone === 0 ? "pending" : prdDone < project.prdFiles.length ? "in-progress" : "done";
	const stageB =
		stageA !== "done" && goalDone === 0
			? "pending"
			: goalDone < project.goalFiles.length
				? goalDone === 0
					? "pending"
					: "in-progress"
				: rounds === 0 && loop?.status !== "done"
					? "gated"
					: "done";
	const stageC =
		rounds === 0
			? "pending"
			: loop?.status === "done"
				? "done"
				: loop?.status === "gate_pending"
					? "gated"
					: loop?.status === "stopped"
						? "failed"
						: "in-progress";
	const stageD = loop?.status === "done" ? "done" : "pending";
	return [
		{ id: "A", label: "PRD 생성", status: stageA, detail: `${prdDone}/${project.prdFiles.length} 파일` },
		{ id: "B", label: "골 세팅", status: stageB, detail: `${goalDone}/${project.goalFiles.length} 산출물` },
		{ id: "C", label: "회차 루프", status: stageC, detail: rounds > 0 ? `회차 ${rounds}` : "회차 0" },
		{ id: "D", label: "완료", status: stageD, detail: loop?.status ?? "-" },
	];
}

// ---------- collection ----------

async function fileInfo(root, rel) {
	const path = join(root, rel);
	try {
		const meta = await stat(path);
		return { rel, exists: true, mtime: meta.mtimeMs, size: meta.size };
	} catch {
		return { rel, exists: false, mtime: 0, size: 0 };
	}
}

async function readIfExists(path) {
	try {
		return await readFile(path, "utf8");
	} catch {
		return null;
	}
}

export async function collectProject(dir) {
	const loopText = await readIfExists(join(dir, "LOOP.md"));
	const project = {
		name: basename(dir),
		dir,
		loop: loopText === null ? null : parseLoopJournal(loopText),
		prdFiles: await Promise.all(PRD_FILES.map((rel) => fileInfo(dir, rel))),
		goalFiles: await Promise.all(GOAL_ARTIFACTS.map((rel) => fileInfo(dir, rel))),
		validation: null,
		assumptions: [],
	};
	const validationText = await readIfExists(join(dir, "VALIDATION.md"));
	if (validationText !== null) project.validation = parseChecklist(validationText);
	const prdText = await readIfExists(join(dir, "PRD", "01_PRD.md"));
	if (prdText !== null) project.assumptions = parseAssumptionLedger(prdText);
	project.docs = {};
	for (const rel of ["PRD/01_PRD.md", "goal-command.md", "PLAN.md"]) {
		const text = rel === "PRD/01_PRD.md" ? prdText : await readIfExists(join(dir, rel));
		if (text !== null) project.docs[rel] = extractDocSummary(text);
	}
	project.stages = deriveStages(project);
	const activity = [...project.prdFiles, ...project.goalFiles]
		.filter((file) => file.exists)
		.map((file) => file.mtime);
	const loopStat = await fileInfo(dir, "LOOP.md");
	if (loopStat.exists) activity.push(loopStat.mtime);
	project.lastActivity = activity.length > 0 ? Math.max(...activity) : null;
	const blocking = project.loop?.blockingAssumptions?.length ?? 0;
	const check = project.validation;
	project.dod = {
		validationPassed: check?.passed ?? 0,
		validationTotal: check?.total ?? 0,
		blockingRemaining: blocking,
		met: check !== null && check.total > 0 && check.passed === check.total && blocking === 0,
	};
	return project;
}

export async function discoverProjects(root, depth = SCAN_DEPTH) {
	const loops = [];
	async function scan(dir, remaining) {
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		const isLoop = entries.some((entry) => entry.isFile() && entry.name === "LOOP.md");
		if (isLoop) loops.push(dir);
		if (isLoop || remaining === 0) return;
		for (const entry of entries) {
			if (entry.isDirectory() && !SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
				await scan(join(dir, entry.name), remaining - 1);
			}
		}
	}
	await scan(root, depth);
	return loops.sort();
}

async function collectState(root) {
	const loops = await discoverProjects(root);
	const projects = [];
	for (const dir of loops) projects.push(await collectProject(dir));
	return { root, generatedAt: null, projects };
}

// ---------- server ----------

function stateHash(state) {
	return createHash("sha256").update(JSON.stringify(state)).digest("hex").slice(0, 16);
}

export async function safeReadTail(root, requestPath, maxBytes = 8192, mode = "tail") {
	if (isAbsolute(requestPath)) throw new Error("relative paths only");
	const resolved = resolve(root, requestPath);
	const rel = relative(root, resolved);
	if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("path escapes the watch root");
	const real = await realpath(resolved);
	const rootReal = await realpath(root);
	const relReal = relative(rootReal, real);
	if (relReal.startsWith("..") || isAbsolute(relReal)) throw new Error("path escapes the watch root (symlink)");
	const content = await readFile(real, "utf8");
	if (content.length <= maxBytes) return content;
	return mode === "head"
		? `${content.slice(0, maxBytes)}\n…(뒷부분 생략)`
		: `…(앞부분 생략)\n${content.slice(-maxBytes)}`;
}

function openInBrowser(url) {
	const [cmd, args] =
		process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["explorer.exe", [url]] : ["xdg-open", [url]];
	const child = spawn(cmd, args, { stdio: "ignore", detached: true });
	child.once("error", () => console.warn(`tower: 브라우저 자동 열기 실패 - 직접 여세요: ${url}`));
	child.once("spawn", () => child.unref());
}

export function parseArgs(argv) {
	const options = { root: process.cwd(), port: 7180, open: false };
	const rest = argv.slice(2);
	for (let i = 0; i < rest.length; i += 1) {
		if (rest[i] === "--root") options.root = resolve(rest[++i] ?? ".");
		else if (rest[i] === "--port") options.port = Number.parseInt(rest[++i] ?? "7180", 10);
		else if (rest[i] === "--open") options.open = true;
		else throw new Error(`unknown flag: ${rest[i]}`);
	}
	return options;
}

async function main() {
	const options = parseArgs(process.argv);
	let seq = 0;
	let lastHash = "";
	let cachedBody = "";
	const clients = new Set();

	async function refresh(force = false) {
		const state = await collectState(options.root);
		const hash = stateHash(state);
		if (!force && hash === lastHash) return;
		lastHash = hash;
		seq += 1;
		state.generatedAt = new Date().toISOString();
		state.seq = seq;
		cachedBody = JSON.stringify(state);
		for (const client of clients) {
			try {
				client.write(`data: ${cachedBody}\n\n`);
			} catch {
				clients.delete(client);
				try { client.destroy(); } catch {}
			}
		}
	}

	await refresh(true);
	let watcher = null;
	function armWatch() {
		if (watcher) return;
		try {
			watcher = watch(options.root, { recursive: true }, () => {
				refresh().catch(() => {});
			});
			watcher.on("error", () => {
				watcher = null;
			});
		} catch {
			// root may not exist yet (e.g. simulator sandbox) - polling keeps working
			// and the next poll cycle re-arms the watch.
		}
	}
	armWatch();
	if (!watcher) console.warn("tower: fs.watch 미장전 - 폴링으로 시작, 루트 생성 시 자동 재장전");
	setInterval(() => {
		armWatch();
		refresh().catch(() => {});
	}, 2000);

	const server = createServer(async (req, res) => {
		const url = new URL(req.url, "http://127.0.0.1");
		try {
			if (url.pathname === "/") {
				res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
				res.end(DASHBOARD_HTML);
			} else if (url.pathname === "/api/state") {
				res.writeHead(200, { "content-type": "application/json" });
				res.end(cachedBody);
			} else if (url.pathname === "/events") {
				res.writeHead(200, {
					"content-type": "text/event-stream",
					"cache-control": "no-cache",
					connection: "keep-alive",
				});
				res.write(`data: ${cachedBody}\n\n`);
				clients.add(res);
				req.on("close", () => clients.delete(res));
			} else if (url.pathname === "/api/file") {
				const mode = url.searchParams.get("mode") === "head" ? "head" : "tail";
				const tail = await safeReadTail(options.root, url.searchParams.get("path") ?? "", 12288, mode);
				res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
				res.end(tail);
			} else {
				res.writeHead(404);
				res.end("not found");
			}
		} catch (error) {
			res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
			res.end(`tower: ${error.message}`);
		}
	});
	server.on("error", (error) => {
		if (error && error.code === "EADDRINUSE") {
			console.error(`loop-tower: port ${options.port} already in use — another tower running? (--port <n> to change)`);
		} else {
			console.error(`loop-tower: server error — ${(error && error.message) || error}`);
		}
		process.exit(1);
	});
	server.listen(options.port, "127.0.0.1", () => {
		const url = `http://127.0.0.1:${options.port}/`;
		console.log(`loop-tower: ${url} (root=${options.root})`);
		if (options.open) openInBrowser(url);
	});
}

// ---------- embedded dashboard (pure DOM, no external requests) ----------

export const DASHBOARD_HTML = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>loop-tower</title>
<style>
  :root {
    --canvas:#f5f5f7; --card:#ffffff; --pearl:#fafafc;
    --ink:#1d1d1f; --ink-80:#333333; --ink-48:#7a7a7a;
    --hairline:#e0e0e0; --divider:#f0f0f0;
    --blue:#0066cc; --blue-focus:#0071e3;
    --green:#34c759; --orange:#ff9500; --red:#ff3b30; --gray:#8e8e93;
    --r-xs:5px; --r-sm:8px; --r-md:11px; --r-lg:18px;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--canvas); color:var(--ink);
         font-family:-apple-system,"SF Pro Text","Apple SD Gothic Neo","Segoe UI",sans-serif;
         font-size:17px; line-height:1.47; letter-spacing:-0.374px;
         -webkit-font-smoothing:antialiased; }
  header { position:sticky; top:0; z-index:5; background:rgba(255,255,255,.82);
           backdrop-filter:saturate(180%) blur(20px); border-bottom:1px solid var(--divider);
           display:flex; justify-content:space-between; align-items:baseline; padding:14px 28px; }
  header h1 { margin:0; font-family:-apple-system,"SF Pro Display","Apple SD Gothic Neo",sans-serif;
              font-size:21px; font-weight:600; letter-spacing:.231px; }
  header h1 span { color:var(--ink-48); font-weight:400; font-size:14px; letter-spacing:-0.224px; margin-left:10px; }
  header .meta { color:var(--ink-48); font-size:12px; letter-spacing:-0.12px; font-variant-numeric:tabular-nums; }
  main { max-width:1080px; margin:0 auto; padding:40px 28px 80px; }
  h2 { font-family:-apple-system,"SF Pro Display","Apple SD Gothic Neo",sans-serif;
       font-size:40px; font-weight:600; line-height:1.1; letter-spacing:-0.02em; margin:8px 0 28px; }
  .eyebrow { font-size:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-48); }

  .chip { display:inline-block; padding:3px 12px; border-radius:9999px; font-size:14px;
          font-weight:600; letter-spacing:-0.224px; }
  .c-pending { background:var(--divider); color:var(--ink-48); }
  .c-in-progress { background:rgba(0,102,204,.1); color:var(--blue); }
  .c-done { background:rgba(52,199,89,.12); color:#248a3d; }
  .c-failed { background:rgba(255,59,48,.1); color:var(--red); }
  .c-gated { background:var(--orange); color:#fff; }

  .cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:20px; }
  .card { background:var(--card); border:1px solid var(--hairline); border-radius:var(--r-lg);
          padding:22px 24px; cursor:pointer; transition:transform .25s ease, box-shadow .25s ease; }
  .card:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(0,0,0,.08); }
  .card h3 { margin:0; font-size:21px; font-weight:600; letter-spacing:-0.01em; }
  .card .sub { color:var(--ink-48); font-size:14px; letter-spacing:-0.224px; margin:2px 0 14px;
               overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .card .row { display:flex; justify-content:space-between; align-items:center; }
  .card .facts { color:var(--ink-48); font-size:12px; letter-spacing:-0.12px; margin-top:10px;
                 font-variant-numeric:tabular-nums; }

  .bar { height:4px; border-radius:9999px; background:var(--divider); overflow:hidden; margin-top:14px; }
  .bar > div { height:100%; background:var(--blue); border-radius:9999px; transition:width .6s cubic-bezier(.25,.1,.25,1); }
  .bar.met > div { background:var(--green); }

  .banner { background:var(--orange); color:#fff; border-radius:var(--r-md);
            padding:14px 20px; font-weight:600; margin:0 0 28px; animation:breathe 2.2s ease-in-out infinite; }
  .banner small { display:block; font-weight:400; font-size:14px; opacity:.92; margin-top:2px; }
  @keyframes breathe { 50% { opacity:.8; } }
  @media (prefers-reduced-motion: reduce) { .banner { animation:none; } .card { transition:none; } }

  /* signature: process rail */
  .rail { position:relative; background:var(--card); border:1px solid var(--hairline);
          border-radius:var(--r-lg); padding:34px 28px 26px; margin-bottom:20px;
          box-shadow:0 18px 44px rgba(0,0,0,.06); }
  .rail .track { position:absolute; left:70px; right:70px; top:56px; height:2px; background:var(--divider); }
  .rail .stations { position:relative; display:flex; justify-content:space-between; }
  .station { text-align:center; width:120px; }
  .station .node { width:44px; height:44px; border-radius:50%; margin:0 auto; display:flex;
                   align-items:center; justify-content:center; font-size:15px; font-weight:600;
                   background:var(--card); border:2px solid var(--hairline); color:var(--ink-48);
                   position:relative; z-index:1; transition:all .3s ease; }
  .station.s-done .node { background:var(--green); border-color:var(--green); color:#fff; }
  .station.s-in-progress .node { border-color:var(--blue); color:var(--blue); transform:scale(1.18);
                                 box-shadow:0 8px 22px rgba(0,102,204,.25); }
  .station.s-gated .node { background:var(--orange); border-color:var(--orange); color:#fff; transform:scale(1.18);
                           box-shadow:0 8px 22px rgba(255,149,0,.3); }
  .station.s-failed .node { background:var(--red); border-color:var(--red); color:#fff; }
  .station .name { font-size:14px; font-weight:600; letter-spacing:-0.224px; margin-top:12px; }
  .station .detail { font-size:12px; color:var(--ink-48); letter-spacing:-0.12px; margin-top:1px; }

  .panel { background:var(--card); border:1px solid var(--hairline); border-radius:var(--r-lg);
           padding:22px 24px; margin-bottom:20px; }
  .panel h3 { margin:0 0 14px; font-size:14px; font-weight:600; letter-spacing:.02em; color:var(--ink-48);
              text-transform:uppercase; }
  .two { display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start; }
  @media (max-width:860px) { .two { grid-template-columns:1fr; } .rail .track { left:40px; right:40px; } }

  .rounds { display:flex; gap:12px; overflow-x:auto; padding-bottom:6px; }
  .round { min-width:168px; background:var(--pearl); border:1px solid var(--divider);
           border-radius:var(--r-md); padding:12px 14px; font-size:14px; letter-spacing:-0.224px; }
  .round .top { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
  .round b { font-variant-numeric:tabular-nums; }
  .round .dim { color:var(--ink-48); font-size:12px; margin-top:4px; }

  ul.checks { list-style:none; margin:0; padding:0; font-size:14px; letter-spacing:-0.224px; }
  ul.checks li { display:flex; gap:9px; align-items:baseline; padding:5px 0; border-bottom:1px solid var(--divider); }
  ul.checks li:last-child { border-bottom:none; }
  ul.checks .tick { font-weight:600; }
  ul.checks .ok .tick { color:var(--green); }
  ul.checks .no { color:var(--ink-48); }
  ul.checks .warn .tick { color:var(--orange); }

  .doc { padding:12px 0; border-bottom:1px solid var(--divider); }
  .doc:last-child { border-bottom:none; }
  .doc .name { font-size:12px; color:var(--ink-48); letter-spacing:-0.12px; }
  .doc .title { font-weight:600; margin:2px 0; }
  .doc .lead { color:var(--ink-80); font-size:14px; letter-spacing:-0.224px;
               display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .filebtns { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
  button.filebtn { font:inherit; font-size:14px; letter-spacing:-0.224px; color:var(--blue);
                   background:none; border:1px solid var(--hairline); border-radius:9999px;
                   padding:5px 14px; cursor:pointer; }
  button.filebtn:hover { border-color:var(--blue); }
  button.filebtn:focus-visible { outline:2px solid var(--blue-focus); outline-offset:2px; }
  pre.inspect { background:var(--pearl); border:1px solid var(--divider); border-radius:var(--r-md);
                padding:16px; font-size:12px; line-height:1.5; overflow:auto; max-height:320px;
                white-space:pre-wrap; margin:14px 0 0; }
  a.back { color:var(--blue); font-size:14px; text-decoration:none; letter-spacing:-0.224px; }
  a.back:hover { text-decoration:underline; }
  .empty { color:var(--ink-48); text-align:center; padding:96px 0; font-size:21px; font-weight:300; }
  .empty code { font-size:14px; background:var(--card); border:1px solid var(--hairline);
                border-radius:var(--r-xs); padding:2px 8px; }
  .diag { color:var(--orange); font-size:12px; margin-top:8px; }
  .section-label { margin:36px 0 14px; }
</style>
</head>
<body>
<header>
  <h1>loop-tower<span>insane-loop 관제탑</span></h1>
  <div class="meta" id="meta">연결 중</div>
</header>
<main id="app"><div class="empty">상태 수신 대기</div></main>
<script>
var STATUS_KO = { pending:"대기", "in-progress":"진행중", done:"완료", failed:"중단", gated:"게이트" };
var LOOP_KO = { active:"주행중", gate_pending:"게이트 대기", done:"완료", stopped:"중단" };
var LOOP_CLS = { active:"in-progress", gate_pending:"gated", done:"done", stopped:"failed" };
var state = null;
function esc(s) { return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
function h(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content; }
function chip(status, label) { return '<span class="chip c-'+status+'">'+esc(label || STATUS_KO[status] || status)+'</span>'; }
function fmtTime(ms) { return ms ? new Date(ms).toLocaleTimeString("ko-KR") : "-"; }
function projTitle(p) { var d = p.docs && p.docs["PRD/01_PRD.md"]; return d && d.title ? d.title : p.name; }
function relBase(p) { var base = p.dir.indexOf(state.root) === 0 ? p.dir.slice(state.root.length) : ""; return base.replace(/^[/]/, ""); }

function render() {
  if (!state) return;
  document.getElementById("meta").textContent =
    state.root + " · #" + state.seq + " · " + new Date(state.generatedAt).toLocaleTimeString("ko-KR");
  var sel = location.hash.indexOf("#/p/") === 0 ? decodeURIComponent(location.hash.slice(4)) : null;
  var project = null;
  if (sel) state.projects.forEach(function(p){ if (p.name === sel) project = p; });
  var anyGate = state.projects.some(function(p){ return p.loop && p.loop.status === "gate_pending"; });
  document.title = (anyGate ? "● " : "") + "loop-tower";
  var app = document.getElementById("app");
  app.replaceChildren(project ? renderBoard(project) : renderHome());
}

function projCls(p) {
  return p.loop ? LOOP_CLS[p.loop.status] || "pending" : "pending";
}
function renderHome() {
  if (state.projects.length === 0) {
    return h('<div class="empty">감시 중인 루프가 없습니다.<br><br><code>node simulate-loop.mjs</code> 로 데모를 재생해 보세요.</div>');
  }
  var order = { gated:0, "in-progress":1, failed:2, pending:3, done:4 };
  var sorted = state.projects.slice().sort(function(a,b){
    var oa = order[projCls(a)], ob = order[projCls(b)];
    return oa !== ob ? oa - ob : (b.lastActivity||0) - (a.lastActivity||0);
  });
  var cards = sorted.map(function(p){
    var cls = projCls(p);
    var v = p.dod;
    var pct = v.validationTotal ? Math.round(100*v.validationPassed/v.validationTotal) : 0;
    return '<div class="card" data-name="'+esc(p.name)+'" tabindex="0" role="link">'
      + '<div class="row"><h3>'+esc(p.name)+'</h3>'+chip(cls, p.loop ? LOOP_KO[p.loop.status] : "?")+'</div>'
      + '<div class="sub">'+esc(projTitle(p))+'</div>'
      + '<div class="bar'+(v.met?' met':'')+'"><div style="width:'+pct+'%"></div></div>'
      + '<div class="facts">검증 '+v.validationPassed+'/'+v.validationTotal
      + ' · blocking '+v.blockingRemaining+' · 회차 '+(p.loop?p.loop.rounds.length:0)
      + ' · '+fmtTime(p.lastActivity)+'</div></div>';
  }).join("");
  var node = h('<div><div class="eyebrow section-label">라인 현황 · '+state.projects.length+'</div><div class="cards">'+cards+'</div></div>');
  node.querySelectorAll(".card").forEach(function(card){
    var go = function(){ location.hash = "#/p/" + encodeURIComponent(card.dataset.name); };
    card.addEventListener("click", go);
    card.addEventListener("keydown", function(e){ if (e.key === "Enter") go(); });
  });
  return node;
}

function renderBoard(p) {
  var gate = p.loop && p.loop.status === "gate_pending";
  var lastGate = null;
  if (gate) p.loop.rounds.forEach(function(r){ if (r.gateQuestion) lastGate = r; });
  var stations = p.stages.map(function(s){
    var mark = s.status === "done" ? "✓" : s.id;
    return '<div class="station s-'+s.status+'"><div class="node">'+mark+'</div>'
      + '<div class="name">'+esc(s.label)+'</div><div class="detail">'+esc(s.detail)+'</div></div>';
  }).join("");
  var rounds = (p.loop ? p.loop.rounds : []).map(function(r){
    var cls = r.verdict === "done" ? "done" : r.gateQuestion ? "gated" : (r.ladderStage >= 2 ? "failed" : "in-progress");
    var label = r.verdict === "done" ? "완료" : r.gateQuestion ? "게이트" : "사다리 "+(r.ladderStage == null ? "?" : r.ladderStage)+"단";
    return '<div class="round"><div class="top"><b>회차 '+r.n+'</b>'+chip(cls, label)+'</div>'
      + '검증 <b>'+(r.verifyPassed == null ? "?" : r.verifyPassed)+'/'+(r.verifyTotal == null ? "?" : r.verifyTotal)+'</b>'
      + (r.failedItems && r.failedItems !== "없음" ? '<div class="dim">실패: '+esc(r.failedItems)+'</div>' : '')
      + '<div class="dim">'+esc(r.verdict || "")+'</div></div>';
  }).join("") || '<div class="doc .lead" style="color:var(--ink-48)">아직 회차가 없습니다</div>';
  var checks = p.validation ? p.validation.items.map(function(i){
    return '<li class="'+(i.done?"ok":"no")+'"><span class="tick">'+(i.done?"✓":"○")+'</span><span>'+esc(i.title)+'</span></li>';
  }).join("") : '<li class="no"><span class="tick">○</span><span>VALIDATION.md 없음</span></li>';
  var assume = p.assumptions.map(function(a){
    var blocking = p.loop && p.loop.blockingAssumptions.indexOf(a.n) !== -1;
    return '<li class="'+(blocking?"warn":"ok")+'"><span class="tick">'+(blocking?"!":"·")+'</span>'
      + '<span>#'+a.n+' '+esc(a.assumption)+(blocking?' <b>(blocking)</b>':'')+'</span></li>';
  }).join("") || '<li class="no"><span class="tick">·</span><span>가정 원장 없음</span></li>';
  var docsHtml = ["PRD/01_PRD.md","goal-command.md","PLAN.md"].map(function(rel){
    var d = p.docs && p.docs[rel];
    if (!d) return "";
    return '<div class="doc"><div class="name">'+esc(rel)+'</div>'
      + (d.title ? '<div class="title">'+esc(d.title)+'</div>' : '')
      + (d.lead ? '<div class="lead">'+esc(d.lead)+'</div>' : '')
      + '</div>';
  }).join("") || '<div class="doc"><div class="lead">아직 생성된 문서가 없습니다</div></div>';
  var fileList = [];
  p.prdFiles.forEach(function(f){ if (f.exists) fileList.push([f.rel, "head"]); });
  p.goalFiles.forEach(function(f){ if (f.exists) fileList.push([f.rel, f.rel === "PROGRESS.md" ? "tail" : "head"]); });
  fileList.push(["LOOP.md", "tail"]);
  var btns = fileList.map(function(f){
    return '<button class="filebtn" data-file="'+esc(f[0])+'" data-mode="'+f[1]+'">'+esc(f[0])+'</button>';
  }).join("");
  var diags = (p.loop && p.loop.diagnostics || []).map(function(d){ return '<div class="diag">진단: '+esc(d)+'</div>'; }).join("");
  var v = p.dod;
  var pct = v.validationTotal ? Math.round(100*v.validationPassed/v.validationTotal) : 0;

  var node = h('<div>'
    + '<a class="back" href="#/">← 라인 현황</a>'
    + '<h2>'+esc(projTitle(p))+(v.met ? ' <span class="chip c-done" style="vertical-align:middle">DoD 충족</span>' : '')+'</h2>'
    + (gate ? '<div class="banner">사용자 게이트 대기 중'
        + (lastGate && lastGate.gateQuestion ? '<small>'+esc(lastGate.gateQuestion)+'</small>' : '')
        + '<small>터미널에서 루프를 재개하세요</small></div>' : '')
    + '<div class="rail"><div class="track"></div><div class="stations">'+stations+'</div></div>'
    + '<div class="panel"><h3>회차 타임라인</h3><div class="rounds">'+rounds+'</div>'+diags+'</div>'
    + '<div class="two">'
    + '<div class="panel"><h3>DoD · 검증 '+v.validationPassed+'/'+v.validationTotal+' · blocking '+v.blockingRemaining+'</h3>'
    + '<div class="bar'+(v.met?' met':'')+'" style="margin:0 0 16px"><div style="width:'+pct+'%"></div></div>'
    + '<ul class="checks">'+checks+'</ul>'
    + '<h3 style="margin-top:22px">가정 원장</h3><ul class="checks">'+assume+'</ul></div>'
    + '<div class="panel"><h3>문서</h3>'+docsHtml
    + '<div class="filebtns">'+btns+'</div><pre class="inspect" id="inspect">파일을 선택하면 여기에 표시됩니다</pre></div>'
    + '</div></div>');

  var base = relBase(p);
  node.querySelectorAll("button.filebtn").forEach(function(b){
    b.addEventListener("click", function(){
      var path = (base ? base + "/" : "") + b.dataset.file;
      fetch("/api/file?path=" + encodeURIComponent(path) + "&mode=" + b.dataset.mode)
        .then(function(r){ return r.text(); })
        .then(function(t){ document.getElementById("inspect").textContent = t; });
    });
  });
  return node;
}


window.addEventListener("hashchange", render);
var es = new EventSource("/events");
es.onmessage = function(e) { state = JSON.parse(e.data); render(); };
es.onerror = function() { document.getElementById("meta").textContent = "연결 끊김 · 재연결 중"; };
</script>
</body>
</html>
`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(`tower: ${error.message}`);
		process.exitCode = 1;
	});
}
