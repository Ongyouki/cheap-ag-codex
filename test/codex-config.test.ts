import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, onTestFinished, test } from "vitest";
import { serverEntry } from "./harness.js";

function fixture(existing: boolean) {
  const root = mkdtempSync(join(tmpdir(), "cheapag routing with spaces "));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  const codexHome = join(root, "custom codex home");
  const legacyHome = join(root, ".codex");
  const claudeHome = join(root, ".claude");
  if (existing) {
    for (const dir of [codexHome, legacyHome, claudeHome]) mkdirSync(dir);
    const config = '# preserve comments and unrelated settings\nmodel = "existing-model"\n' +
      '[features.code_mode]\ndirect_only_tool_namespaces = ["mcp__other"]\n' +
      '[mcp_servers.other]\ncommand = "other-server"\n' +
      '[mcp_servers.cheapag]\ncommand = "existing-node"\nargs = ["existing-entry", "serve", "--client", "codex"]\n';
    for (const dir of [codexHome, legacyHome]) writeFileSync(join(dir, "config.toml"), config);
    writeFileSync(join(claudeHome, "settings.json"), '{"existing":"Claude registration and hooks"}\n');
    writeFileSync(join(root, "cheapag.json"), '{"test_cmd":"existing-check"}\n');
  }
  const snapshot = () => Object.fromEntries(readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const legacy = entry as typeof entry & { path?: string };
      const parent = entry.parentPath ?? legacy.path;
      if (!parent) throw new Error("Missing directory parent");
      const path = join(parent, entry.name);
      return [path, readFileSync(path).toString("base64")];
    }));
  const run = (...args: string[]) => spawnSync(process.execPath, [serverEntry, "codex-config", ...args], {
    cwd: root, encoding: "utf8", timeout: 5000,
    env: {
      PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
      HOME: root, USERPROFILE: root, CODEX_HOME: codexHome, CLAUDE_CONFIG_DIR: claudeHome,
      XDG_CONFIG_HOME: join(root, "config"), XDG_DATA_HOME: join(root, "data"),
      XDG_CACHE_HOME: join(root, "cache"), XDG_STATE_HOME: join(root, "state"),
    },
  });
  return { root, run, snapshot };
}

test.each([false, true])("codex-config emits only cheapag routing TOML, repeatably and without writes (existing=%s)", (existing) => {
  const { root, run, snapshot } = fixture(existing);
  const before = snapshot();
  const paths = readdirSync(root, { recursive: true }).sort();
  for (let i = 0; i < 2; i++) {
    const result = run();
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    // Exact known-valid TOML: an unquoted dotted table and an array of basic strings.
    // No JSON object syntax, wildcard namespace, registration or unrelated settings.
    expect(result.stdout).toBe('[features.code_mode]\ndirect_only_tool_namespaces = ["mcp__cheapag"]\n');
  }
  expect(snapshot()).toEqual(before);
  expect(readdirSync(root, { recursive: true }).sort()).toEqual(paths);
});

test.each([["--write"], ["--client", "claude"], ["--output", "config.toml"]])("codex-config rejects unsupported arguments %j without writes", (...args) => {
  const { root, run, snapshot } = fixture(true);
  const before = snapshot();
  const paths = readdirSync(root, { recursive: true }).sort();
  const result = run(...args);
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("cheapag: usage: cheapag codex-config\n");
  expect(snapshot()).toEqual(before);
  expect(readdirSync(root, { recursive: true }).sort()).toEqual(paths);
});
