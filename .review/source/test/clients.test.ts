import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, onTestFinished, test } from "vitest";
import { clientProfile, CLAUDE_POLICY, CODEX_POLICY, restrictPolicy } from "../src/clients.js";
import { instructions } from "../src/server.js";
import { callText, hermeticHome, serverEntry, startServer, tempRepo } from "./harness.js";

test("legacy startup and explicit Claude startup preserve instructions and all six schemas", async () => {
  const legacy = await startServer();
  onTestFinished(legacy.close);
  const { tools } = await legacy.client.listTools();
  expect(tools.map((tool) => tool.name).sort()).toEqual(["delegate", "jobs", "land", "ping", "reply", "research"]);
  expect(legacy.client.getInstructions()).toBe(instructions());
  for (const serverArgs of [["serve"], ["serve", "--client", "claude"]]) {
    const explicit = await startServer({ serverArgs });
    onTestFinished(explicit.close);
    expect(explicit.client.getInstructions()).toBe(legacy.client.getInstructions());
    expect((await explicit.client.listTools()).tools).toEqual(tools);
  }
  const codex = await startServer({ serverArgs: ["serve", "--client", "codex"] });
  onTestFinished(codex.close);
  const codexTools = (await codex.client.listTools()).tools;
  expect(codexTools.map((tool) => ({ name: tool.name, inputSchema: tool.inputSchema })))
    .toEqual(tools.map((tool) => ({ name: tool.name, inputSchema: tool.inputSchema })));
  for (const tool of codexTools) expect(tool._meta?.["anthropic/alwaysLoad"]).toBeUndefined();
  for (const name of ["delegate", "research"]) expect(tools.find((tool) => tool.name === name)?._meta).toEqual({ "anthropic/alwaysLoad": true });
});

test("Codex guidance is self-contained, permits review, and ignores Claude takeover settings", async () => {
  const repo = tempRepo("clean", "cheapag client with spaces ");
  onTestFinished(repo.cleanup);
  mkdirSync(join(repo.dir, "sub"));
  writeFileSync(join(repo.dir, "cheapag.json"), JSON.stringify({ hard_tasks: "sonnet", takeover: "sonnet" }));
  const server = await startServer({ cwd: join(repo.dir, "sub"), serverArgs: ["serve", "--client", "codex"] });
  onTestFinished(server.close);
  const text = server.client.getInstructions()!;
  expect(text).toBe(clientProfile("codex").instructions);
  expect(text.slice(0, 512)).toContain("executable acceptance checks");
  expect(text.slice(0, 512)).toContain("uncommitted");
  expect(text.slice(0, 512)).toContain("no automatic model switching");
  expect(text).toContain("inspect the diff");
  expect(text).toContain("never submit the same delegation again");
  expect(text).not.toMatch(/sonnet|\/cheapag:allow|Agent tool/i);
  expect(await callText(server.client, "ping")).toBe("FAIL reason: no worker provider; configure a saved OpenCode provider login (see docs/codex.md)");
});

test.each([
  ["--client"], ["--client", "other"], ["--client", "CODEX"],
  ["--client", "codex", "--client", "claude"], ["--unknown"], ["codex"], ["--client=codex"],
])("invalid serve arguments %j fail before starting MCP", (...args: string[]) => {
  const { home, env } = hermeticHome();
  onTestFinished(() => rmSync(home, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [serverEntry, "serve", ...args], { cwd: home, env, encoding: "utf8", timeout: 5000 });
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("cheapag: usage: cheapag serve [--client claude|codex]\n");
});

test("a reloaded originating policy and a new host can only strengthen restrictions", () => {
  const reloaded = JSON.parse(JSON.stringify(CODEX_POLICY));
  expect(restrictPolicy(reloaded, CLAUDE_POLICY)).toEqual(CODEX_POLICY);
  expect(restrictPolicy(CLAUDE_POLICY, CODEX_POLICY)).toEqual(CODEX_POLICY);
  expect(restrictPolicy()).toEqual(CLAUDE_POLICY);
  expect(Object.isFrozen(restrictPolicy(reloaded, CLAUDE_POLICY))).toBe(true);
});
