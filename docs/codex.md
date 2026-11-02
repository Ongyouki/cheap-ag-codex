# Codex CLI integration

Milestone 1 adds an explicit Codex adapter to the existing cheap-ag MCP server. Codex plans, delegates implementation to a configured cheap OpenCode worker, and reviews the resulting diff, verification evidence, and risks. The worker engine, Git worktrees, consent, cost limits, verification, and uncommitted landing are shared with Claude Code.

The existing no-argument invocation with piped stdin still starts the Claude-compatible server. Terminal setup and Claude installation behavior are preserved. Use explicit client selection for Codex:

```sh
node /absolute/path/to/cheap-ag-codex/dist/index.js serve --client codex
```

`serve --client claude` selects the existing Claude behavior explicitly. Both clients expose the same six tools and input schemas: `ping`, `delegate`, `research`, `reply`, `jobs`, and `land`.

## Build and connect a local checkout

Project-scoped setup is opt-in: `cheapag codex setup --project /absolute/path/to/repo --dry-run` previews the configuration; omit `--dry-run` to create `.codex/config.toml`. The command binds the server to the canonical repository root, adds the file to Git's local exclude file, and checks that Git ignores it. Existing project configuration is never merged or overwritten; the command prints a manual integration example. Linked worktrees and temporary installations are refused. On failure, setup removes its added exclude line only if the file still matches the expected contents and identity; otherwise it leaves the file for manual review. Git's exclude does not prevent a deliberate `git add -f`.

`cheapag codex status --project /absolute/path/to/repo` reads the project configuration, executable paths, Git ignore state, and any exact-root trust entry in the selected `CODEX_HOME`. It does not launch Codex or an MCP server. Its output reports configuration evidence only: effective settings, inherited trust, managed configuration, and runtime connection are not verified.

Codex reads project settings only for trusted projects; setup does not change trust. Setup parses existing `config.toml` files in the selected `CODEX_HOME` (or default home) and ancestor project `.codex` directories without changing them. It refuses malformed or unsupported files, an existing cheapag registration, and any direct-only namespace entry because it cannot safely merge them. This conservative check cannot discover managed/system configuration, per-invocation overrides, other clients' homes, or changes made after setup; review effective routing in those cases. The exclude rollback checks identity and contents, but cannot lock out a simultaneous external writer between its check and truncation. An MCP process remains bound to its configured cwd; use a separate session for another repository. The developer reports independent M2.1a review and a trusted-profile Codex registration smoke test; status itself does not verify runtime behavior.

From the fork, with dependencies already installed:

```sh
npm run build
npm run typecheck
```

Use the absolute paths to Node and this checkout's `dist/index.js`; an upstream `npx cheap-agent` release does not contain these changes. This milestone does not install a Codex plugin, modify global Codex configuration, or install workflow skills.

For a manual connection, use a separate Codex home and place the following in its `config.toml`. Replace the example paths with actual absolute paths. Point `cwd` at a disposable Git repository for the demonstration.

```toml
[mcp_servers.cheapag]
command = "/absolute/path/to/node"
args = ["/absolute/path/to/cheap-ag-codex/dist/index.js", "serve", "--client", "codex"]
cwd = "/private/tmp/cheapag Codex demo/success repo"
startup_timeout_sec = 60
tool_timeout_sec = 300
env = { XDG_DATA_HOME = "/private/tmp/cheapag Codex demo/worker-home/data", XDG_CONFIG_HOME = "/private/tmp/cheapag Codex demo/worker-home/config", XDG_CACHE_HOME = "/private/tmp/cheapag Codex demo/worker-home/cache", XDG_STATE_HOME = "/private/tmp/cheapag Codex demo/worker-home/state" }
```

Launch Codex with `CODEX_HOME` pointing to that isolated directory. Do not overwrite an existing profile or copy authentication files into it automatically. Remove this registration by deleting its `[mcp_servers.cheapag]` entry from the isolated configuration; other registrations can remain unchanged.

The [Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) documents stdio command, arguments, working directory, environment, and tool timeouts. The default tool timeout is 60 seconds. The 300-second example is intended for the bounded, single-task demonstration below. General long batches can still outlive that timeout. After an ambiguous timeout, inspect the existing job; do not submit the same delegation again. A progress notification is not proof that the client will wait indefinitely.

## Opt-in direct MCP routing (M1.4)

With code mode, a long MCP call can incur executor and polling overhead. Direct routing exposes the cheap-ag namespace for direct tool calls, avoiding that extra path for cheap-ag. It changes Codex tool routing, not the shared worker engine, six MCP schemas, consent, verification, model selection, or Claude Code integration. The server must already be registered as `cheapag` to match the exact namespace `mcp__cheapag`.

**Tested version: Codex CLI 0.166.0**, from the developer's real demonstrations. Older and newer versions are unverified here; this code-mode setting may evolve. The [official configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) describes `features.code_mode.direct_only_tool_namespaces` as an array of namespaces restricted to direct tool calls. This recommendation does not enable or disable code mode globally.

From a built checkout, print the optional TOML:

```sh
node /absolute/path/to/cheap-ag-codex/dist/index.js codex-config
```

The command takes no arguments and prints exactly:

```toml
[features.code_mode]
direct_only_tool_namespaces = ["mcp__cheapag"]
```

The generator reads no configuration, writes no files, invokes no Codex/provider process, and grants no consent. It does not modify `~/.codex/config.toml`, a custom `CODEX_HOME`, or any MCP registration. Review its output before using it; do not redirect it over an existing config file or blindly append a duplicate TOML table.

For a single invocation, when the effective direct-only list is absent or empty, use this override (POSIX shell or PowerShell):

```sh
codex -c 'features.code_mode.direct_only_tool_namespaces=["mcp__cheapag"]'
```

The same `-c` argument can be passed to `codex exec` for an independently authorized task. [Codex CLI overrides](https://learn.chatgpt.com/docs/config-file/config-advanced#one-off-overrides-from-the-cli) accept dotted keys and TOML values and take precedence for that invocation. Omitting the argument on the next launch restores the underlying routing configuration.

**Preserve existing list entries:** this override replaces the entire `direct_only_tool_namespaces` array. If the effective configuration already lists other namespaces, retain all of them and add `"mcp__cheapag"` once to that array instead of using the one-entry override. For persistent opt-in, manually merge the key into the existing `[features.code_mode]` table in the intended profile, preserving its other keys, other namespace entries, and all `[mcp_servers.*]` tables. Only cheap-ag should gain direct routing. To undo a manual merge, remove only the entry you added. There is no automatic installer or configuration merger in M1.4.

### Evidence and verification

The developer reports completed real Codex → cheap-ag → DeepSeek demonstrations (M1.2) and these M1.3 measurements for the same medium-complexity Python task:

| Configuration | Codex tokens | Time | Held-out tests |
| --- | ---: | ---: | ---: |
| Codex only | 128,478 | 63.7s | 28/28 |
| Existing MCP routing | 183,944 | 67.1s | 28/28 |
| Direct MCP routing | 69,558 | 58.3s | 28/28 |

The original delegated run contained four `wait` calls. The optimized run contained zero `wait` calls, one `delegate` call, and two `exec` calls. These are single-run observations supplied by the developer, not guaranteed savings, repeated-trial statistics, or worker API billing measurements. The supplied results were not rerun or independently audited during M1.4. They motivate an opt-in routing setting; they do not establish M4's systematic benchmark acceptance or close independent review gates.

To verify without a provider call:

1. Check `codex --version` against the tested 0.166.0 release. Print `codex-config` and compare it with the exact TOML above; the complete block must have only that table and key. A TOML parser should produce `features.code_mode.direct_only_tool_namespaces` equal to `["mcp__cheapag"]`.
2. Review the intended profile and any overriding layers locally. Confirm that the server name is `cheapag`, other servers/settings remain intact, and existing direct-only entries are retained. The generator does not discover effective configuration or check installed-version support.
3. Run the offline regressions below, including `test/codex-config.test.ts` and `test/clients.test.ts`. They exercise the built CLI, repeatability, no file writes with fresh/existing isolated profiles, argument rejection, and unchanged Claude startup and all six MCP schemas. These checks establish emitted configuration and compatibility, not live routing.

Runtime confirmation requires a separately authorized live task: retain normal approvals, inspect the Codex tool trace for direct `mcp__cheapag` calls, and compare executor/polling events and matching cheap-ag job evidence. Zero `wait` calls is an observation from the optimized run, not an invariant; timeouts still require inspecting the existing job without duplicating delegation. No live verification is part of M1.4.

## Execution and consent

Codex-mode implementation requires at least one executable acceptance command for every selected group. Put commands in backticks in `done_when` or the plan's `done-when`, or configure `test_cmd`. Explicit commands take precedence over `test_cmd`. Missing checks fail before worker startup or job creation; `tests=none` is never verified success.

For example, a delegation can supply:

```text
task: Implement the requested behavior and its regression test
files: src/example.js, test/example.test.js
done_when: `node --test test/example.test.js` passes
```

The server runs the check in the worker's isolated worktree. Successful changes land uncommitted while preserving the developer's index and unrelated working-tree state. Codex may inspect the resulting diff and relevant files after success.

Codex jobs allow the existing bounded repairs on the same model. They do not switch models after provider limits or verification failures, including the separate turn-cap escalation path. Research also stops rather than changing models. Codex batches also persist their original integration command (`integration_cmd`, otherwise `test_cmd`), including an explicit null when neither was configured. Deferred verification and its fix job use that command even if current configuration changes or removes it. Older Codex batches with a pending check but no snapshot fail closed; legacy Claude batches retain their existing configuration behavior. Policy is captured for the job and persisted in its records and batch state; replies, retries, redo, and deferred integration fixes retain the restrictions. A later Claude session cannot relax a Codex-originated batch's policy.

Difficulty tiers select the initial configured model. They are not a failure fallback, and they can name different models if the developer configures them. Pin every implementation tier to the same approved cheap model for a demonstration:

```json
{
  "models": {
    "implement": "openrouter/deepseek/deepseek-v4.1-flash",
    "medium": "openrouter/deepseek/deepseek-v4.1-flash",
    "hard": "openrouter/deepseek/deepseek-v4.1-flash",
    "research": "openrouter/deepseek/deepseek-v4.1-flash",
    "fallback": []
  },
  "limits": { "max_minutes": 3, "max_cost_usd": 0.10, "max_parallel": 1 }
}
```

Repository consent remains a developer terminal action. An unapproved repository returns `CONSENT` before a worker call, job, or worktree. Neither Codex, an MCP tool, setup, nor the demonstration preparation grants it. After reviewing the recipient and model, the developer runs the local build themselves in the target repository, with the same worker XDG environment as the server:

```sh
/absolute/path/to/node /absolute/path/to/cheap-ag-codex/dist/index.js allow \
  --models openrouter/deepseek/deepseek-v4.1-flash
```

Provider and route changes still require the existing approval checks. OpenRouter requests retain `data_collection: deny`; `--zdr-only` retains the existing endpoint routing restriction.

On failure, exhaustion, or a partial result, review the evidence and retained worktree. Codex must not automatically apply it or take over implementation. An explicit `land apply` does not rerun the original verification commands; a batch's final apply or discard can trigger its integration check and a bounded fix job.

## Offline verification

The ordinary test suite skips real Codex/provider demonstrations unless explicitly enabled. It uses scripted workers and, in some existing suites, the bundled OpenCode with a local scripted model endpoint. Those checks do not make paid provider calls.

On macOS, run with live provider tests disabled and npm offline:

```sh
env -u CHEAPAG_LIVE -u CHEAPAG_CODEX_LIVE -u CHEAPAG_CODEX_PREPARE npm_config_offline=true npm test
npm run typecheck
```

The MCP tests require localhost listeners and process lifecycle permissions. A sandbox that denies those operations cannot provide the full integration baseline.

## Opt-in real demonstration

The developer reports completed real Codex-to-DeepSeek demonstrations; the reported evidence and its review limits are recorded above and in [CODEX_ROADMAP.md](CODEX_ROADMAP.md). No provider calls were made during M1.4. Any new live run still requires separate explicit authorization before external provider calls, authentication changes, or repository consent actions. Obtain that authorization before performing the authentication/consent steps below or enabling the live run. The demonstration must target disposable repositories, never cheap-ag source.

The runner in `test/codex-live.test.ts` has separate preparation and live modes. Preparation is offline and creates fresh fixture repositories, isolated homes, a manifest, and an evidence directory. It neither grants consent nor copies credentials.

From the fork, choose a new destination and a model available to the intended worker account:

```sh
cheapag_fork="$PWD"
cheapag_demo="/private/tmp/cheapag Codex demo 2026-10-31"
cheapag_model="openrouter/deepseek/deepseek-v4.1-flash"

CHEAPAG_CODEX_PREPARE=1 \
  CHEAPAG_CODEX_DEMO_DIR="$cheapag_demo" \
  CHEAPAG_CODEX_MODEL="$cheapag_model" \
  npm test -- test/codex-live.test.ts
```

The resulting root contains `success repo`, `failure repo`, `codex-home`, `process-home`, `worker-home/{data,config,cache,state}`, `manifest.json`, and `evidence`. The runner keeps this evidence for review.

The runner forwards only an explicit allowlist of process-launch essentials (PATH, OS shell locations, temporary-directory and locale/terminal variables). It fixes HOME/USERPROFILE, CODEX_HOME and XDG locations to the prepared root. Unrelated credentials, proxy variables, Node loaders, OpenCode overrides and other ambient configuration are not forwarded to Codex or its worker child. This process-environment isolation is not an OS sandbox and does not isolate system keychains or trusted executables on PATH.

After separate M1.2 authorization, the developer prepares authentication manually. Prefix authentication commands with `env HOME="$cheapag_demo/process-home" USERPROFILE="$cheapag_demo/process-home"` to use the same process home as the runner:

1. Sign into the isolated Codex profile:

   ```sh
   CODEX_HOME="$cheapag_demo/codex-home" codex login
   ```

   Codex subscription sign-in and cheap-worker authentication are separate. A Codex subscription does not require an OpenAI API key solely for the orchestrator and does not pay for OpenRouter or another worker provider. See [Codex authentication](https://developers.openai.com/codex/auth).

2. Find the pinned OpenCode binary from the fork:

   ```sh
   node --input-type=module -e 'import {opencodeBinary} from "./dist/opencode.js"; console.log(opencodeBinary())'
   ```

   Use that binary's `auth login` flow with all four XDG variables set to the fixture's worker home. Save the chosen worker provider login there. Do not disclose or automatically copy credential contents. For example, replace `/absolute/path/to/pinned/opencode` below with the printed path:

   ```sh
   XDG_DATA_HOME="$cheapag_demo/worker-home/data" \
     XDG_CONFIG_HOME="$cheapag_demo/worker-home/config" \
     XDG_CACHE_HOME="$cheapag_demo/worker-home/cache" \
     XDG_STATE_HOME="$cheapag_demo/worker-home/state" \
     /absolute/path/to/pinned/opencode auth login
   ```

3. Review each fixture and grant its exact model consent yourself. Run the following separately from inside `success repo` and `failure repo`, preserving the variables set above:

   ```sh
   XDG_DATA_HOME="$cheapag_demo/worker-home/data" \
     XDG_CONFIG_HOME="$cheapag_demo/worker-home/config" \
     XDG_CACHE_HOME="$cheapag_demo/worker-home/cache" \
     XDG_STATE_HOME="$cheapag_demo/worker-home/state" \
     node "$cheapag_fork/dist/index.js" allow --models "$cheapag_model"
   ```

Only after the live demonstration has been explicitly authorized, return to the fork and run:

```sh
CHEAPAG_CODEX_LIVE=1 CHEAPAG_CODEX_DEMO_DIR="$cheapag_demo" \
  npm test -- test/codex-live.test.ts
```

Live mode requires the prepared manifest, unchanged pinned configuration/caps, and consent for exactly the selected model. It invokes the actual `codex exec --json` CLI using the isolated profile, a read-only shell sandbox, and per-call stdio MCP configuration. Keep normal approvals enabled and ensure the intended cheapag MCP tools are permitted; the runner does not bypass approval or hook trust. The MCP working directory is a fixture subdirectory. The bounded run uses a 300-second MCP tool timeout, a three-minute worker cap, a $0.10 per-job cost cap, and one parallel worker. Worker limits do not bound Codex subscription usage or provide a hard provider billing ceiling.

The runner saves Codex JSON events, stderr, before/after snapshots, and matching job evidence under `evidence`. Review this evidence to establish that:

- Exactly one delegation was submitted for each case, using the pinned worker model.
- The success case independently passed a nonempty server check, landed the expected code and test uncommitted, and preserved HEAD, index, and unrelated fixture state.
- The negative case could not satisfy its deliberately impossible acceptance condition after bounded same-model repairs, retained its worktree and failing evidence, and left the main fixture unchanged.

A negative demonstration passes only when the exact acceptance command fails with exit code 1 on all three attempts (initial run and two repairs), with no model switch. A missing tool, early cap, unanswered worker question, or other interruption is incomplete evidence. Inspect it before deciding whether another separately authorized fixture run is needed.

A fake MCP client alone does not establish actual Codex orchestration. Ambiguous timeouts must be investigated through the existing job records rather than retried as a second delegation. The runner does not remove the fixture or authentication directories automatically; retain or remove that isolated state yourself after reviewing the evidence.

## Current limits

Earlier macOS version/help probes used 0.163.0. The developer's later direct-routing demonstrations tested CLI 0.166.0. Only the latter is the tested version for this routing recommendation; other releases and environments need separate validation.

Windows-specific fixture repairs are deferred. Node 22 and Ubuntu/Windows validation remain unverified in this macOS implementation session. Installer distribution, hooks, native-agent takeover, linked-worktree consent repair, and systematic cost-savings benchmarks remain outside this focused routing change. M1.4 is implemented with offline verification recorded in the roadmap; independent review is pending.
