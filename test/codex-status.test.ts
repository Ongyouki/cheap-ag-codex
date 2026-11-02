import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, onTestFinished, test } from "vitest";
import { hermeticHome, removeDir, serverEntry, tempRepo } from "./harness.js";

function fixture() {
  const repo = tempRepo("clean", "cheapag status with spaces ");
  const { home, env } = hermeticHome();
  onTestFinished(repo.cleanup);
  onTestFinished(() => removeDir(home));
  const codexHome = join(home, "custom codex home");
  mkdirSync(codexHome);
  const run = (...args: string[]) => spawnSync(process.execPath, [serverEntry, "codex", ...args], { cwd: home, env: { ...env, HOME: home, USERPROFILE: home, CODEX_HOME: codexHome }, encoding: "utf8" });
  return { repo, home, codexHome, run, file: join(repo.dir, ".codex", "config.toml"), exclude: join(repo.dir, ".git", "info", "exclude") };
}

test("status reports project setup, canonical subdirectory root and explicit custom-home trust without writes", () => {
  const f = fixture();
  expect(f.run("setup", "--project", f.repo.dir).status).toBe(0);
  const sub = join(f.repo.dir, "sub dir");
  mkdirSync(sub);
  const user = join(f.codexHome, "config.toml");
  writeFileSync(user, `[projects.${JSON.stringify(f.repo.dir)}]\ntrust_level = "trusted"\n`);
  const config = readFileSync(f.file), exclude = readFileSync(f.exclude), trust = readFileSync(user);
  const r = f.run("status", "--project", sub);
  expect(r.status).toBe(0);
  for (const s of [`repository: ${f.repo.dir}`, `codex home: ${f.codexHome}`, "MCP registration: configured", "available", "matches repository", "direct routing: configured for mcp__cheapag", "Git exclusion: ignored", "explicit trusted entry", "runtime: not verified"]) expect(r.stdout).toContain(s);
  expect(readFileSync(f.file)).toEqual(config);
  expect(readFileSync(f.exclude)).toEqual(exclude);
  expect(readFileSync(user)).toEqual(trust);
});

test("status reports missing config and unknown trust without creating files", () => {
  const f = fixture();
  const before = readFileSync(f.exclude);
  const r = f.run("status", "--project", f.repo.dir);
  expect(r.stdout).toContain("project config: missing");
  expect(r.stdout).toContain("MCP registration: missing or unknown");
  expect(r.stdout).toContain("project trust: unknown");
  expect(readFileSync(f.exclude)).toEqual(before);
  expect(f.repo.git("status", "--porcelain")).toBe("");
});

test.each([
  ["malformed", 'secret = "unterminated', "project config: malformed"],
  ["conflicting", '[mcp_servers.cheapag]\ncommand = "elsewhere"\nargs = ["other"]\ncwd = "/missing"\n[features.code_mode]\ndirect_only_tool_namespaces = ["other"]\n', "MCP registration: conflicting or malformed"],
  ["stale", `[mcp_servers.cheapag]\ncommand = "/missing/node"\nargs = ["/missing/index.js", "serve", "--client", "codex"]\ncwd = "/missing"\n`, "stale or conflicting"],
])("status diagnoses %s configuration without exposing its contents", (_, contents, expected) => {
  const f = fixture();
  mkdirSync(join(f.repo.dir, ".codex"));
  writeFileSync(f.file, contents);
  const before = readFileSync(f.file), exclude = readFileSync(f.exclude);
  const r = f.run("status", "--project", f.repo.dir);
  expect(r.status).toBe(0);
  expect(r.stdout).toContain(expected);
  expect(r.stdout).not.toContain("secret");
  expect(readFileSync(f.file)).toEqual(before);
  expect(readFileSync(f.exclude)).toEqual(exclude);
});
