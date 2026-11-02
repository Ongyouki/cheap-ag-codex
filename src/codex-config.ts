/** Read-only, opt-in snippet for Codex CLI 0.166.0; never reads or edits a profile. */
export function codexConfig(args: string[]): number {
  if (args.length) {
    process.stderr.write("cheapag: usage: cheapag codex-config\n");
    return 1;
  }
  process.stdout.write('[features.code_mode]\ndirect_only_tool_namespaces = ["mcp__cheapag"]\n');
  return 0;
}
