import { join } from "node:path";

/** Only process-launch essentials cross into the live demonstration. Credentials come from its isolated stores. */
export function isolatedEnv(root: string, inherited: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const essentials: Record<string, string> = {
    PATH: "PATH", SYSTEMROOT: "SystemRoot", WINDIR: "WINDIR", COMSPEC: "COMSPEC", PATHEXT: "PATHEXT",
    TMPDIR: "TMPDIR", TEMP: "TEMP", TMP: "TMP", LANG: "LANG", LC_ALL: "LC_ALL", LC_CTYPE: "LC_CTYPE", TERM: "TERM",
  };
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(inherited)) {
    const essential = essentials[name.toUpperCase()];
    if (essential && value !== undefined) env[essential] = value;
  }
  return {
    ...env,
    HOME: join(root, "process-home"), USERPROFILE: join(root, "process-home"),
    CODEX_HOME: join(root, "codex-home"),
    XDG_DATA_HOME: join(root, "worker-home", "data"), XDG_CONFIG_HOME: join(root, "worker-home", "config"),
    XDG_CACHE_HOME: join(root, "worker-home", "cache"), XDG_STATE_HOME: join(root, "worker-home", "state"),
  };
}
