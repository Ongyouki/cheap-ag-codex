import { spawnSync } from "node:child_process";
import { appendFileSync, closeSync, existsSync, fstatSync, ftruncateSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { parse } from "toml";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { stableNode } from "./install.js";
import { git, projectRoot } from "./workspace.js";

const usage = "usage: cheapag codex setup --project <path> [--dry-run]";
const quoted = (s: string) => JSON.stringify(s);
const inside = (path: string, parent: string) => { const r = relative(parent, path); return r === "" || (!r.startsWith(`..${sep}`) && r !== ".." && !isAbsolute(r)); };
const present = (path: string) => { try { lstatSync(path); return true; } catch (err) { if (["ENOENT", "ENOTDIR"].includes((err as NodeJS.ErrnoException).code ?? "")) return false; throw err; } };
type Addition = { before: Buffer; after: Buffer; dev: number; ino: number };

/** Do not remove the addition if another writer changed or replaced the exclude file. */
export function rollbackExclude(exclude: string, added: Addition): boolean {
  let fd: number | undefined;
  try {
    fd = openSync(exclude, "r+");
    const stat = fstatSync(fd), pathStat = lstatSync(exclude);
    if (stat.dev !== added.dev || stat.ino !== added.ino || pathStat.dev !== stat.dev || pathStat.ino !== stat.ino || !readFileSync(fd).equals(added.after)) return false;
    ftruncateSync(fd, added.before.length);
    return true;
  } catch { return false; }
  finally { if (fd !== undefined) closeSync(fd); }
}

/** Read higher-level files without modifying or exposing their contents. */
function checkHigherConfig(root: string) {
  const home = resolve(process.env.CODEX_HOME || join(homedir(), ".codex"));
  const candidates = [join(home, "config.toml")];
  for (let parent = dirname(root); ; parent = dirname(parent)) {
    candidates.push(join(parent, ".codex", "config.toml"));
    if (dirname(parent) === parent) break;
  }
  const table = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) !== Date.prototype;
  for (const file of candidates) {
    if (!present(file)) continue;
    let config: unknown;
    try { config = parse(readFileSync(file, "utf8")); }
    catch { throw new Error(`Cannot safely parse higher-level Codex configuration at ${file}; integrate manually`); }
    if (!table(config)) throw new Error(`Unsupported higher-level Codex configuration at ${file}; integrate manually`);
    const mcp = config.mcp_servers, features = config.features;
    if ((mcp !== undefined && !table(mcp)) || (features !== undefined && !table(features))) throw new Error(`Unsupported higher-level Codex configuration at ${file}; integrate manually`);
    if (table(mcp) && Object.hasOwn(mcp, "cheapag")) throw new Error(`Conflicting cheapag registration in ${file}; integrate manually`);
    const mode = table(features) ? features.code_mode : undefined;
    if (mode !== undefined && !table(mode)) throw new Error(`Unsupported higher-level Codex configuration at ${file}; integrate manually`);
    if (table(mode) && Object.hasOwn(mode, "direct_only_tool_namespaces")) throw new Error(`Conflicting direct-only routing in ${file}; integrate manually`);
  }
}

/** Creates only a new project configuration; existing files are always left for manual integration. */
export function codexSetup(args: string[]): number {
  try {
    if (args[0] !== "setup") throw new Error(usage);
    let project: string | undefined;
    let dry = false;
    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--project" && project === undefined && args[i + 1] && !args[i + 1].startsWith("--")) project = args[++i];
      else if (args[i] === "--dry-run" && !dry) dry = true;
      else throw new Error(usage);
    }
    if (!project) throw new Error(usage);
    const root = realpathSync(projectRoot(resolve(project)));
    const entry = realpathSync(process.argv[1]);
    const node = resolve(stableNode());
    const temp = realpathSync(tmpdir());
    if (inside(entry, temp) || inside(realpathSync(node), temp) || entry.split(sep).includes("_npx")) throw new Error("temporary installations cannot be registered; use a durable local build or installation");
    const gitDir = realpathSync(resolve(root, git(root, ["rev-parse", "--git-dir"]).trim()));
    const common = realpathSync(resolve(root, git(root, ["rev-parse", "--git-common-dir"]).trim()));
    if (gitDir !== common) throw new Error("linked worktrees are not supported by project setup");
    const dir = join(root, ".codex");
    const file = join(dir, "config.toml");
    const config = `[mcp_servers.cheapag]\ncommand = ${quoted(node)}\nargs = [${quoted(entry)}, "serve", "--client", "codex"]\ncwd = ${quoted(root)}\n\n[features.code_mode]\ndirect_only_tool_namespaces = ["mcp__cheapag"]\n`;
    if (existsSync(dir) && lstatSync(dir).isSymbolicLink()) throw new Error(".codex is a symlink; configure manually");
    if (existsSync(file) || (() => { try { lstatSync(file); return true; } catch { return false; } })()) {
      throw new Error(`${file} already exists; merge the following manually, preserving existing settings and direct-only namespaces:\n${config}`);
    }
    checkHigherConfig(root);
    if (git(root, ["ls-files", "--", ".codex/config.toml"]).trim()) throw new Error(".codex/config.toml is tracked or staged; configure manually");
    const exclude = resolve(root, git(root, ["rev-parse", "--git-path", "info/exclude"]).trim());
    if (existsSync(exclude) && lstatSync(exclude).isSymbolicLink()) throw new Error("Git exclude file is a symlink; configure manually");
    if (dry) {
      process.stdout.write(`Would create ${file} and ensure /.codex/config.toml is excluded.\n${config}`);
      return 0;
    }
    const ignored = () => spawnSync("git", ["check-ignore", "-q", "--no-index", "--", ".codex/config.toml"], { cwd: root }).status === 0;
    let added: Addition | undefined;
    try {
      if (!ignored()) {
        const before = existsSync(exclude) ? readFileSync(exclude) : Buffer.alloc(0);
        const suffix = `${before.length && before.at(-1) !== 10 ? "\n" : ""}/.codex/config.toml\n`;
        mkdirSync(dirname(exclude), { recursive: true });
        appendFileSync(exclude, suffix);
        const stat = lstatSync(exclude);
        added = { before, after: Buffer.concat([before, Buffer.from(suffix)]), dev: stat.dev, ino: stat.ino };
      }
      if (!ignored()) throw new Error("Git does not ignore .codex/config.toml; resolve ignore rules manually before retrying");
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, config, { flag: "wx", mode: 0o600 });
    } catch (err) {
      if (added && !rollbackExclude(exclude, added)) process.stderr.write(`cheapag: could not safely roll back ${exclude}; inspect the added /.codex/config.toml line manually\n`);
      throw err;
    }
    process.stdout.write(`Created ${file}; restart Codex in this trusted project.\n`);
    return 0;
  } catch (err) {
    process.stderr.write(`cheapag: ${(err as Error).message}\n`);
    return 1;
  }
}
