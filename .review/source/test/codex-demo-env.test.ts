import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, onTestFinished, test } from "vitest";
import { isolatedEnv } from "./codex-demo-env.js";

const unrelated = {
  OPENAI_API_KEY: "synthetic-openai", ANTHROPIC_API_KEY: "synthetic-anthropic", OPENROUTER_API_KEY: "synthetic-openrouter",
  OPENCODE_GO_API_KEY: "synthetic-go", DEEPSEEK_API_KEY: "synthetic-deepseek", COMMAND_CODE_API_KEY: "synthetic-command-code",
  AWS_ACCESS_KEY_ID: "synthetic-cloud", AWS_SESSION_TOKEN: "synthetic-session", GITHUB_TOKEN: "synthetic-github",
  UNRELATED_VENDOR_SECRET: "synthetic-unknown", HTTP_PROXY: "http://unrelated.invalid", HTTPS_PROXY: "http://unrelated.invalid",
  NODE_OPTIONS: "--require /must-not-load-this-module", NODE_PATH: "/unrelated/modules", LD_PRELOAD: "/unrelated/loader",
  DYLD_INSERT_LIBRARIES: "/unrelated/loader", OPENCODE_CONFIG: "synthetic-config", OPENCODE_CONFIG_DIR: "/unrelated/config",
  CHEAPAG_OPENCODE_URL: "http://unrelated.invalid", CODEX_HOME: "/unrelated/codex", HOME: "/unrelated/home",
  USERPROFILE: "/unrelated/profile", XDG_DATA_HOME: "/unrelated/data", SSH_AUTH_SOCK: "/unrelated/agent",
};

test("demo environment allows only process essentials and fixes every profile location", () => {
  const root = join(tmpdir(), "cheapag isolated environment");
  const env = isolatedEnv(root, { ...unrelated, Path: "/test/path", SystemRoot: "C:\\Windows", COMSPEC: "cmd.exe", TEMP: "/test/tmp", LANG: "C", TERM: "dumb" });
  expect(env).toEqual({
    PATH: "/test/path", SystemRoot: "C:\\Windows", COMSPEC: "cmd.exe", TEMP: "/test/tmp", LANG: "C", TERM: "dumb",
    HOME: join(root, "process-home"), USERPROFILE: join(root, "process-home"), CODEX_HOME: join(root, "codex-home"),
    XDG_DATA_HOME: join(root, "worker-home", "data"), XDG_CONFIG_HOME: join(root, "worker-home", "config"),
    XDG_CACHE_HOME: join(root, "worker-home", "cache"), XDG_STATE_HOME: join(root, "worker-home", "state"),
  });
  expect(isolatedEnv(root, {})).not.toHaveProperty("PATH");
});

test("a stub CLI and its worker child receive no unrelated credentials or loader configuration", () => {
  const root = mkdtempSync(join(tmpdir(), "cheapag-demo-environment-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "process-home"));
  const env = isolatedEnv(root, { ...process.env, ...unrelated });
  // A local Node stub stands in for Codex, then starts its own local worker: no CLI login or provider invocation.
  const script = `const {spawnSync}=require('node:child_process');
const worker=spawnSync(process.execPath,['-e','process.stdout.write(JSON.stringify(process.env))'],{encoding:'utf8',env:process.env});
if(worker.status!==0) throw new Error(worker.stderr);
process.stdout.write(JSON.stringify({cli:process.env,worker:JSON.parse(worker.stdout)}));`;
  const result = spawnSync(process.execPath, ["-e", script], { cwd: root, env, encoding: "utf8", timeout: 10_000 });
  expect(result.status, result.stderr).toBe(0);
  const observed = JSON.parse(result.stdout);
  for (const child of [observed.cli, observed.worker]) {
    for (const [name, value] of Object.entries(unrelated)) expect(child[name]).not.toBe(value);
    expect(child.HOME).toBe(join(root, "process-home"));
    expect(child.CODEX_HOME).toBe(join(root, "codex-home"));
    expect(child.XDG_DATA_HOME).toBe(join(root, "worker-home", "data"));
    expect(child.PATH).toBe(env.PATH);
  }
});
