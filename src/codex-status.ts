import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { parse } from "toml";
import { projectRoot } from "./workspace.js";

const table = (v: unknown): v is Record<string, any> => v !== null && typeof v === "object" && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const available = (path: string, executable = false) => {
  try { if (!isAbsolute(path) || !statSync(path).isFile()) return false; accessSync(path, executable ? constants.X_OK : constants.R_OK); return true; } catch { return false; }
};

/** Inspect local configuration only. Does not start Codex or the MCP server. */
export function codexStatus(args: string[]): number {
  if (args.length !== 2 || args[0] !== "--project" || !args[1] || args[1].startsWith("--")) {
    process.stderr.write("cheapag: usage: cheapag codex status --project <path>\n");
    return 1;
  }
  try {
    const root = realpathSync(projectRoot(resolve(args[1])));
    const file = join(root, ".codex", "config.toml");
    const home = resolve(process.env.CODEX_HOME || join(homedir(), ".codex"));
    const out = (s: string) => process.stdout.write(`${s}\n`);
    out(`repository: ${root}`);
    out(`codex home: ${home}`);
    let config: Record<string, any> | undefined;
    if (!existsSync(file)) out("project config: missing");
    else {
      try { const parsed: unknown = parse(readFileSync(file, "utf8")); if (!table(parsed)) throw new Error(); config = parsed; out(`project config: present (${file})`); }
      catch { out(`project config: malformed or unreadable (${file})`); }
    }
    const registration = config?.mcp_servers?.cheapag;
    if (config && (config.mcp_servers !== undefined && !table(config.mcp_servers))) out("MCP registration: malformed mcp_servers");
    else if (registration === undefined) out("MCP registration: missing or unknown");
    else if (!table(registration)) out("MCP registration: malformed");
    else {
      const command = registration.command, args = registration.args, cwd = registration.cwd;
      const validArgs = Array.isArray(args) && args.length === 4 && typeof args[0] === "string" && args[1] === "serve" && args[2] === "--client" && args[3] === "codex";
      const validCommand = typeof command === "string" && isAbsolute(command);
      out(`MCP registration: ${validCommand && validArgs ? "configured" : "conflicting or malformed"}`);
      if (validCommand) out(`command: ${command} (${available(command, true) ? "available" : "missing or not executable"})`);
      else out("command: missing or not an absolute path");
      if (validArgs) {
        let same = false;
        try { same = realpathSync(args[0]) === realpathSync(process.argv[1]); } catch {}
        out(`server entry: ${args[0]} (${!available(args[0]) ? "missing or unreadable" : same ? "available, current installation" : "available, different installation"})`);
      }
      else out("server entry: missing or conflicting arguments");
      if (typeof cwd === "string" && isAbsolute(cwd)) {
        let matches = false;
        try { matches = realpathSync(cwd) === root; } catch {}
        out(`cwd: ${cwd} (${matches ? "matches repository" : "stale or conflicting"})`);
      } else out("cwd: missing or invalid");
      if (registration.enabled === false) out("MCP enabled: disabled in project config");
    }
    const routing = config?.features?.code_mode?.direct_only_tool_namespaces;
    if (routing === undefined) out("direct routing: missing or unknown");
    else if (!Array.isArray(routing) || !routing.every((v: unknown) => typeof v === "string")) out("direct routing: malformed");
    else out(`direct routing: ${routing.includes("mcp__cheapag") ? "configured for mcp__cheapag" : "missing mcp__cheapag"} (project config only)`);
    const tracked = spawnSync("git", ["ls-files", "--error-unmatch", "--", ".codex/config.toml"], { cwd: root, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" }, stdio: "ignore" });
    const ignored = spawnSync("git", ["check-ignore", "-q", "--no-index", "--", ".codex/config.toml"], { cwd: root, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" }, stdio: "ignore" });
    out(`Git exclusion: ${tracked.status === 0 ? "tracked or staged (ignore does not protect it)" : tracked.status !== 1 ? "unknown (Git error)" : ignored.status === 0 ? "ignored" : ignored.status === 1 ? "not ignored" : "unknown (Git error)"}`);
    let trust = "unknown (no explicit project trust entry)";
    try {
      const user: unknown = parse(readFileSync(join(home, "config.toml"), "utf8"));
      if (table(user) && table(user.projects) && table(user.projects[root])) {
        const level = user.projects[root].trust_level;
        if (level === "trusted" || level === "untrusted") trust = `explicit ${level} entry in selected Codex home (effective trust not verified)`;
      }
    } catch { trust = "unknown (selected Codex home missing, unreadable, or malformed)"; }
    out(`project trust: ${trust}`);
    out("runtime: not verified; effective configuration and Codex connection not checked");
    return 0;
  } catch (err) {
    process.stderr.write(`cheapag: ${(err as Error).message}\n`);
    return 1;
  }
}
