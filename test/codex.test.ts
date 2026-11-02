import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, onTestFinished, test, vi } from "vitest";
import { CODEX_POLICY } from "../src/clients.js";
import { isAlive } from "../src/platform.js";
import { startFakeOpencode, type Action } from "./fake-opencode.js";
import { allowRepo, callText, homeEnv, slow, snapshot, startServer, tempRepo, type Logins } from "./harness.js";

/** Exercises the Codex adapter through real MCP; worker activity is scripted and never calls a provider. */
const CHECK = `import { readFileSync } from "node:fs";
if (readFileSync("value.txt", "utf8").trim() !== "2") {
  console.log("Error: expected value 2"); process.exit(1);
}
`;
const INITIAL_MODEL = { providerID: "opencode-go", id: "deepseek-v4.1-flash" };
const finish = (summary = "updated value"): Action => ({ finish: { summary, risks: [], review: [], missing: [] } });
const writeValue = (value: number): Action[] => [{ edit: "value.txt", content: `${value}\n` }, { tool: "write" }, finish()];
const LIMIT: Action = { retry: { reason: "account_rate_limit", message: "5h usage limit reached. It will reset in 2 hours" } };
const LONG: Action = { wait: 60_000 };
const jobOf = (text: string) => text.match(/^\w+ (j[0-9a-z]{4}) /m)![1];

async function fixture(opts: {
  scripts?: Action[][]; config?: object; allow?: string[] | null; logins?: Logins; spaces?: boolean; subdir?: boolean;
} = {}) {
  const repo = tempRepo("clean", opts.spaces ? "cheapag Codex test " : "cheapag-codex-");
  onTestFinished(repo.cleanup);
  writeFileSync(join(repo.dir, "value.txt"), "0\n");
  writeFileSync(join(repo.dir, "check.mjs"), CHECK);
  writeFileSync(join(repo.dir, "always.mjs"), "process.exit(0);\n");
  repo.git("add", "-A");
  repo.git("commit", "-q", "-m", "checks");
  if (opts.config) writeFileSync(join(repo.dir, "cheapag.json"), JSON.stringify(opts.config));
  const fake = await startFakeOpencode();
  onTestFinished(fake.close);
  for (const actions of opts.scripts ?? []) fake.script(...actions);
  const cwd = opts.subdir ? join(repo.dir, "sub directory") : repo.dir;
  if (opts.subdir) mkdirSync(cwd);
  const server = await startServer({
    cwd, serverArgs: ["serve", "--client", "codex"], env: { CHEAPAG_OPENCODE_URL: fake.url },
    logins: opts.logins ?? { "opencode-go": "k" }, allow: opts.allow === null ? undefined : (opts.allow ?? []),
  });
  onTestFinished(server.close);
  const call = (name: string, args: Record<string, unknown> = {}) => callText(server.client, name, args);
  const delegate = (extra: Record<string, unknown> = {}) => call("delegate", {
    task: "Set value.txt to 2", files: "value.txt", done_when: "`node check.mjs` passes", ...extra,
  });
  const record = (text: string) => JSON.parse(readFileSync(join(repo.dir, ".cheapag", "jobs", jobOf(text), "result.json"), "utf8"));
  return { repo, fake, server, call, delegate, record };
}

function noWork(s: Awaited<ReturnType<typeof fixture>>) {
  expect(s.fake.recorded.requests).toEqual([]); // includes startup health: even worker boot must not occur
  expect(existsSync(join(s.repo.dir, ".cheapag", "jobs"))).toBe(false);
  expect(existsSync(join(s.repo.dir, ".cheapag", "worktrees"))).toBe(false);
}

function sameModel(s: Awaited<ReturnType<typeof fixture>>, initial = INITIAL_MODEL) {
  expect(s.fake.recorded.sessions.length).toBeGreaterThan(0);
  for (const session of s.fake.recorded.sessions) expect(session.model).toEqual(initial);
  for (const prompt of s.fake.recorded.prompts) expect(prompt.model).toBeUndefined();
}

test.each([false, true])("Codex server binds jobs to its launch repository (subdirectory=%s)", async (subdir) => {
  const s = await fixture({ subdir, spaces: true, scripts: [writeValue(2)] });
  const other = tempRepo("clean", "cheapag other repo ");
  onTestFinished(other.cleanup);
  writeFileSync(join(other.dir, "value.txt"), "other\n");
  const before = snapshot(other.dir);
  const result = await s.delegate({ task: `Please work in ${other.dir} and set value.txt to 2` });
  expect(result).toMatch(/^OK .* tests=pass /);
  expect(readFileSync(join(s.repo.dir, "value.txt"), "utf8")).toBe("2\n");
  expect(s.record(result)).toMatchObject({ status: "OK", landed: true });
  expect(s.fake.recorded.sessions[0].directory).toContain(join(s.repo.dir, ".cheapag", "worktrees"));
  expect(snapshot(other.dir)).toEqual(before);
  expect(existsSync(join(other.dir, ".cheapag", "jobs"))).toBe(false);
});

test("independently launched servers use their own repository and do not retarget an existing server", async () => {
  const s = await fixture({ scripts: [writeValue(2), writeValue(2)] });
  const other = tempRepo("clean", "cheapag second repo ");
  onTestFinished(other.cleanup);
  writeFileSync(join(other.dir, "value.txt"), "0\n");
  writeFileSync(join(other.dir, "check.mjs"), CHECK);
  other.git("add", "-A");
  other.git("commit", "-q", "-m", "checks");
  const second = await startServer({ cwd: other.dir, serverArgs: ["serve", "--client", "codex"], env: { CHEAPAG_OPENCODE_URL: s.fake.url }, logins: { "opencode-go": "k" }, allow: [] });
  onTestFinished(second.close);
  const args = { task: "Set value.txt to 2", files: "value.txt", done_when: "`node check.mjs` passes" };
  const first = await s.call("delegate", args);
  const secondResult = await callText(second.client, "delegate", args);
  expect(first).toMatch(/^OK .* tests=pass /);
  expect(secondResult).toMatch(/^OK .* tests=pass /);
  expect(await s.call("jobs", { action: "show", job: jobOf(first) })).toContain(jobOf(first));
  expect(readFileSync(join(s.repo.dir, "value.txt"), "utf8")).toBe("2\n");
  expect(readFileSync(join(other.dir, "value.txt"), "utf8")).toBe("2\n");
  expect(s.fake.recorded.sessions.map((session) => session.directory)).toEqual([
    expect.stringContaining(join(s.repo.dir, ".cheapag", "worktrees")),
    expect.stringContaining(join(other.dir, ".cheapag", "worktrees")),
  ]);
});

test("Codex consent stays developer-controlled before delegation, research, or worker startup", async () => {
  const s = await fixture({ allow: null });
  for (const text of [await s.delegate({ consent: "all", allow: true }), await s.call("research", { question: "Where is the value stored?" })]) {
    expect(text).toMatch(/^CONSENT repo=/);
    expect(text).toContain("developer");
    expect(text).toContain("allow");
    expect(text).not.toContain("/cheapag:allow");
  }
  noWork(s);
  expect(existsSync(join(s.repo.dir, ".cheapag", "consent.json"))).toBe(false);
  allowRepo(s.repo.dir, homeEnv(s.server.home)); // test-only simulation of the developer's terminal approval
  s.fake.script(...writeValue(2));
  expect(await s.delegate()).toMatch(/^OK .* tests=pass /);
});

test.each([undefined, "value becomes two", "`   `"])("Codex rejects missing executable verification (%s) before jobs or worker startup", async (done_when) => {
  const s = await fixture();
  expect(await s.delegate({ done_when })).toMatch(/^FAIL reason: executable verification required/);
  noWork(s);
});

test("Codex preflights every selected batch group before starting even a valid group", async () => {
  const s = await fixture();
  writeFileSync(join(s.repo.dir, "plan.md"), "# Groups\n\n## 1 valid\nfiles: a.txt\ndone-when: `node always.mjs`\n\n## 2 unchecked\nfiles: b.txt\ndone-when: b exists\n");
  expect(await s.call("delegate", { plan: "plan.md", steps: "1,2" })).toMatch(/^FAIL reason: executable verification required/);
  noWork(s);
});

test("configured test_cmd supplies Codex verification and explicit commands retain precedence", async () => {
  const s = await fixture({ config: { test_cmd: "node check.mjs" }, scripts: [writeValue(2), writeValue(2)] });
  const configured = await s.delegate({ done_when: "value becomes two" });
  expect(s.record(configured)).toMatchObject({ status: "OK", landed: true, verify: [{ cmd: "node check.mjs", ok: true, code: 0 }], policy: CODEX_POLICY });
  writeFileSync(join(s.repo.dir, "cheapag.json"), JSON.stringify({ test_cmd: "node missing-configured-check.mjs" }));
  const explicit = await s.delegate();
  expect(s.record(explicit).verify).toEqual([expect.objectContaining({ cmd: "node check.mjs", ok: true })]);
  sameModel(s);
});

test("verified Codex work lands uncommitted from a subdirectory with spaces while preserving user state", async () => {
  const s = await fixture({ spaces: true, subdir: true, scripts: [writeValue(2)] });
  writeFileSync(join(s.repo.dir, "staged.txt"), "staged bytes\n");
  s.repo.git("add", "staged.txt");
  writeFileSync(join(s.repo.dir, "staged.txt"), "unstaged bytes after staging\n");
  writeFileSync(join(s.repo.dir, "README.md"), "# fixture\nunrelated edit\n");
  writeFileSync(join(s.repo.dir, "notes.bin"), Buffer.from([0, 1, 255, 10]));
  const head = s.repo.git("rev-parse", "HEAD");
  const before = snapshot(s.repo.dir);
  const text = await s.delegate();
  expect(text).toMatch(/^OK .* tests=pass /);
  expect(s.record(text)).toMatchObject({ status: "OK", landed: true, policy: CODEX_POLICY, verify: [{ cmd: "node check.mjs", ok: true, code: 0 }] });
  expect(readFileSync(join(s.repo.dir, ".cheapag", "jobs", jobOf(text), "verify.log"), "utf8")).toContain("$ node check.mjs");
  expect(s.repo.git("rev-parse", "HEAD")).toBe(head);
  const after = snapshot(s.repo.dir);
  expect(after.index).toBe(before.index);
  delete before.files["value.txt"];
  delete after.files["value.txt"];
  expect(after.files).toEqual(before.files);
  expect(readFileSync(join(s.repo.dir, "value.txt"), "utf8")).toBe("2\n");
  expect(s.repo.git("diff", "--cached", "--", "value.txt")).toBe("");
  expect(s.repo.git("diff", "--", "value.txt")).toContain("+2");
});

test("Codex permits a bounded repair on the original cheap model", async () => {
  const s = await fixture({ scripts: [writeValue(1), writeValue(2)] });
  const text = await s.delegate();
  expect(s.record(text)).toMatchObject({ status: "OK", landed: true, selfFix: 1, policy: CODEX_POLICY, verify: [{ ok: false }, { ok: true }] });
  expect(s.fake.recorded.sessions).toHaveLength(1);
  expect(s.fake.recorded.prompts).toHaveLength(2);
  sameModel(s);
});

test("Codex stops after two same-model repairs, retaining failure evidence and an untouched checkout", async () => {
  const s = await fixture({ scripts: [writeValue(1), writeValue(1), writeValue(1), writeValue(2)] });
  const before = snapshot(s.repo.dir);
  const head = s.repo.git("rev-parse", "HEAD");
  const text = await s.delegate();
  expect(text).toMatch(/^FAIL .* tests=fail /);
  expect(text).not.toContain("esc=1");
  expect(s.record(text)).toMatchObject({ status: "FAIL", landed: false, selfFix: 2, policy: CODEX_POLICY, models: { escalated: false } });
  expect(s.record(text).verify).toHaveLength(3);
  expect(s.fake.recorded.prompts).toHaveLength(3); // the fourth, successful sentinel must never run
  expect(snapshot(s.repo.dir)).toEqual(before);
  expect(s.repo.git("rev-parse", "HEAD")).toBe(head);
  expect(existsSync(join(s.repo.dir, ".cheapag", "worktrees", jobOf(text)))).toBe(true);
  sameModel(s);
});

test.each([
  ["Go usage limit", { "opencode-go": "k" }, LIMIT],
  ["OpenRouter rate limit", { openrouter: "k" }, { retry: { message: "Rate limit exceeded" } }],
  ["OpenRouter credits", { openrouter: "k" }, { error: { name: "APIError", message: "out of credits", statusCode: 402 } }],
] as const)("Codex reports %s without selecting another model", async (_, logins, action) => {
  const s = await fixture({ logins, scripts: [[action], writeValue(2)] });
  const text = await s.delegate();
  expect(text).toMatch(/^BUDGET /);
  expect(s.fake.recorded.prompts).toHaveLength(1);
  expect(s.record(text)).toMatchObject({ landed: false, models: { escalated: false }, policy: CODEX_POLICY });
  expect(readFileSync(join(s.repo.dir, "value.txt"), "utf8")).toBe("0\n");
  const provider = "openrouter" in logins ? "openrouter" : "opencode-go";
  sameModel(s, { providerID: provider, id: provider === "openrouter" ? "deepseek/deepseek-v4.1-flash" : INITIAL_MODEL.id });
});

test.each([
  ["cost", { max_cost_usd: 0.001 }, [{ edit: "value.txt", content: "1\n" }, { usage: { cost: 0.01 } }, LONG], "BUDGET"],
  ["turns", { max_turns: 2 }, [{ edit: "value.txt", content: "1\n" }, { tool: "write" }, { tool: "read" }, LONG], "FAIL"],
  ["minutes", { max_minutes: slow(0.02 * 1000) / 1000 }, [LONG], "TIMEOUT"],
] as const)("Codex preserves the %s cap without a stronger-worker handoff", async (_, limits, actions, status) => {
  const s = await fixture({ config: { limits }, scripts: [[...actions]] });
  const text = await s.delegate();
  expect(text).toMatch(new RegExp(`^${status} `));
  expect(text).not.toContain("esc=1");
  expect(s.record(text)).toMatchObject({ landed: false, policy: CODEX_POLICY, models: { escalated: false } });
  expect(readFileSync(join(s.repo.dir, "value.txt"), "utf8")).toBe("0\n");
  sameModel(s);
}, slow(30_000));

test("an unavailable acceptance command is a non-landing environment failure without model repairs", async () => {
  const s = await fixture({ scripts: [writeValue(2), writeValue(2)] });
  const text = await s.delegate({ done_when: "`cheapag-nonexistent-check-command` passes" });
  expect(text).toMatch(/^FAIL /);
  expect(s.record(text)).toMatchObject({ landed: false, check: "env", policy: CODEX_POLICY });
  expect(s.fake.recorded.prompts).toHaveLength(1);
  expect(readFileSync(join(s.repo.dir, "value.txt"), "utf8")).toBe("0\n");
  sameModel(s);
});

test("cancelling Codex during the second verification command never lands a partially checked patch", async () => {
  const s = await fixture({ scripts: [writeValue(2)] });
  const marker = join(s.repo.dir, ".git", "codex-verify.pid");
  writeFileSync(join(s.repo.dir, "slow.mjs"), `import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(marker)}, String(process.pid));
setTimeout(() => {}, 60_000);
`);
  const before = snapshot(s.repo.dir);
  const pending = s.delegate({ done_when: "`node check.mjs` and `node slow.mjs` both pass" });
  await vi.waitFor(() => expect(existsSync(marker)).toBe(true), { timeout: 10_000 });
  const pid = Number(readFileSync(marker, "utf8"));
  const job = (await s.call("jobs", { action: "list" })).split(" ")[1];
  const cancelled = await s.call("jobs", { action: "cancel", job });
  expect(cancelled).toMatch(/^CANCELLED /);
  expect(await pending).toBe(cancelled);
  expect(s.record(cancelled)).toMatchObject({
    landed: false, policy: CODEX_POLICY,
    verify: [{ cmd: "node check.mjs", ok: true }, { cmd: "node slow.mjs", ok: false }],
  });
  await vi.waitFor(() => expect(isAlive(pid)).toBe(false));
  expect(snapshot(s.repo.dir)).toEqual(before);
  expect(existsSync(join(s.repo.dir, ".cheapag", "worktrees", job, "value.txt"))).toBe(true);
  expect(s.fake.recorded.prompts).toHaveLength(1); // cancellation cannot start a repair
  sameModel(s);
}, slow(30_000));

test.each(["medium", "hard"] as const)("Codex selects its configured %s tier initially and never escalates it after failure", async (difficulty) => {
  const tier = `${difficulty}-cheap`;
  const s = await fixture({
    config: { models: { medium: "opencode-go/medium-cheap", hard: "opencode-go/hard-cheap" } },
    scripts: [writeValue(1), writeValue(1), writeValue(1), writeValue(2)],
  });
  const text = await s.delegate({ difficulty });
  expect(text).toMatch(/^FAIL .* tests=fail /);
  expect(s.record(text)).toMatchObject({
    landed: false, selfFix: 2, policy: CODEX_POLICY,
    models: { requested: `opencode-go/${INITIAL_MODEL.id}`, final: `opencode-go/${tier}`, escalated: false },
  });
  expect(s.fake.recorded.prompts).toHaveLength(3);
  sameModel(s, { providerID: "opencode-go", id: tier });
});

test("a Codex conflict redo keeps bounded same-model repairs and leaves the developer's concurrent edit intact", async () => {
  let main = "";
  let concurrentEditObserved = false;
  const s = await fixture({ scripts: [
    [{ edit: "value.txt", content: "2\n" }, { hook: () => {
      concurrentEditObserved = true;
      writeFileSync(join(main, "value.txt"), "3\n");
    } }, { tool: "write" }, finish()],
    writeValue(1), writeValue(1), writeValue(1), writeValue(2),
  ] });
  main = s.repo.dir;
  // Force the stale-index condition observed when a same-sized edit shares Git's cached timestamps.
  s.repo.git("update-index", "--assume-unchanged", "value.txt");
  const head = s.repo.git("rev-parse", "HEAD");
  const index = s.repo.git("ls-files", "-s");
  const text = await s.delegate();
  expect(concurrentEditObserved, "Concurrent edit hook was skipped").toBe(true);

  expect(readFileSync(join(main, "value.txt"), "utf8"), "Developer's concurrent edit was not preserved").toBe("3\n");
  expect(text).toMatch(/^CONFLICT .* tests=fail /);
  expect(s.record(text)).toMatchObject({ landed: false, redo: 1, selfFix: 2, policy: CODEX_POLICY, models: { escalated: false } });
  expect(s.record(text).verify).toHaveLength(4); // initial pass, then three failed redo checks
  expect(s.fake.recorded.prompts).toHaveLength(4); // escalation sentinel remains unused
  expect(s.fake.recorded.sessions).toHaveLength(1);
  expect(s.repo.git("rev-parse", "HEAD")).toBe(head);
  expect(s.repo.git("ls-files", "-s")).toBe(index);
  expect(readFileSync(join(main, "value.txt"), "utf8")).toBe("3\n");
  expect(existsSync(join(main, ".cheapag", "worktrees", jobOf(text)))).toBe(true);
  sameModel(s);
});

test("Codex research stops at a provider limit instead of switching its research model", async () => {
  const s = await fixture({ scripts: [[LIMIT], [{ text: "should never execute" }]] });
  const before = snapshot(s.repo.dir);
  expect(await s.call("research", { question: "Where is the value stored?" })).toMatch(/^BUDGET /);
  expect(s.fake.recorded.prompts).toHaveLength(1);
  sameModel(s, { providerID: "opencode-go", id: "qwen3.8-flash" });
  expect(snapshot(s.repo.dir)).toEqual(before);
});

test("reply keeps the originating Codex policy through subsequent verification repairs", async () => {
  const s = await fixture({ scripts: [
    [{ question: "Which value?", options: ["two", "three"] }, ...writeValue(1)],
    writeValue(1), writeValue(1), writeValue(2),
  ] });
  const blocked = await s.delegate();
  expect(blocked).toMatch(/^BLOCKED /);
  expect(s.record(blocked)).toMatchObject({ policy: CODEX_POLICY, landed: false });
  const text = await s.call("reply", { job: jobOf(blocked), answer: "a" });
  expect(text).toMatch(/^FAIL .* tests=fail /);
  expect(s.record(text)).toMatchObject({ policy: CODEX_POLICY, selfFix: 2, landed: false, models: { escalated: false } });
  expect(s.fake.recorded.prompts).toHaveLength(3);
  expect(s.fake.recorded.questionReplies[0].answers).toEqual([["two"]]);
  sameModel(s);
});

test.each([
  ["fallback", "opencode-go/qwen3.7-plus"],
  ["escalation", "opencode-go/deepseek-v4-pro"],
])("Codex never promotes an allowlisted %s-only candidate into implementation", async (_, model) => {
  const s = await fixture({ allow: ["--models", model] });
  const text = await s.delegate();
  expect(text).toMatch(/^FAIL reason: no allowed model/);
  expect(text).not.toContain("/cheapag:allow");
  noWork(s);
});

test("Codex retains OpenRouter privacy and zero-retention routing", async () => {
  const s = await fixture({ logins: { openrouter: "k" }, allow: ["--zdr-only"], scripts: [writeValue(2)] });
  const text = await s.delegate();
  expect(text).toMatch(/^OK .* tests=pass /);
  const config = JSON.parse(readFileSync(join(s.repo.dir, ".cheapag", "opencode", "opencode.json"), "utf8"));
  for (const model of Object.values(config.provider.openrouter.models) as { options: { provider: object } }[]) {
    expect(model.options.provider).toEqual({ data_collection: "deny", zdr: true });
  }
});

test("Codex still requires new consent after provider or configured-route changes", async () => {
  const s = await fixture();
  writeFileSync(join(s.repo.dir, "cheapag.json"), JSON.stringify({ models: { implement: "opencode-go/custom-model" } }));
  expect(await s.delegate()).toMatch(/^CONSENT /);
  noWork(s);
  const other = await startServer({ cwd: s.repo.dir, serverArgs: ["serve", "--client", "codex"], env: { CHEAPAG_OPENCODE_URL: s.fake.url }, logins: { openrouter: "k" } });
  onTestFinished(other.close);
  expect(await callText(other.client, "delegate", { task: "Set value to 2", done_when: "`node check.mjs`" })).toMatch(/^CONSENT /);
  noWork(s);
});

test.each(["replace integration_cmd", "remove configuration", "replace test_cmd", "legacy missing snapshot", "original no check"])("deferred Codex verification preserves its origin: %s", async (change) => {
  const original = "node integration.mjs";
  const s = await fixture({ config: change === "original no check" ? {} : change === "replace test_cmd" ? { test_cmd: original } : { integration_cmd: original } });
  writeFileSync(join(s.repo.dir, "integration.mjs"), `import { existsSync } from "node:fs";
if (existsSync("a.txt") && existsSync("b.txt") && !existsSync("fixed.txt")) {
  console.log("Error: combined files require fixed.txt"); process.exit(1);
}
`);
  writeFileSync(join(s.repo.dir, "plan.md"), "# Groups\n\n## 1 add a\nfiles: a.txt\ndone-when: `node always.mjs`\n\n## 2 add b\nfiles: b.txt\ndone-when: `node always.mjs`\n");
  s.fake.scriptFor(">>> CURRENT STEP(S): 1\n", { edit: "a.txt", content: "a\n" }, { tool: "write" }, finish("added a"));
  s.fake.scriptFor(">>> CURRENT STEP(S): 2\n", { edit: "b.txt", content: "b\n" }, { error: { name: "APIError", message: "worker unavailable" } });
  const early = await s.call("delegate", { plan: "plan.md", steps: "1,2" });
  const batch = early.match(/^BATCH (b[0-9a-z]{4}) /)![1];
  const second = early.match(/^FAIL (j[0-9a-z]{4}) step=2 /m)![1];
  const readBatch = () => JSON.parse(readFileSync(join(s.repo.dir, ".cheapag", "batches", `${batch}.json`), "utf8"));
  expect(readBatch()).toMatchObject({ integration: change === "original no check" ? "none" : "pending", policy: CODEX_POLICY, integrationCommand: change === "original no check" ? null : original });
  await s.server.close();
  writeFileSync(join(s.repo.dir, "cheapag.json"), JSON.stringify(change === "remove configuration" ? {} : change === "replace test_cmd" ? { test_cmd: "node always.mjs" } : { integration_cmd: "node always.mjs" }));
  if (change === "legacy missing snapshot") {
    const legacy = readBatch();
    delete legacy.integrationCommand;
    writeFileSync(join(s.repo.dir, ".cheapag", "batches", `${batch}.json`), JSON.stringify(legacy));
  }
  for (let i = 0; i < 3; i++) s.fake.script({ edit: "other.txt", content: "still wrong\n" }, { tool: "write" }, finish("attempted integration"));
  s.fake.script({ edit: "fixed.txt", content: "done\n" }, { tool: "write" }, finish("unexpected escalation sentinel"));
  const claude = await startServer({ cwd: s.repo.dir, env: { CHEAPAG_OPENCODE_URL: s.fake.url }, logins: { "opencode-go": "k" } });
  onTestFinished(claude.close);
  const text = await callText(claude.client, "land", { job: second, action: "apply" });
  if (change === "legacy missing snapshot" || change === "original no check") {
    expect(s.fake.recorded.prompts).toHaveLength(2);
    expect(readBatch().integration).toBe(change === "original no check" ? "none" : "pending");
    if (change === "legacy missing snapshot") expect(text).toContain("original integration check unavailable");
    expect(readBatch().verify).toEqual([]);
    return;
  }
  expect(text).toContain("integration=fail");
  const batchRecord = readBatch();
  expect(batchRecord.verify).toEqual([expect.objectContaining({ cmd: original, ok: false })]);
  expect(batchRecord).toMatchObject({ policy: CODEX_POLICY, integration: "fail" });
  const fix = JSON.parse(readFileSync(join(s.repo.dir, ".cheapag", "jobs", batchRecord.fix, "result.json"), "utf8"));
  expect(fix).toMatchObject({ policy: CODEX_POLICY, status: "FAIL", landed: false, selfFix: 2, models: { escalated: false } });
  expect(fix.verify).toHaveLength(3);
  for (const run of fix.verify) expect(run.cmd).toBe(original);
  expect(s.fake.recorded.prompts).toHaveLength(5); // two groups plus three fixed-model integration attempts
  expect(existsSync(join(s.repo.dir, "fixed.txt"))).toBe(false);
  expect(existsSync(join(s.repo.dir, "other.txt"))).toBe(false);
  expect(existsSync(join(s.repo.dir, ".cheapag", "worktrees", batchRecord.fix))).toBe(true);
  sameModel(s);
}, slow(30_000));
