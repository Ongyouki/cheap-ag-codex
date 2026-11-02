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

/** Codex filters inherited MCP environment variables; set isolated profile paths explicitly. */
export function codexMcpConfig(root: string, server: { node: string; entry: string; cwd: string }): string {
  const toml = (s: string) => JSON.stringify(s);
  // No inherited variables or credentials belong in the MCP configuration.
  const env = Object.entries(isolatedEnv(root, {})).map(([key, value]) => `${toml(key)}=${toml(value!)}`).join(",");
  return `mcp_servers.cheapag={command=${toml(server.node)},args=[${[server.entry, "serve", "--client", "codex"].map(toml).join(",")}],cwd=${toml(server.cwd)},env={${env}},tool_timeout_sec=300,enabled_tools=["delegate","jobs"],tools={delegate={approval_mode="approve"},jobs={approval_mode="approve"}}}`;
}
