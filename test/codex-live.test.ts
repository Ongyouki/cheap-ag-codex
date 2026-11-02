import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { expect, test } from "vitest";
import { CODEX_POLICY } from "../src/clients.js";
import { readConsent } from "../src/consent.js";
import { runCli } from "../src/platform.js";
import { snapshot, serverEntry } from "./harness.js";
import { codexMcpConfig, isolatedEnv } from "./codex-demo-env.js";

/** Preparation is offline. Live execution is a separate, explicit opt-in; neither mode grants consent. */
const prepare = process.env.CHEAPAG_CODEX_PREPARE === "1";
const live = process.env.CHEAPAG_CODEX_LIVE === "1";
const requestedDir = process.env.CHEAPAG_CODEX_DEMO_DIR;
const CHECK = `node --test test/value.test.mjs && node --input-type=module -e "import {value} from './value.mjs'; if(value !== 2) process.exit(1)"`;
const NEGATIVE_CHECK = `${CHECK} && node -e "process.exit(1)"`;
type Manifest = { format: "cheapag-codex-demo/1"; root: string; model: string; entry: string; node: string; heads: Record<string, string> };

function requestedRoot() {
  if (!requestedDir || !isAbsolute(requestedDir)) throw new Error("set CHEAPAG_CODEX_DEMO_DIR to an absolute disposable directory outside the cheap-ag checkout");
  const requested = resolve(requestedDir);
  const root = existsSync(requested) ? realpathSync(requested) : join(realpathSync(dirname(requested)), basename(requested));
  const source = realpathSync(resolve(import.meta.dirname, ".."));
  const inside = (a: string, b: string) => { const rel = relative(a, b); return !rel || (!rel.startsWith("..") && !isAbsolute(rel)); };
  if (inside(source, root) || inside(root, source)) throw new Error("the demonstration must be outside the cheap-ag checkout");
  return root;
}

function git(repo: string, ...args: string[]) {
  return execFileSync("git", ["-c", "user.name=cheapag-demo", "-c", "user.email=demo@cheapag.invalid", "-c", "commit.gpgsign=false", ...args], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

test.skipIf(!prepare)("prepare two disposable repositories and isolated profiles without credentials or consent", () => {
  if (live) throw new Error("prepare and live execution must be separate invocations");
  const requested = requestedRoot();
  const model = process.env.CHEAPAG_CODEX_MODEL;
  if (!model || !/^(openrouter|opencode-go|deepseek|commandcode)\/.+/.test(model)) throw new Error("set CHEAPAG_CODEX_MODEL to the explicitly chosen provider/model");
  mkdirSync(requested); // fresh destination only; never overwrite existing evidence or profiles
  const root = realpathSync(requested);
  const heads: Record<string, string> = {};
  mkdirSync(join(root, "codex-home"));
  mkdirSync(join(root, "process-home"));
  for (const dir of ["data", "config", "cache", "state"]) mkdirSync(join(root, "worker-home", dir), { recursive: true });
  mkdirSync(join(root, "evidence"));
  for (const name of ["success", "failure"]) {
    const repo = join(root, `${name} repo`);
    mkdirSync(join(repo, "test"), { recursive: true });
    mkdirSync(join(repo, "sub directory"));
    writeFileSync(join(repo, ".gitattributes"), "* text=auto eol=lf\n");
    writeFileSync(join(repo, ".gitignore"), ".cheapag/\n");
    writeFileSync(join(repo, "value.mjs"), "export const value = 0;\n");
    writeFileSync(join(repo, "test", "value.test.mjs"), "import {test} from 'node:test';\nimport assert from 'node:assert/strict';\nimport {value} from '../value.mjs';\ntest('value', () => assert.equal(value, 0));\n");
    writeFileSync(join(repo, "README.md"), "# Disposable Codex demonstration\n");
    writeFileSync(join(repo, "cheapag.json"), JSON.stringify({
      models: { implement: model, medium: model, hard: model, research: model, escalation: model, fallback: [] },
      limits: { max_minutes: 3, max_cost_usd: 0.10, max_parallel: 1 },
    }, null, 2) + "\n");
    git(repo, "init", "-q", "-b", "main");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "disposable fixture baseline");
    heads[name] = git(repo, "rev-parse", "HEAD").trim();
    writeFileSync(join(repo, "staged.txt"), "staged bytes\n");
    git(repo, "add", "staged.txt");
    writeFileSync(join(repo, "staged.txt"), "unstaged bytes after staging\n");
    writeFileSync(join(repo, "README.md"), "# Disposable Codex demonstration\nunrelated user edit\n");
    writeFileSync(join(repo, "notes.bin"), Buffer.from([0, 1, 255, 10]));
  }
  const manifest: Manifest = { format: "cheapag-codex-demo/1", root, model, heads, node: process.execPath, entry: realpathSync(serverEntry) };
  writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  expect(existsSync(join(root, "success repo", ".cheapag", "consent.json"))).toBe(false);
  expect(existsSync(join(root, "failure repo", ".cheapag", "consent.json"))).toBe(false);
  console.log(`Prepared ${root}. Developer sign-in, worker credentials, and terminal consent are still required. No model calls made.`);
});

test.skipIf(!live).each(["success", "failure"])("real Codex → cheap worker: %s evidence", (name) => {
  if (prepare) throw new Error("prepare and live execution must be separate invocations");
  const root = realpathSync(requestedRoot());
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as Manifest;
  expect(manifest.format).toBe("cheapag-codex-demo/1");
  expect(manifest.root).toBe(root);
  expect(manifest.entry).toBe(realpathSync(serverEntry));
  const repo = realpathSync(join(root, `${name} repo`));
  expect(dirname(repo)).toBe(root);
  expect(git(repo, "rev-parse", "HEAD").trim()).toBe(manifest.heads[name]);
  const consent = readConsent(repo);
  if (consent?.mode !== "models" || consent.models?.length !== 1 || consent.models[0] !== manifest.model || consent.provider !== manifest.model.split("/")[0]) {
    throw new Error(`developer must run the local CLI allow --models ${manifest.model} in ${repo}; this runner never grants consent`);
  }
  const config = JSON.parse(readFileSync(join(repo, "cheapag.json"), "utf8"));
  expect(config).toEqual({
    models: { implement: manifest.model, medium: manifest.model, hard: manifest.model, research: manifest.model, escalation: manifest.model, fallback: [] },
    limits: { max_minutes: 3, max_cost_usd: 0.10, max_parallel: 1 },
  }); // reject changed routes/caps before any model call, rather than only diagnosing them afterward
  if (existsSync(join(repo, ".cheapag", "jobs"))) throw new Error("use a freshly prepared fixture; never retry a possibly completed delegation");
  const evidence = join(root, "evidence", name);
  mkdirSync(evidence); // retain each attempt; no silent reuse
  const before = snapshot(repo);
  writeFileSync(join(evidence, "before.json"), JSON.stringify(before, null, 2));
  const env = isolatedEnv(root);
  const version = runCli("codex", ["--version"], { env, encoding: "utf8" });
  if (!version || version.status !== 0) throw new Error("Codex CLI must be installed and available on PATH");
  writeFileSync(join(evidence, "codex-version.txt"), version.stdout);
  const command = name === "success" ? CHECK : NEGATIVE_CHECK;
  const prompt = `Use only cheapag's MCP tools to implement this task; do not edit files, run shell writes, or use native agents yourself. Call delegate exactly once with ${JSON.stringify({ task: "Change value.mjs to export value = 2 and update test/value.test.mjs to assert 2. Touch only these two files.", files: "value.mjs,test/value.test.mjs", done_when: `\`${command}\` must pass` })}. The developer already granted this repository's consent. Never run allow, modify acceptance commands, invoke land apply, switch models, or retry a delegation after a timeout. Inspect the existing job instead. On success review the diff and verification evidence. On failure report the evidence and retained worktree. End with a concise result and risks.`;
  const mcp = codexMcpConfig(root, { node: manifest.node, entry: manifest.entry, cwd: join(repo, "sub directory") });
  const result = runCli("codex", ["exec", "--json", "--sandbox", "read-only", "--cd", join(repo, "sub directory"), "-c", mcp, prompt], {
    cwd: repo, env, encoding: "utf8", timeout: 330_000, maxBuffer: 16 * 1024 * 1024,
  });
  if (!result) throw new Error("Codex CLI disappeared from PATH");
  writeFileSync(join(evidence, "codex-events.jsonl"), result.stdout ?? "");
  writeFileSync(join(evidence, "codex-stderr.txt"), result.stderr ?? "");
  const after = snapshot(repo);
  writeFileSync(join(evidence, "after.json"), JSON.stringify(after, null, 2));
  expect(result.status, `CLI failed; inspect ${evidence}, then inspect existing jobs before any new run`).toBe(0);
  const calls = new Map<string, { server: string; tool: string }>();
  for (const line of result.stdout.trim().split("\n")) {
    const event = JSON.parse(line);
    if (event.item?.type === "mcp_tool_call") calls.set(event.item.id, event.item);
  }
  expect([...calls.values()].filter((call) => call.server === "cheapag" && call.tool === "delegate")).toHaveLength(1);
  expect([...calls.values()].some((call) => call.tool === "land")).toBe(false);
  const jobDir = join(repo, ".cheapag", "jobs");
  const jobs = readdirSync(jobDir).filter((id) => /^j[0-9a-z]{4}$/.test(id));
  expect(jobs).toHaveLength(1);
  const record = JSON.parse(readFileSync(join(jobDir, jobs[0], "result.json"), "utf8"));
  for (const file of ["request.json", "result.json", "verify.log", "events.jsonl", "diff.patch"]) {
    const source = join(jobDir, jobs[0], file);
    if (existsSync(source)) copyFileSync(source, join(evidence, `worker-${file}`));
  }
  expect(record).toMatchObject({ policy: CODEX_POLICY, models: { requested: manifest.model, final: manifest.model, escalated: false, fallbacks: [] } });
  expect(record.sessionID).toBeTruthy();
  expect(record.verify.length).toBeGreaterThan(0);
  expect(readFileSync(join(jobDir, jobs[0], "verify.log"), "utf8")).toContain(command.split(" && ")[0]);
  expect(git(repo, "rev-parse", "HEAD").trim()).toBe(manifest.heads[name]);
  expect(after.index).toBe(before.index);
  if (name === "success") {
    expect(record).toMatchObject({ status: "OK", tests: "pass", landed: true });
    expect(record.verify.at(-1)).toMatchObject({ cmd: command, ok: true, code: 0 });
    expect(readFileSync(join(repo, "value.mjs"), "utf8")).toMatch(/value\s*=\s*2\b/);
    expect(after.files["test/value.test.mjs"]).not.toBe(before.files["test/value.test.mjs"]);
    for (const file of ["value.mjs", "test/value.test.mjs"]) { delete before.files[file]; delete after.files[file]; }
    expect(after.files).toEqual(before.files);
  } else {
    expect(record).toMatchObject({ status: "FAIL", tests: "fail", landed: false, selfFix: 2 });
    expect(record.check).toBeUndefined(); // an environment/cap interruption is an incomplete demonstration
    expect(record.verify).toHaveLength(3);
    for (const run of record.verify) expect(run).toMatchObject({ cmd: NEGATIVE_CHECK, ok: false, code: 1 });
    expect(snapshot(repo)).toEqual(before);
    expect(existsSync(join(repo, record.worktree))).toBe(true);
  }
  console.log(`Recorded ${name} evidence in ${evidence}; worker job evidence remains in ${join(jobDir, jobs[0])}`);
}, 360_000);

