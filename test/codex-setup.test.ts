import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, onTestFinished, test } from "vitest";
import { hermeticHome, removeDir, serverEntry, tempRepo } from "./harness.js";
import { rollbackExclude } from "../src/codex-setup.js";

function fixture() {
  const repo = tempRepo("clean", "cheapag project with spaces ");
  const { home, env } = hermeticHome();
  onTestFinished(repo.cleanup);
  onTestFinished(() => removeDir(home));
  const codexHome = join(home, "codex home");
  const claudeHome = join(home, "claude home");
  mkdirSync(codexHome);
  mkdirSync(claudeHome);
  writeFileSync(join(claudeHome, "settings.json"), "claude sentinel\n");
  const run = (...args: string[]) => spawnSync(process.execPath, [serverEntry, "codex", ...args], {
    cwd: home, env: { ...env, HOME: home, USERPROFILE: home, CODEX_HOME: codexHome, CLAUDE_CONFIG_DIR: claudeHome }, encoding: "utf8",
  });
  return { repo, home, codexHome, claudeHome, run, config: join(repo.dir, ".codex", "config.toml"), exclude: join(repo.dir, ".git", "info", "exclude") };
}

test("setup binds the canonical repository and excludes its configuration without touching other homes", () => {
  const f = fixture();
  const sub = join(f.repo.dir, "sub directory");
  mkdirSync(sub);
  const r = f.run("setup", "--project", sub);
  expect(r.status).toBe(0);
  const contents = readFileSync(f.config, "utf8");
  expect(contents).toContain(`cwd = ${JSON.stringify(f.repo.dir)}`);
  expect(contents).toContain(`args = [${JSON.stringify(serverEntry)}, "serve", "--client", "codex"]`);
  expect(contents).toContain('direct_only_tool_namespaces = ["mcp__cheapag"]');
  expect(f.repo.git("check-ignore", ".codex/config.toml").trim()).toBe(".codex/config.toml");
  expect(f.repo.git("status", "--porcelain")).not.toContain(".codex");
  expect(existsSync(join(f.codexHome, "config.toml"))).toBe(false);
  expect(readFileSync(join(f.claudeHome, "settings.json"), "utf8")).toBe("claude sentinel\n");
  expect(existsSync(join(f.repo.dir, ".cheapag"))).toBe(false);
  const exclude = readFileSync(f.exclude, "utf8");
  const repeated = f.run("setup", "--project", f.repo.dir);
  expect(repeated.status).toBe(1);
  expect(repeated.stderr).toContain("merge the following manually");
  expect(readFileSync(f.config, "utf8")).toBe(contents);
  expect(readFileSync(f.exclude, "utf8")).toBe(exclude);
});

test("dry run changes nothing and reports the planned configuration", () => {
  const f = fixture();
  const exclude = readFileSync(f.exclude, "utf8");
  const r = f.run("setup", "--project", f.repo.dir, "--dry-run");
  expect(r.status).toBe(0);
  expect(r.stdout).toContain(`cwd = ${JSON.stringify(f.repo.dir)}`);
  expect(existsSync(join(f.repo.dir, ".codex"))).toBe(false);
  expect(readFileSync(f.exclude, "utf8")).toBe(exclude);
});

test("existing configuration is refused without changing it or Git excludes", () => {
  const f = fixture();
  mkdirSync(join(f.repo.dir, ".codex"));
  writeFileSync(f.config, "# existing\nmodel = 'other'\n");
  const exclude = readFileSync(f.exclude, "utf8");
  const r = f.run("setup", "--project", f.repo.dir);
  expect(r.status).toBe(1);
  expect(r.stderr).toContain("already exists");
  expect(readFileSync(f.config, "utf8")).toBe("# existing\nmodel = 'other'\n");
  expect(readFileSync(f.exclude, "utf8")).toBe(exclude);
});

test("invalid and non-repository projects produce no configuration", () => {
  const f = fixture();
  expect(f.run("setup", "--project", f.home).status).toBe(1);
  expect(f.run("setup").status).toBe(1);
  expect(existsSync(join(f.home, ".codex"))).toBe(false);
});

test("a staged configuration deleted from disk is never recreated", () => {
  const f = fixture();
  mkdirSync(join(f.repo.dir, ".codex"));
  writeFileSync(f.config, "staged\n");
  f.repo.git("add", ".codex/config.toml");
  rmSync(f.config);
  const exclude = readFileSync(f.exclude, "utf8");
  expect(f.run("setup", "--project", f.repo.dir).status).toBe(1);
  expect(existsSync(f.config)).toBe(false);
  expect(readFileSync(f.exclude, "utf8")).toBe(exclude);
});

test("a negated project ignore rule prevents writing an unprotected config", () => {
  const f = fixture();
  writeFileSync(join(f.repo.dir, ".gitignore"), "!.codex/config.toml\n");
  const exclude = readFileSync(f.exclude, "utf8");
  const r = f.run("setup", "--project", f.repo.dir);
  expect(r.status).toBe(1);
  expect(r.stderr).toContain("does not ignore");
  expect(existsSync(f.config)).toBe(false);
  expect(readFileSync(f.exclude, "utf8")).toBe(exclude);
});

test("conflicting routing in user config is refused without changing or printing it", () => {
  const f = fixture();
  const userConfig = join(f.codexHome, "config.toml");
  const contents = '[features.code_mode]\ndirect_only_tool_namespaces = ["mcp__other"]\n';
  writeFileSync(userConfig, contents);
  const exclude = readFileSync(f.exclude, "utf8");
  for (const args of [[], ["--dry-run"]]) {
    const r = f.run("setup", "--project", f.repo.dir, ...args);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("Conflicting direct-only routing");
    expect(r.stderr).not.toContain("mcp__other");
  }
  expect(readFileSync(userConfig, "utf8")).toBe(contents);
  expect(readFileSync(f.exclude, "utf8")).toBe(exclude);
  expect(existsSync(f.config)).toBe(false);
});

test("unrelated user configuration is preserved and setup succeeds", () => {
  const f = fixture();
  const file = join(f.codexHome, "config.toml");
  const contents = '# private preferences\nmodel = "example"\n[features]\nunified_exec = true\n';
  writeFileSync(file, contents);
  expect(f.run("setup", "--project", f.repo.dir).status).toBe(0);
  expect(readFileSync(file, "utf8")).toBe(contents);
  expect(existsSync(f.config)).toBe(true);
});

test("ancestor project routing conflicts are detected without modifying the ancestor", () => {
  const f = fixture();
  const nested = join(f.repo.dir, "nested repo");
  mkdirSync(nested);
  f.repo.git("-C", nested, "init", "-q");
  mkdirSync(join(f.repo.dir, ".codex"));
  const contents = 'features.code_mode.direct_only_tool_namespaces = ["other"]\n';
  writeFileSync(f.config, contents);
  const result = f.run("setup", "--project", nested);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Conflicting direct-only routing");
  expect(readFileSync(f.config, "utf8")).toBe(contents);
  expect(existsSync(join(nested, ".codex"))).toBe(false);
});

test.each([
  ["malformed", 'model = "secret\n', "Cannot safely parse"],
  ["manual registration", '[mcp_servers.cheapag]\ncommand = "secret"\n', "Conflicting cheapag"],
  ["unsupported structure", 'features = "secret"\n', "Unsupported higher-level"],
])("refuses %s configuration without printing contents", (_, contents, error) => {
  const f = fixture();
  const file = join(f.codexHome, "config.toml");
  writeFileSync(file, contents);
  const exclude = readFileSync(f.exclude, "utf8");
  const r = f.run("setup", "--project", f.repo.dir);
  expect(r.status).toBe(1);
  expect(r.stderr).toContain(error);
  expect(r.stderr).not.toContain("secret");
  expect(readFileSync(file, "utf8")).toBe(contents);
  expect(readFileSync(f.exclude, "utf8")).toBe(exclude);
  expect(existsSync(f.config)).toBe(false);
});

test("failure creating the configuration rolls back the exact exclude addition", () => {
  const f = fixture();
  writeFileSync(join(f.repo.dir, ".codex"), "not a directory");
  const exclude = readFileSync(f.exclude, "utf8");
  expect(f.run("setup", "--project", f.repo.dir).status).toBe(1);
  expect(readFileSync(f.exclude, "utf8")).toBe(exclude);
  expect(readFileSync(join(f.repo.dir, ".codex"), "utf8")).toBe("not a directory");
});

test("linked worktree setup is refused without modifying shared excludes", () => {
  const f = fixture();
  const linked = join(f.home, "linked worktree");
  f.repo.git("worktree", "add", "--detach", linked, "HEAD");
  const exclude = readFileSync(f.exclude, "utf8");
  const r = f.run("setup", "--project", linked);
  expect(r.status).toBe(1);
  expect(r.stderr).toContain("linked worktrees");
  expect(existsSync(join(linked, ".codex"))).toBe(false);
  expect(readFileSync(f.exclude, "utf8")).toBe(exclude);
});

test("rollback preserves an exclude file changed after our addition", () => {
  const f = fixture();
  const before = readFileSync(f.exclude);
  appendFileSync(f.exclude, "/.codex/config.toml\n");
  const after = readFileSync(f.exclude);
  const { dev, ino } = statSync(f.exclude);
  appendFileSync(f.exclude, "unrelated concurrent edit\n");
  const changed = readFileSync(f.exclude);
  expect(rollbackExclude(f.exclude, { before, after, dev, ino })).toBe(false);
  expect(readFileSync(f.exclude)).toEqual(changed);
});
