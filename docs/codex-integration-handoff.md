# Codex CLI integration handoff

## 2026-11-01 — Targeted M1.2 MCP environment repair

The developer reports that Codex now invokes cheap-ag MCP tools, but delegation fails with `no worker provider`, despite offline provider discovery finding `openrouter` in the isolated worker profile. The runner previously supplied XDG paths only to the Codex parent process. `test/codex-demo-env.ts` now builds the per-invocation MCP configuration with an explicit server `env` table containing all four isolated XDG paths, plus the isolated `HOME`, `USERPROFILE`, and `CODEX_HOME`. The configuration includes no inherited credentials or unrelated environment variables. `test/codex-live.test.ts` uses this helper and preserves the existing delegate/jobs approval settings, read-only sandbox, 300-second tool timeout, and worker spending limits.

Offline regressions check the actual configuration's environment table and preserved tool settings, including paths with spaces, quotes, and backslashes. This repair does not establish live provider success or complete M1.2. No live test, model call, authentication change, or repository consent action is authorized by this repair request.

Verification on macOS: targeted environment/configuration tests **4 passed**; full offline suite **433 passed, 0 failed, 8 skipped** (441 tests, 32 files); build, type-check, and `git diff --check` passed. The initial sandbox suite attempt failed with localhost `listen EPERM` errors and resulting timeouts (242 failed, 122 passed, 77 skipped); the successful full run used approved localhost/subprocess permissions. `CHEAPAG_LIVE` was unset and both Codex preparation/live flags were disabled for the full runs. The eight skips cover five live-provider tests and three Codex preparation/live cases. No live/provider calls were made.

## Resume here — M1.1

Read [AGENTS.md](../AGENTS.md) and [CODEX_ROADMAP.md](CODEX_ROADMAP.md) first. The current approved task is documentation closeout; implementation is not authorized by this handoff update. The independent review findings are still open for M1.1 status, although the current uncommitted tree already contains candidate changes and tests for them. Start by inspecting those exact changes against the findings, then make only targeted corrections if the evidence requires them:

1. Ensure the live runner's actual Codex/worker subprocess environment is an explicit minimal allowlist and excludes unrelated inherited provider credentials/configuration. Regression tests must use synthetic secrets and a stub child, never real credentials or provider calls.
2. Ensure each Codex batch snapshots its original executable integration check (including an explicit no-check value) and deferred checks/fix jobs use that snapshot after config changes/removal. Define conservative behavior for legacy records without the snapshot and prove Claude behavior is unchanged.

**M1.1 acceptance:** targeted regressions reproduce and resolve both findings; cover original `integration_cmd`/`test_cmd` fallback, replacement/removal, no-check, missing legacy metadata, and deferred fix persistence; environment projection is verified at the child boundary. Then run relevant tests, full offline suite, build, and type-check. Report actual skipped/unrun cases. Do not run M1.2. Stop for independent ChatGPT review before proceeding.

## Current project state

- Roadmap: [CODEX_ROADMAP.md](CODEX_ROADMAP.md). M1.0 offline core is implemented/tested. M1.1 is pending acceptance and independent review. M1.2 is pending, untested, and separately authorization-gated. M1 is not complete.
- Architecture: one shared cheap-ag MCP/job engine with explicit thin Claude/Codex client profiles. Existing six MCP tool names/schemas and Claude-compatible no-argument server startup are preserved. OpenCode remains the cheap worker, with isolated worktrees, consent, caps, verification, and uncommitted landing.
- Codex policy: executable checks required; same-model repairs bounded; no automatic model switching or expensive fallback; policy persists across jobs/retries/deferred fixes. These are local implementation claims to verify against source/tests, not live-provider proof.
- Independent-review findings pending M1.1: (1) prevent unrelated inherited credentials/configuration reaching live runner subprocesses; (2) preserve the originally selected verification command for deferred integration. `land apply` is a known limitation: it can apply retained changes without rerunning original verification commands.
- Real Codex → cheap-ag → external-worker workflow has **not** been verified. Candidate live tests are gated; do not enable or run them as part of M1.1.

## Current checkout and verification

- Branch: `feature/codex-support`; HEAD: `c2f97a0f8487a69b4e35530da390851d7fb90660` (`Initial analysis handover`), tracking `origin/feature/codex-support` at the recorded checkpoint.
- The working tree is dirty. Uncommitted tracked source changes: `src/consent.ts`, `src/index.ts`, `src/jobs.ts`, `src/research.ts`, `src/server.ts`, `test/harness.ts`; tracked documentation change: this handoff. Untracked implementation/docs/tests include `AGENTS.md`, `docs/CODEX_ROADMAP.md`, `docs/codex.md`, `src/clients.ts`, `test/clients.test.ts`, `test/codex-demo-env.ts`, `test/codex-demo-env.test.ts`, `test/codex-live.test.ts`, and `test/codex.test.ts`. `.review/` contains untracked on-demand review artifacts and ZIPs. Check `git status` before any work; do not discard or overwrite these local changes.
- Last successful M1.1 candidate verification (macOS, offline, live modes disabled): targeted Codex/batch/landing tests **62 passed**; environment tests **2 passed**; full suite **431 passed, 0 failed, 8 skipped** (439 tests, 32 files, 39.68 seconds); build, type-check, and `git diff --check` passed. This proves only the exercised local/fake-worker paths, not live Codex/provider behavior. M1.0 earlier full run: 425 passed, 8 skipped; pre-M1 macOS baseline: 388 passed, 5 skipped. Do not rerun historical diagnosis unless new evidence requires it.
- Review ZIPs and reports under `.review/` are local only. Ignored `.cheapag/` test evidence is also local and may not exist in another clone.

**Approval boundaries:** no commit, push, publication, paid provider call, authentication change, or repository consent action without explicit developer approval. M1.2 requires separate authorization before any external provider calls, authentication changes, or repository consent actions, including setup. Never use this source repository as the demonstration worker target. No provider calls, credentials, consent, commits, or pushes were changed in the recorded M1.1 session.

## Historical M1.0 macOS implementation checkpoint

Updated 2026-10-31 after the user approved Milestone 1, explicitly deferring the Windows fixture repairs and withholding authorization for paid provider calls or a real Codex-to-worker demonstration.

- Branch `feature/codex-support`, HEAD `c2f97a0` (`Initial analysis handover`). Implementation changes are uncommitted; no project commits, pushes, or publication were performed.
- Recovered macOS baseline: build/typecheck passed; **388 passed, 0 failed, 5 skipped** (393 tests). The prior attributable Windows run remains **348 passed, 24 failed, 21 skipped**, rather than the historical unsupported count of 21 failures.
- Implemented one shared engine with explicit `serve --client codex|claude` selection. Legacy piped no-argument startup, Claude instructions/metadata, and all six MCP tool input schemas are preserved.
- Added isolated Codex policy: executable verification before implementation startup; bounded same-model repairs; no fallback/escalation model switching; verification exit evidence; policy persisted in job/research/batch records and retained across reply, redo, and deferred integration, including a later Claude host. Codex runtime state resolves to the repository root when launched from a subdirectory.
- Production changes are limited to new `src/clients.ts` and existing `src/index.ts`, `src/server.ts`, `src/consent.ts`, `src/jobs.ts`, `src/research.ts`. No new dependencies or engine rewrite.
- Added `test/clients.test.ts`, `test/codex.test.ts`, opt-in `test/codex-live.test.ts`, and two optional harness arguments for client selection and spaced fixture paths. Windows-specific fixture repairs remain deferred.
- Offline verification: build and typecheck passed; **425 passed, 0 failed, 8 skipped** (433 tests, 31 files), 38.23 seconds in the final run. The eight skips are five existing live-provider tests plus three preparation/live-demonstration cases. The separate offline preparation case also passed, creating disposable fixtures without credentials, consent, or provider calls. The completed suite ran with required localhost/process permissions, npm offline, and both live modes disabled.
- Installed macOS `codex` is **0.163.0**. Version/help and per-invocation MCP configuration parsing were checked, including a spaced subdirectory and a 300-second tool timeout. Actual orchestration and authentication remain unverified; do not substitute the prior Windows 0.166.0 probe as macOS proof.
- Manual setup, policy behavior, remaining limits, and the gated demonstration procedure are documented in [codex.md](codex.md). Local ignored test evidence is in `.cheapag/milestone-1-macos/`; it is not guaranteed to travel to another clone.
- This is historical M1.0 status. The current next action is M1.1 as defined in “Resume here” above; do not begin the real demonstration until M1.1 review passes and the separate M1.2 authorizations are granted. Ubuntu/Windows and Node 22 validation remain pending for M3.

The remaining sections preserve the earlier Windows research and planning checkpoint. Their statements that implementation is pending or the handoff is untracked describe that historical checkpoint, superseded by the status above and the user's later approval.

Updated: 2026-10-31 after the baseline-diagnosis and Milestone 1 planning session. Repository: `C:\Users\MAD\Documents\Projects\cheap-ag-codex`.

## Read this first: scope and authorization

The project is a fork of `muaaz9329/cheap-ag` intended to add first-class OpenAI Codex CLI support alongside Claude Code.

The first session was research and architecture planning only. In the subsequent session, the user **approved the general architecture** of one shared cheap-ag engine with thin Claude Code and Codex adapters. They authorized baseline testing/diagnosis and finalization of a minimal Milestone 1 plan, and explicitly required a stop for approval before implementation.

**Current checkpoint: baseline diagnosis and the concrete Milestone 1 plan are complete; approval of the focused fixture repairs and implementation scope is still pending.** The latest user request authorizes updating this handoff so they can resume in Codex CLI. It does not approve implementation. Do not repeat the completed diagnosis unless new evidence warrants it, and do not ask the user to approve the general architecture again.

No integration code, source tests, or configuration have been changed. The existing pretest script rebuilt ignored `dist/`; diagnostic evidence and planning artifacts were written under already-ignored `.cheapag/baseline-2026-10-31/`. This handoff remains untracked. HEAD is unchanged at `abe39a81f7e73a55f17493695d1138a98c7bce4c`. Do not implement, refactor, install integrations, alter authentication/global configuration, commit, push, or publish based on this document-only request.

The user's approved architecture decisions are:

1. Preserve existing Claude Code functionality.
2. Reuse the MCP server, OpenCode workers, Git worktrees, verification and integration mechanisms.
3. Add Codex as a separate first-class client.
4. Codex plans, delegates, makes architectural decisions and reviews.
5. Cheap models implement.
6. Repository consent stays developer-controlled.
7. Report worker failure/budget exhaustion to Codex; do not automatically invoke an expensive fallback model.
8. Successful verified work lands uncommitted, and Codex reviews the resulting changes and risks.
9. Defer Codex hooks, advanced multi-agent orchestration and sophisticated fallback until the basic integration is proven.
10. Preserve Windows compatibility.

The finalized plan conservatively proposes disabling all automatic model-switch fallbacks and stronger-worker escalation for Codex, while retaining bounded same-worker repairs. This concrete execution policy and fixture repair scope are part of the pending implementation approval. Claude's existing fallbacks stay intact.

The user additionally requires **disposable Git repositories for the end-to-end demonstration**, with cheap-ag source never used as the worker's test target, and explicitly prohibits commits, pushes and publication of project changes.

Evidence labels used below:

- **Confirmed by inspection**: observed in repository source or tests during the research session.
- **Confirmed by documentation**: described in official OpenAI documentation fetched during that session; actual installed-version compatibility remains to be tested.
- **Confirmed by execution**: observed in the authorized baseline tests, controlled reruns or disposable-repository probes; scope and environment are recorded below.
- **User-reported**: information supplied by the user, without supporting output available in the conversation.
- **Proposal**: recommended design or future work, not implemented or approved.
- **Unresolved**: requires evidence, a compatibility test, or a user decision.

## Goals and requirements

The intended workflow is:

1. Codex handles planning, architecture, decomposition, orchestration, and review.
2. Cheap models, such as DeepSeek through OpenRouter, perform most implementation through the existing OpenCode worker.
3. Reuse the MCP server, job lifecycle, Git worktrees, verification, consent, permissions, and cost controls.
4. Preserve existing Claude Code functionality and installation behavior.
5. Provide a straightforward Codex installation and setup experience.
6. Support Codex's ChatGPT subscription authentication where available, without requiring an OpenAI API key solely for the orchestrator.
7. Support Windows where practical.

Constraints: avoid unnecessary refactoring and duplicated engines; preserve consent, security, and verification mechanisms; verify Codex capabilities rather than assuming parity with Claude Code. Do not promise Codex cost savings based on existing Claude benchmarks.

## Repository snapshot and research performed

**Confirmed by inspection at research time:**

- HEAD: `abe39a8` (`test(commandcode): presets, roles and the generated provider config; README lists Command Code`).
- npm package: `cheap-agent`, version `1.2.5`; executable: `cheapag`.
- TypeScript ESM project; package engine requirement is Node `>=20.11`; CI uses Node 22.
- Dependencies include MCP SDK `^1.32.1`, OpenCode SDK `1.19.0`, OpenCode `1.19.0`, and Zod.
- `src/` contains the CLI, MCP server, execution engine, and platform helpers. `plugin/` contains the existing Claude plugin.
- There are **28 `test/*.test.ts` files**, plus test helpers and fixtures.
- CI runs Ubuntu and Windows, a packaged CLI smoke check, and optional live provider tests.
- The checkout was clean before initial creation of this document. The first research session ran no builds/tests. The subsequent authorized diagnosis rebuilt `dist/`, ran the suite/typecheck and targeted probes, and wrote ignored local evidence; no tracked source/test/config changes or paid model jobs were made.

Source inspection covered the architecture, plugin manifests and skills, hooks, configuration, CI, benchmark harnesses, all test-file inventories, and representative test implementations. Deeper reads covered consent, worktrees, delegation, verification, routing, installation, hooks, and real OpenCode permission tests. The initial findings were static inspection; later runtime evidence is limited to the diagnosis described next, not certification of Codex integration.

## Baseline diagnosis: 21 reported historically, 24 reproduced

**Completed authorized diagnosis, no fixes applied.** The previous user-reported count was 21, without failure logs. The attributable full run produced **393 tests: 348 passed, 24 failed, 21 skipped**, plus **one unhandled MCP connection-closed rejection**. Test files: 10 failed, 17 passed, 1 skipped; duration 386.30 seconds. Do not confuse the 21 skipped cases with failures, or claim an exact match to the historical 21.

### Reproduction environment and command

- Commit: `abe39a81f7e73a55f17493695d1138a98c7bce4c`; package `cheap-agent` 1.2.5.
- Windows 11 Home 10.0.26100 x64, PowerShell; Node 26.13.0; npm 11.20.0; Git 2.53.0.windows.1; Git Bash 5.2.37; OpenCode/SDK 1.19.0; Vitest 5.0.4; TypeScript 7.0.2. Dependencies were already installed; no dependency installation was performed for the diagnosis.
- Effective `core.autocrlf=true`. The source repository has `* text=auto eol=lf` in `.gitattributes`; temporary fixture repositories do not inherit it.
- `npm.cmd` was used because PowerShell execution policy blocks `npm.ps1`; no execution policy was changed.
- Installed Codex CLI: **0.166.0**. Version, MCP add/get help, exec help and login status were probed. Login status reported **not logged in**. No actual Codex orchestration or paid worker run occurred.
- `npm.cmd run typecheck` passed; the full run's `pretest` build passed.

With `CHEAPAG_LIVE` cleared for the process:

```text
npm.cmd test -- --reporter=default --reporter=json --outputFile=.cheapag/baseline-2026-10-31/results.json
```

The 21 skips are 16 Windows-skipped login/PTY cases and 5 opt-in paid live cases. Some deterministic tests spawn real bundled OpenCode against a scripted local model; this is not live provider/model usage.

### Root causes and evidence

| Category | Failures | Diagnosis |
| --- | ---: | --- |
| LF-only fixture assertions with inherited `core.autocrlf=true` | 19 | Git lands correct content with CRLF. A process-local LF override resolves every affected case without source changes. Test fixture hermeticity/portability issue, not evidence that landing failed. |
| Sandbox process inspection/termination restrictions | 3 | Two jobs verify-cancel/timeout tests and normal OpenCode shutdown fail under restrictions. All pass outside the sandbox. |
| Unix-style PATH in Windows crash/restart fixture | 1 | `test/opencode.test.ts` joins the Windows Node path with `/usr/bin` and `/bin` using `:`. Under this PATH, `taskkill` fails `ENOENT`, leaving the profile locked. The native fixture still fails cleanup; an isolated full-PATH crash/restart probe passes with distinct child PIDs and no survivors. |
| Undeclared tools/network/cache dependencies in permission fixture | 1 | `npx eslint`, `tsc` and `prettier` try to resolve packages absent from fake dependencies, each stalling about 71 seconds with cache permission errors. The native offline rerun finishes in 24.23 seconds and exposes missing `make`: final `make.out` assertion fails; Git Bash confirms `make: command not found`. |

The 19 line-ending cases occur in `delegate` (6), `land` (5), `workspace` (2), `verify` (2), `repro` (1), `reply` (1), `routing` (1), and `jobs` (1). The crash/restart case also encountered blocked CIM queries in the initial run; the disjoint table attributes it to its independently proven malformed-PATH defect.

Controlled reruns/probes:

1. Process-only `core.autocrlf=false` via appended `GIT_CONFIG_COUNT`/`KEY`/`VALUE`, without Git configuration file changes: six suites (`delegate`, `workspace`, `land`, `repro`, `verify`, `reply`) **80/80 pass**.
2. Native rerun outside sandbox, same LF override: `jobs`, `routing`, `opencode` **61/62 pass**. All 26 jobs and 20 routing cases pass. Normal shutdown passes. Only malformed-PATH crash/restart cleanup remains failing.
3. Separate disposable Git probes: worker `after\n` lands as `after\r\n` with autocrlf true and `after\n` with false; both preserve HEAD/index. Full-PATH crash/restart returns two OK health results and leaves both children stopped.
4. Permission native/offline rerun confirms the missing `make` prerequisite after removing npm network/cache delays. It tests permission status, not successful exit codes for all probes; failed npx commands can still count as allowed.

The permission fixture also builds an unquoted Windows `git -C C:\...` command that Bash misinterprets, and recognizes only `/...` absolute write paths. These weaken test fidelity; they do not demonstrate a product permission bypass.

The unhandled rejection appeared after interrupted jobs tests and did not recur in the native jobs run. An outstanding delegate promise is a plausible explanation, not a separately proven defect. Do not claim every Windows crash path is certified: the normal-PATH probe isolates this fixture failure, while README beta caveats still apply.

### Focused repairs proposed, approval pending

- `test/harness.ts`: pin LF locally in disposable fixture repositories, retaining exact assertions; do not change global Git settings or force user projects to LF.
- `test/opencode.test.ts`: correct Windows PATH construction and retain required Node/Git/system utilities while proving the bundled OpenCode is used; do not mask cleanup failures or merely increase timeouts.
- `test/permissions.test.ts`: deterministic local shims for permission-only command probes, isolated caches/no registry access, explicit availability checks for real make behavior, and focused Windows path corrections. Preserve real OpenCode enforcement and denial assertions.
- Run lifecycle checks with the necessary process rights; do not weaken assertions to accommodate sandbox denials.

These results support fixture repairs, not a broad production landing/verification rewrite. **No full corrected green suite has been established**: fixes are unimplemented. CI's Node 22 and Ubuntu were not reproduced locally; paid live checks remain untested.

Eight test-owned OpenCode processes survived restricted or malformed-PATH cleanup. Their known PIDs, executable paths, localhost serve commands and creation times were verified before terminating only those processes outside the sandbox. A pre-existing OpenCode process was left alone. Temporary evidence repositories/profiles were retained; no recursive user-directory cleanup was performed.

### Local evidence locations

All files below are under `.cheapag/baseline-2026-10-31/`, already ignored by Git and available in this same checkout. **They are not committed or guaranteed to travel to another clone.** This handoff includes the essential diagnosis and plan so it can stand alone.

| Artifact | Contents |
| --- | --- |
| [baseline-diagnosis.md](../.cheapag/baseline-2026-10-31/baseline-diagnosis.md) | Detailed diagnosis and full observed failing-test inventory. |
| [milestone-1-plan.md](../.cheapag/baseline-2026-10-31/milestone-1-plan.md) | Concrete implementation plan presented for approval; reproduced below. |
| `environment.json`, `results.json`, `suite.log` | Recorded environment and full initial run. |
| `lf-results.json`, `lf-suite.log` | Six-suite LF rerun. |
| `native-results.json`, `native-suite.log` | Native jobs/routing/OpenCode rerun. |
| `permissions-native-results.json`, `permissions-native.log`, `permissions-bash-evidence.json` | Offline permission rerun and original test-owned tool records. |
| `line-ending-probe.json`, `path-probe.json`, `restart-probe.json`, `restart-probe.mjs` | Disposable landing/PATH/lifecycle probes and restart script. |

Do not rerun the suite for this handoff update. Future authorized runs should compare against recorded cases and distinguish new regressions from documented environment failures.

## Confirmed architecture

```text
Orchestrator (currently Claude Code)
  -> stdio MCP server
     -> consent and model routing
     -> job engine
        -> isolated Git worktree
        -> OpenCode session -> cheap provider/model
        -> verification / self-fixes / stronger-worker escalation
        -> locked three-way landing, uncommitted
     -> compact result block and persisted job records
```

### Platform-independent engine

| Files | Responsibilities and relevant facts |
| --- | --- |
| [src/jobs.ts](../src/jobs.ts) | Delegation, inline tasks and plan groups, batches, scheduling, questions, caps, verification, self-fixes, escalation, redo, job records, recovery, reply, cancellation, and landing coordination. |
| [src/worker.ts](../src/worker.ts) | OpenCode SDK sessions, event streams, finish reports, usage, permission-request rejection, questions, aborts, and directory disposal. |
| [src/opencode.ts](../src/opencode.ts) | Pinned bundled OpenCode binary, generated worker/research agents and finish tool, secrets-filter plugin, localhost server, health checks, lazy boot/restart, and shutdown. |
| [src/workspace.ts](../src/workspace.ts) | Repository discovery, detached worktrees, dirty-state snapshots, untracked-file carryover, dependency links, diff extraction, landing lock, three-way apply, conflict handling, and cleanup helpers. |
| [src/verify.ts](../src/verify.ts) | Executable `done-when` extraction, fallback `test_cmd`, verification processes, timeouts/abort, environmental failure classification, and concise error tails. |
| [src/plan.ts](../src/plan.ts) | Plan parsing, grammar validation, step grouping, dependency ordering, and overlap detection. |
| [src/permissions.ts](../src/permissions.ts) | Worker/research rulesets, protected paths, hard command denials, allowed test/project commands, and rejection guidance. |
| [src/routing.ts](../src/routing.ts) | Models/presets, difficulty tiers, provider-limit fallback, stronger-worker escalation eligibility, OpenRouter privacy options, and user-wide spend ledger. |
| [src/research.ts](../src/research.ts) | Research in a disposable worktree, scope/ref validation, confidence and reproduction evidence, partial recovery, and research records. |
| [src/report.ts](../src/report.ts) | Pure rendering of `cheapag/1` job, batch, research, and consent result blocks with output budgets. |
| [src/cleanup.ts](../src/cleanup.ts) | Retention, live-job protection, worktree/log cleanup, and gitignore hint. |
| [src/credentials.ts](../src/credentials.ts) | Supported provider detection from saved OpenCode logins and output redaction. |
| [src/consent.ts](../src/consent.ts), [src/allow.ts](../src/allow.ts) | Provider/model-bound repository consent, route-change reapproval, model filtering, ZDR handling, and developer CLI approval. Wording contains Claude assumptions. |

The core has no dependency on Claude's API for implementation. OpenCode drives the cheap models independently of the orchestrator.

### Claude-specific and mixed components

| Files | Coupling |
| --- | --- |
| [src/index.ts](../src/index.ts) | Terminal/no-argument setup behavior and CLI dispatch. Piped no-argument invocation starts MCP. Unknown commands currently fall through to serving. |
| [src/server.ts](../src/server.ts) | Standard MCP handlers mixed with Claude/Sonnet instructions, Claude slash-command guidance, and `anthropic/alwaysLoad` metadata. |
| [src/login.ts](../src/login.ts) | Reusable provider login/preset/live-check flow followed by hardcoded `claude mcp` registration and plugin installation. |
| [src/install.ts](../src/install.ts) | Generated Claude marketplace/plugin and cross-platform launcher. It removes the plugin's MCP entry because setup registers MCP separately. Stable Node lookup and launcher mechanics are potentially reusable. |
| [src/hook.ts](../src/hook.ts) | Claude hook JSON, edit tools/inputs, `prompt_id`, child-agent exemptions, Sonnet handoff, takeover call limits, and suppression of repeated tests after an OK. |
| [src/config.ts](../src/config.ts) | Mostly core settings; top-level `hard_tasks` and `takeover` include Claude-specific `sonnet` policies. |
| [src/rules.ts](../src/rules.ts) | Shared workflow wording plus explicit Claude Agent/Sonnet takeover and restrictive OK-review guidance. |
| [src/status.ts](../src/status.ts) | Core jobs/consent/spend reporting plus Claude transcript prefix/cache parsing under Claude's profile. |
| [src/platform.ts](../src/platform.ts) | Reusable junctions, process termination, executable lookup, Git Bash, and `.cmd` handling; recognizes `CLAUDE_CODE_GIT_BASH_PATH`. |
| [plugin/](../plugin/), [.claude-plugin/marketplace.json](../.claude-plugin/marketplace.json) | Claude plugin manifests, MCP entry, hooks, and skills/commands. |
| [bench/](../bench/) | Claude CLI invocation, flags, transcript parsing, token/cost accounting, dashboards, and SWE-bench orchestration. Task fixtures, hidden grading tests, and worker metrics are reusable. |
| [README.md](../README.md), [package.json](../package.json), assets | Claude-focused setup, descriptions, examples, and benchmark claims. |

Comments mentioning Claude in otherwise generic code do not themselves justify refactoring.

### Existing behavior and boundaries to preserve

- `delegate` and `research` check consent before starting their work or sending project code to a worker. No MCP approval tool exists.
- Consent lives in `.cheapag/consent.json`; the developer approves through `cheapag allow`. Consent is provider/model-route aware.
- Worker provider keys stay in OpenCode's store. Product provider detection does not use `OPENROUTER_API_KEY` as its credential source; test harnesses may seed saved logins from environment variables.
- Routing supports OpenCode Go, OpenRouter, DeepSeek, and Command Code. Models for a different provider than the active provider are ignored by the current route resolver.
- OpenRouter requests deny data collection; ZDR-only consent adds ZDR endpoint routing. Preserve these options on all relevant models.
- Every implementation group uses a detached worktree under `.cheapag/worktrees/`. Dirty tracked changes and untracked non-ignored files are carried over.
- Dependencies are linked from the checkout, using Windows junctions where appropriate; build-output directories must not be linked. See [ADR-0003](adr/0003-always-worktree-with-symlinked-deps.md).
- Successful work lands uncommitted while preserving the developer's index. Failed/capped work retains its worktree. Explicit `land apply` can apply retained work.
- Worker rules deny installs, protected-file edits, dangerous Git operations, external-directory access, and other capabilities. Unanswered OpenCode permission requests are rejected rather than left hanging.
- These worker rules are guardrails, **not an OS sandbox**: allowed tests/project code can execute with the process user's access. Shared dependency caches can also be written by scripts.
- Default limits include 25 worker tool turns, 20 working minutes, $0.50 per job, 3 parallel groups, 60 blocked minutes, and 15 takeover calls. Difficulty scales implementation turn limits; stronger-worker escalation has additional bounded handling.
- Batches serialize overlapping scopes and respect dependencies, land in step order, and can run an integration check/fix job.
- Jobs and blocked sessions belong to their originating MCP server process. Another session can inspect records but cannot necessarily resume or cancel that live session's job.
- Recovery preserves jobs owned by another live process; abandoned running/blocked jobs become cancelled.
- Worker output must remain data, not instructions.

### Verification caveats confirmed in source/tests

Do not repeat the README's strongest claims without these qualifications:

- A job can return `OK tests=none` when no executable conditions or configured `test_cmd` exist.
- Reproduction proof is recorded as `fail→pass`, `unverified`, or `none`. Failure to prove reproduction can yield a risk without blocking landing.
- Plain-text `done-when` requirements are not mechanically proven by command execution.
- `land apply` applies retained work without rerunning the original verification commands.
- Current Claude instructions say not to reread an OK job's diff/test or rerun its tests. The user's Codex goal includes review; the proposed Codex policy needs to distinguish reviewing evidence/risks from redundant reimplementation/testing.

## Codex research: official documentation

The following pages were fetched during the research session on 2026-10-31. Recheck relevant contracts before implementing version-sensitive functionality. Documentation support is not proof that a user's installed CLI version supports it.

| Topic | Confirmed documented capability | Source |
| --- | --- | --- |
| MCP | Local stdio and HTTP servers, server `instructions`, environment configuration, user/project configuration, tool policies, and configurable timeouts. | [MCP](https://developers.openai.com/codex/mcp) |
| MCP CLI | `codex mcp` manages registrations; documented get/list support JSON output. | [Developer commands](https://learn.chatgpt.com/docs/developer-commands#codex-mcp) |
| Skills | Required name/description in `SKILL.md`; explicit `$skill` and implicit invocation; `.agents/skills` discovery; optional `agents/openai.yaml`. | [Skills](https://developers.openai.com/codex/skills) |
| Instructions | Global and hierarchical project `AGENTS.md` discovery; overrides and size limits. Global instructions/config follow `CODEX_HOME`. | [AGENTS.md](https://developers.openai.com/codex/guides/agents-md) |
| Hooks | Session/tool lifecycle hooks; non-managed hooks require review/trust; shell, patch, MCP, and many local function tools are covered, with exceptions. | [Hooks](https://learn.chatgpt.com/docs/hooks) |
| Subagents | Native agents and custom TOML agents; parent permissions, provider, and MCP configuration are inherited. | [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) |
| Authentication | ChatGPT subscription sign-in and API-key sign-in are separate supported local-client paths; `codex login status` reports the active method. | [Authentication](https://developers.openai.com/codex/auth) |
| Non-interactive runs | `codex exec --json` supplies events including MCP tool calls and usage; saved CLI authentication is reused by default. | [Non-interactive mode](https://developers.openai.com/codex/noninteractive) |
| Windows | Native CLI/PowerShell operation and Windows sandbox implementations are documented. | [Windows](https://developers.openai.com/codex/windows) |
| Plugin packaging | Codex supports plugin assets and hooks, but public distribution has restrictions; hook installation does not automatically establish trust. | [Plugin MCP and lifecycle hooks](https://developers.openai.com/plugins/build/plugins#bundled-mcp-servers-and-lifecycle-hooks) |

Important details:

- MCP configuration normally lives in `~/.codex/config.toml`; trusted projects can use `.codex/config.toml`.
- The documented MCP tool timeout default is **60 seconds**. Cheap-ag jobs can run much longer. Do not assume progress notifications keep a request alive indefinitely.
- MCP server instructions are supported; the docs recommend keeping the first 512 characters self-contained.
- Skills are discovered from repository and user `.agents/skills` locations. `allow_implicit_invocation: false` disables implicit skill selection; it is not proof of a security-enforced user-only consent action.
- Do not assume Claude frontmatter (`allowed-tools`, `disable-model-invocation`), `$ARGUMENTS`, or embedded command-execution syntax have identical Codex semantics.
- Native Codex agents inherit the provider. They are not a drop-in way to run cheap OpenRouter workers on a ChatGPT subscription.
- ChatGPT authentication does not pay for OpenRouter/other worker calls. Worker credentials and orchestrator authentication remain separate.
- Installed CLI 0.166.0 is the initial proposed compatibility target, based on actual version/help probes. No minimum older version is established and no actual Codex-to-cheap-ag integration smoke test has run. MCP and authentication documentation were fetched again during diagnosis; actual orchestration remains unproven.

## Approved architecture and technical decisions

**General architecture approved; detailed implementation pending approval.** The user accepted one shared engine with thin client adapters and the role/consent/review/failure boundaries at the top of this document. The concrete minimal file and test plan is below; broader installation and optional features remain deferred.

```text
Claude Code adapter --+
                     +--> existing MCP server --> existing job/OpenCode engine
Codex CLI adapter ---+
```

### 1. Keep one engine and preserve MCP contracts

All **six** existing tools retain their names and input schemas for the MVP: `ping`, `delegate`, `research`, `reply`, `jobs`, and `land`. The initial handoff incorrectly called these seven. Codex-specific checks and route restrictions are proposed behavior options; Claude behavior remains unchanged.

Reasoning: handlers use normal MCP text results and no Claude API. The main blockers are instruction wording, installation, hook contracts, and host policy, not execution transport.

Retain Anthropic's `anthropic/alwaysLoad` metadata for Claude and omit it in Codex mode. Do not claim that Codex interprets it.

### 2. Select the client explicitly

Proposed future commands:

```text
cheapag serve --client codex
cheapag serve --client claude
```

Milestone 1 proposes only explicit serving/client selection. Later installer milestones may add:

```text
cheapag login --client codex
cheapag setup --client codex
```

These commands/flags **do not exist yet**. Preserve legacy no-argument behavior and default Claude behavior. Avoid a single global active-client setting so both hosts can coexist.

The adapter should own host-specific server instructions/metadata, MCP registration, installation assets, consent guidance, optional host status information, and takeover-policy resolution. The core should retain all execution/safety responsibilities.

### 3. Reuse provider setup; separate host registration

Keep the existing hidden OpenCode provider-login flow, model presets, and live credential check. Add a host setup path that reuses an existing worker login without asking for the key again.

Prefer supported Codex MCP CLI registration rather than hand-editing unrelated TOML. Preserve existing entries, respect `CODEX_HOME`, detect collisions, and provide manual configuration when automatic setup fails. Preserve project working-directory semantics; test startup from repository subdirectories.

After the basic integration is proven, consider installing one focused Codex workflow skill using the existing plan grammar. Skill/installer packaging is outside Milestone 1. Do not overwrite user `AGENTS.md` or globally redefine their model/provider/sandbox defaults. Direct local installation is proposed for a later release; a Codex marketplace/plugin distribution is optional later work.

The intended future user flow, after installing the approved fork, is `codex login`, `cheapag login --client codex`, developer-run `cheapag allow` in each target repository, then Codex. Do not run upstream `npx cheap-agent` expecting unpublished fork features; use a local build/installed fork for demonstrations.

### 4. Preserve developer consent outside MCP

Keep approval in the terminal and do not add an MCP consent/approval tool. Installation must never auto-approve a repository. Keep provider/model recipient disclosure, route-change reapproval, privacy options, and explicit model filtering.

Claude can retain its user-only `/cheapag:allow` integration. Codex should tell the developer to run the CLI themselves rather than copying the Claude allow skill and assuming equivalent user-only execution guarantees.

### 5. Separate stronger-worker escalation from host takeover

Existing stronger-worker escalation is an OpenCode operation, separate from host takeover. **Preserve it for Claude.** The newer approved failure boundary supersedes the original proposal to reuse it unchanged for Codex: the finalized Milestone 1 plan disables automatic model-switch fallback and stronger-worker escalation for Codex, including the special turn-cap escalation path. This must be enforced in the engine, not only in instructions.

Sonnet takeover is a different mechanism: Claude instructions/hooks tell Claude to use its Agent tool with `model: sonnet`. Keep that behavior in the Claude adapter.

Approved Codex default: **stop/report after worker exhaustion, keep the worktree, report findings and failing checks**, without automatic expensive fallback or host takeover. The pending plan retains bounded repairs on the same cheap model, forbids automatic model changes after failure/provider limits, and covers research, resumed jobs and deferred integration-fix paths. Difficulty-tier selection is initial routing, not a failure fallback; demo fixtures pin all tiers to the same cheap model.

Later, consider explicit Codex `self` and `subagent` policies with bounds. Add Codex-specific configuration rather than silently mapping a legacy `sonnet` setting to unrestricted Codex work. Preserve Claude top-level configuration semantics.

Any automatic native takeover must resolve how server verification runs before automatic landing. Merely having a child run commands and call `land apply` does not preserve server-verified completion. The exact additive verified-completion design is unresolved and is outside the MVP.

### 6. Make hooks a separately validated feature

Do not directly install the existing Claude hook implementation into Codex.

Confirmed differences/limitations from code and docs:

- Claude state uses `prompt_id`; Codex documents `turn_id`.
- Codex patch events report `apply_patch` and `tool_input.command`, not Claude Edit/Write replacement fields.
- `spawn_agent` matches the hook alias `Agent`, but its arguments and handoff semantics are not Claude's.
- The docs do not establish the same child `agent_id` fields on Codex pre/post tool events that current Claude exemptions depend on. Obtain real fixtures before implementing exemptions.
- Shell hooks use canonical `Bash`; PowerShell write forms need additional policy handling.
- `write_stdin` does not receive another pre-tool check for interaction with an already approved command.
- Specialized/hosted paths may be outside hook coverage. Hooks are not a complete security boundary.
- Trust is tied to hook definitions; updates can require new review. Do not bypass trust as the normal installation strategy.

Proposed implementation: normalize host events into a small shared policy input, keep host input/output adapters, namespace Codex hook state separately, preserve Claude opt-in/default/error behavior, and document supported coverage.

### 7. Review and cost accounting

Approved Codex role: **review resulting changes and risks** after successful verified work lands uncommitted. The plan permits diff/file inspection and assessment of acceptance evidence and source/spec disagreements, without automatically repeating every passing check or reimplementing the work. Preserve existing Claude review restrictions. Codex-mode implementation jobs must have executable acceptance commands; `OK tests=none` must not qualify as verified success.

Keep worker spend authoritative from existing records. Do not report ChatGPT subscription usage as worker API dollars, claim the existing caps bound all Codex usage, or extrapolate Claude savings to Codex. Native takeover may need additional usage limits and measurements.

## Windows and worktree findings

**Confirmed by inspection:** Windows helpers already support directory junctions, `taskkill`, executable/PATHEXT lookup, `.cmd` shims, Git Bash discovery, long Git paths, hidden processes, and slower test timeouts. Some first-worker startup and process cleanup limitations are documented in the README.

**Confirmed source issue, not runtime-reproduced in this session:** `allow.ts` assumes `<root>/.git` is a directory when writing `.git/info/exclude`. In a linked Git worktree, `.git` is a file. Resolve the exclusion path through Git rather than concatenating `.git/info/exclude`.

Proposal: demonstrate the MVP in an ordinary checkout, then add the focused linked-worktree fix and test both ordinary and linked checkouts. Do not use this as justification for a broad workspace rewrite.

Additional Windows acceptance needs: paths with spaces; Node/npm/Codex `.cmd` shims; proper quoting; no visible background consoles; Git Bash prerequisites; launch from a subdirectory; worker shutdown/cancel; native Codex permission interactions. Native Windows documentation is not proof these combined workflows already work.

## Existing tests and how to extend them

| Coverage | Files |
| --- | --- |
| MCP identity, instructions, tool schemas | `test/ping.test.ts`, `test/harness.test.ts` |
| Delegation, source context, job limits/recovery | `test/delegate.test.ts`, `test/source.test.ts`, `test/jobs.test.ts` |
| Verification and reproduction | `test/verify.test.ts`, `test/repro.test.ts` |
| Worktrees, conflicts, locks, landing | `test/workspace.test.ts`, `test/land.test.ts` |
| Batches, dependencies, integration checks | `test/batch.test.ts` |
| Questions/resumption | `test/reply.test.ts` |
| Consent, privacy, provider routing/caps | `test/consent.test.ts`, `test/routing.test.ts`, `test/openrouter-prefs.test.ts`, `test/limits-opencode.test.ts` |
| Research and actual research permissions | `test/research.test.ts`, `test/research-permissions.test.ts` |
| Actual worker permissions, runtime behavior | `test/permissions.test.ts`, `test/opencode.test.ts` |
| Claude setup/plugin/hooks | `test/login.test.ts`, `test/plugin.test.ts`, `test/hook.test.ts` |
| Reports, status, cleanup, platform | `test/report.test.ts`, `test/status.test.ts`, `test/cleanup.test.ts`, `test/platform.test.ts` |
| Test-double behavior and opt-in live tests | `test/fake-opencode.test.ts`, `test/live.test.ts` |

Reusable testing infrastructure:

- `test/harness.ts`: real MCP stdio client, temporary Git repositories, snapshots, and hermetic XDG homes.
- `test/fake-opencode.ts`: deterministic scripted worker behavior without live model spend.
- `test/fake-llm.ts`: scripted model endpoint used with **real bundled OpenCode** to test actual permission enforcement.
- `test/pty-drive.py`: interactive login driver; relevant tests are skipped on Windows.
- `vitest.config.ts`, `test/setup.ts`: test discovery and Windows timeout adjustments.
- `.github/workflows/ci.yml`: Ubuntu/Windows suite, package smoke check, optional live tests.

Codex tests must additionally isolate `CODEX_HOME` and skill installation destinations. Existing XDG isolation alone is not enough to protect a developer's real Codex profile or user skill directory.

Keep deterministic tests as the CI foundation. Real Codex/model runs should be explicit opt-in checks with known authentication, limits, and recorded CLI version. A fake MCP client proves server contracts, not actual Codex orchestration.

## Milestone 0: diagnosis completed; repairs pending

The authorized baseline diagnosis and CLI capability probes are complete and recorded above. Fixture repairs, a corrected full-suite run, and actual Codex/worker integration are not yet implemented or verified. Do not require the user to repeat architecture approval or restart diagnosis from the historical unsupported count of 21.

The minimal plan below supersedes the broader initial proposed file list. In particular, use one small client-profile module, defer installer/skill changes, and add only the focused execution-policy and mandatory-verification plumbing needed for the approved Codex role.

## Milestone 1: finalized plan, awaiting approval

Finalized 2026-10-31 and presented to the user. Status: implementation approval pending; no integration code changed. This folds the former minimal-transport and end-to-end demonstration milestones into the user's requested Milestone 1.

### Outcome

Codex CLI starts the existing cheap-ag MCP server in explicit Codex mode, delegates a small task to one configured cheap OpenCode worker, receives independently measured verification evidence, and reviews the resulting uncommitted changes. Claude behavior remains unchanged. Demonstrations target disposable Git repositories, never cheap-ag source.

Initial compatibility target: the installed Codex CLI 0.166.0 on Windows 11. Its version, MCP registration help, exec help and login-status command were inspected. No claim of compatibility with older releases, actual Codex orchestration, or ChatGPT authentication has yet been demonstrated. Current CLI login status: not logged in.

### Minimal implementation

1. Add one small client-profile module, `src/clients.ts`. Keep explicit Claude/Codex profiles, without a generic extension framework. Profiles select server guidance, tool descriptions/metadata, consent/setup guidance and host-neutral execution options. Keep Claude instructions and `src/rules.ts` behavior intact.
2. Add strict parsing for `cheapag serve --client codex` and `cheapag serve --client claude` in `src/index.ts`; reject invalid options on this new command. Preserve existing no-argument, terminal-setup and legacy Claude invocation behavior. Do not add a global active-client setting.
3. Pass the profile into `serve()` in `src/server.ts`. Preserve all six tool names and input schemas: ping, delegate, research, reply, jobs, land. Codex guidance requires executable acceptance checks, delegates implementation, permits diff/file review after success, and reports failure without host takeover or automatic `land apply`. Omit Anthropic metadata in Codex mode. Keep the opening 512 characters self-contained.
4. Add default-preserving options to `consentGate` in `src/consent.ts`. Codex uses terminal consent guidance and disables fallback/escalation route candidates before selecting executable routes, including promotion of an escalation-only candidate. Preserve provider/model authorization, route-change reapproval, privacy/ZDR options, consent storage and legacy Claude selection. Existing broad consent can safely authorize a larger set than Codex executes; no new consent tool or automatic consent write.
5. Thread these options through `src/jobs.ts` and `src/research.ts`, including the deferred batch integration-fix entry point. For Codex, require an executable done-when or configured test_cmd for every implementation group before booting a worker or creating jobs. No Codex delegation may report verified success with tests=none. Keep same-worker bounded self-fixes, existing worktrees/landing/verification/caps and integration mechanisms. Disable model-switch fallbacks and stronger-worker escalation in Codex mode, including the separate turn-cap escalation path. Research also cannot silently change models after a limit. Execution policy must survive reply/resumption and automatic integration fixes. Default options preserve Claude behavior.
6. Add deterministic regression coverage and an opt-in real Codex smoke runner. Document local-build/manual connection and prerequisites in `docs/codex.md`; no installation or publishing work in this milestone.

The fallback rule is intentionally conservative: a worker starts on its configured/consented task model; subsequent failure or provider limits cannot select another model. A configured difficulty tier is initial model selection, not a failure fallback. Smoke fixtures pin all implementation tiers to the same approved cheap model. Existing same-model self-fixes stay bounded by the engine; no Codex self-implementation or native subagent takeover is introduced.

### Smallest production file set

| File | Modification |
| --- | --- |
| New `src/clients.ts` | Explicit profiles and Codex instructions/policies. |
| `src/index.ts` | Explicit serve/client argument parsing. |
| `src/server.ts` | Select instructions, metadata, descriptions and execution context. |
| `src/consent.ts` | Optional terminal guidance and execution-route restrictions; default behavior preserved. |
| `src/jobs.ts` | Thread options; require executable checks in Codex mode; apply policy in ordinary and deferred integration paths. |
| `src/research.ts` | Thread consent guidance and no-model-switch policy. |

No engine duplication. No planned changes to worker.ts, opencode.ts, workspace.ts, verify.ts, routing.ts, config.ts, rules.ts, login.ts, install.ts, hooks, package identity or dependencies. Linked-worktree allow.ts repair is deferred: ordinary disposable checkouts suffice for this milestone.

### Test/document file set

| File | Modification |
| --- | --- |
| `test/harness.ts` | Server arguments/client selection; local fixture LF policy; fixtures for paths with spaces. |
| `test/opencode.test.ts` | Correct the Windows PATH fixture while preserving its purpose of proving the bundled binary is used. |
| `test/permissions.test.ts` | Make allowed-command probes deterministic and offline, supply fixture-local tool shims for permission-only checks, and separately check real make only when available. Fix Windows absolute-path handling/quoting in this fixture; retain real OpenCode permission enforcement. Do not weaken denial assertions. |
| New `test/codex.test.ts` | Client contract, missing/invalid checks, consent/privacy, success/failure, budgets, model switching, reply/deferred integration paths, subdirectory and spaces cases. |
| New `test/codex-live.test.ts` | Explicit opt-in real Codex CLI + real cheap-worker success and failure demonstrations, isolated from cheap-ag source. No live runs by default. |
| New `docs/codex.md` | Manual local-build connection, authentication/provider prerequisites, evidence, limits, timeout behavior and removal. |

Use the existing harness/fakes; split the new deterministic test file only if it becomes hard to read. No workflow change is necessary initially: existing Windows/Ubuntu CI discovers the added tests. Existing Claude ping/routing/installer/hook tests must continue to pass.

### Exact acceptance criteria

1. Build and typecheck pass; deterministic tests pass in a documented environment with the fixture problems corrected. Existing Claude schemas, instructions, metadata, setup and hook behavior retain regression coverage. No source-repository commits, pushes or publication.
2. Codex-mode MCP initialization exposes exactly the existing six tool schemas. There is no Sonnet or Claude slash-command dependency. Invalid client arguments fail clearly. Existing Claude startup remains compatible.
3. An unapproved disposable repository returns CONSENT before job/worktree creation or a model call. The result tells the developer to run the local CLI themselves. No MCP tool, setup path, or demo prompt grants consent. Provider changes and model-route changes still require approval; model filtering, deny-data-collection and ZDR survive.
4. Missing executable acceptance commands fail before worker startup. Explicit executable done-when commands take precedence over configured test_cmd as before. No Codex implementation is called verified when no checks ran.
5. The real CLI 0.166.0, after developer subscription sign-in and worker setup, actually calls delegate against the local build. The JSON event log, matching job/session records, patch and server verify.log establish that the cheap worker implemented the task and the server ran a nonempty successful check. A fake MCP client alone does not satisfy this criterion.
6. Success lands the expected code and test uncommitted. HEAD, index entries, pre-existing staged content, unrelated unstaged content and unrelated untracked bytes match their recorded baseline. The job reports landed=true and tests=pass, with executed checks and exit results. Codex reviews the diff and reports evidence/risks without implementing the change itself.
7. A negative case deliberately produces a patch that fails an acceptance check after the allowed same-model repair attempts. Result is a clear non-success with failing evidence and a retained worktree. Main-checkout source/test bytes, HEAD and index remain unchanged; expected .cheapag runtime records may be created. Codex does not automatically apply the retained patch.
8. Deterministic tests additionally cover provider budget, worker cost/turn/time caps, environmental check failure, blocked reply/resumption and batch integration-fix paths. Recorded worker calls prove no fallback/escalation model was invoked for Codex. Claude's existing fallback behavior still passes.
9. Tests run on Windows and Ubuntu CI. The Windows local proof includes paths with spaces and a subdirectory launch; verification uses existing Git Bash handling. No new visible background consoles; ordinary shutdown/cancel checks pass with the necessary process rights.
10. Client timeouts do not trigger a second delegate call for the same task. The demo uses one task per invocation, a 300-second tool timeout and a 3-minute worker limit, with status lookup of the existing job after an ambiguous response. Do not use jobs(wait) under an assumed default 60-second allowance. General batch timeout/recovery ergonomics remain documented constraints for later work.

### Disposable demonstration protocol after approval

- Create a tiny standalone Node project in a temporary Git repository, with LF attributes and a dependency-free `node --test` acceptance check. Use a path containing spaces. Establish a fixture baseline and record HEAD, index and working-tree bytes; include unrelated staged, unstaged and untracked fixture state.
- Use an isolated CODEX_HOME/configuration and XDG worker state for the demonstration. The developer signs into that Codex environment with ChatGPT and establishes worker credentials without sharing credential contents. Do not overwrite or copy credential files automatically. Tests/stub CLI configurations must never touch the real Codex profile or skill directory.
- Connect the local build via an absolute Node executable and absolute dist/index.js path with `serve --client codex`. Set MCP cwd to the disposable repository and verify startup from its subdirectory. Use no upstream npx release or proposed unpublished installer flags.
- Developer runs the built CLI's allow command for that disposable repository with an explicit cheap-model allowlist. Consent rejection is demonstrated before approval. Pin cheapag.json task/research models and tiers; retain per-job caps (suggested demo max_minutes=3, max_cost_usd=0.10, max_parallel=1). No claim that worker caps bound Codex subscription usage.
- Run Codex with its normal permissions, or a read-only shell profile that still permits the specifically approved MCP tools. Do not bypass sandbox/approval or hook trust. Capture JSON events and the job evidence. Use no hooks or native agents.
- Demonstrate success on one fixture and non-landing failure on a separate fixture. Keep verification commands executable and independent of the worker's finish claims. Inspect final diff and risks. Shut down all test-owned processes; retain sanitized evidence.

The docs confirm stdio servers, initialization instructions, MCP cwd/env, and a configurable tool_timeout_sec with a 60-second default. The 300-second setting here is for the bounded single-task demo, not a general solution for long batches. See https://developers.openai.com/codex/mcp . ChatGPT sign-in and API-key sign-in are separate supported paths; worker charges remain separate: https://developers.openai.com/codex/auth .

### Deferred scope

Codex login/setup installer and skill distribution, marketplace/package publication, hooks, native subagents, advanced fallback, cost-savings benchmarks, and a broad Windows/workspace rewrite. The focused baseline fixture repairs above are proposed prerequisites, not already implemented changes.

Approval requested: implement these focused fixture repairs and this Milestone 1 scope. Architecture approval already exists; implementation of this concrete scope waits for the user's next approval.

## Later milestones, deferred

The following retains the original numbering; the former Milestone 2 live demonstration is now part of Milestone 1. Windows basics are acceptance criteria for Milestone 1; linked-worktree and broader platform work remain later scope.

### Milestone 3: straightforward installation and distribution

Acceptance: Codex-targeted login/setup, reusable worker credentials, installed workflow skill, repeatable updates, collision handling, documented removal, and unchanged Claude installation.

Automated tests: stub Codex CLI; missing CLI; existing/mismatched registration; custom `CODEX_HOME`; setup failures; unrelated config preservation; no consent writes; no unnecessary OpenAI key requirement; packaged asset presence. Retain Claude installer tests. Provide non-PTY tests that also run on Windows.

### Milestone 4: Windows and linked-worktree compatibility

Acceptance: native Windows, paths with spaces, subdirectory launches, linked-worktree consent, correct landing/index preservation, and shutdown/cancellation.

Automated tests: Ubuntu/Windows workflows, `.cmd` and quoting cases, ordinary/linked Git checkout fixtures, exclusion-path handling, process cleanup, and user-state snapshots.

### Milestone 5: optional Codex hooks

Acceptance: trusted hooks enforce documented supported edit/takeover-budget behavior; plans remain writable; state resets correctly; Claude and Codex state do not collide; unsupported coverage is disclosed.

Automated tests: actual Codex event fixtures, patch add/update/delete/move/multi-file inputs, shell and PowerShell writes, MCP post-results, turn resets, child isolation, parallel calls, malformed events, trust/update behavior, and hook failure semantics.

### Milestone 6: optional native takeover and evaluation

Acceptance: explicit bounded takeover; available account-supported model; no recursive cheap-ag delegation loops; server verification before automatic landing; separate worker and orchestrator usage reporting.

Automated tests: native-agent contracts, disabled agents/unavailable models, limits/loop prevention, verified completion path, and opt-in evaluation against existing hidden fixture tests. Do not equate successful delegation with demonstrated cost savings.

## Outstanding decisions and questions

1. **Immediate pending approval:** the three focused fixture repairs and the concrete Milestone 1 scope above. The last response asked: "Do you approve the focused fixture repairs and this Milestone 1 scope?" The user has not answered; requesting this handoff update is not an approval.
2. The conservative proposed Codex execution policy disables automatic model switching, retains bounded same-model repairs, and requires executable verification. Obtain approval of the presented scope before implementing these details; the general no-expensive-fallback and review roles are already accepted.
3. Developer sign-in and worker setup are prerequisites for the later real demo. Last observed CLI login status was not logged in. Recheck supported CLI status commands before the live run; do not read, expose or automatically copy credential files.
4. CLI 0.166.0 is the initial target. Older-version support and real orchestration compatibility remain unproven. The Node 22/Ubuntu matrix also awaits validation.
5. The historical 21-failure output is still unavailable. It may help reconcile old results, but it does not block approving the diagnosed scope; use the recorded 24-failure run and controlled reruns as the attributable baseline.
6. Later installation scope (user-wide/project-local), package/repository identity, updates/removal and skill distribution remain undecided and outside Milestone 1.
7. The proposed 300-second MCP tool timeout is for the bounded three-minute, single-task demo only. General long-batch polling/recovery and avoiding duplicate jobs remain future design work.
8. Codex hook payloads, child identity and trust/update contracts need actual fixtures if hooks are later authorized. Native takeover needs a separately designed verified-completion path and separate usage bounds; neither is part of the MVP.

## Next-session checklist

1. Read this updated handoff, inspect current Git status/HEAD and preserve subsequent user edits. At handoff time, HEAD was unchanged and only this document was untracked. Diagnostic artifacts are ignored local files.
2. Recognize the existing checkpoint: architecture approved; diagnosis complete; detailed fixture repair and Milestone 1 implementation approval pending. Summarize the concrete scope and await approval if it has not been granted in the new session. Do not restart architecture planning or automatically rerun the full suite.
3. Read the local diagnosis/plan and raw evidence if needed; the essential content is embedded here if those ignored files are missing.
4. Once the scope is approved, make the three focused fixture repairs, validate them in a documented environment and establish the corrected baseline without weakening assertions. Record sandbox limitations separately from behavioral failures.
5. Implement the explicit client profile and smallest policy/check plumbing. Preserve six tool schemas, all Claude behavior and developer consent. Cover no-model-switch behavior and required verification in deterministic tests, including reply and deferred integration paths.
6. After developer sign-in/worker setup, demonstrate actual Codex delegation, independent server verification and uncommitted landing in disposable repositories only, plus a non-landing failure. Never use cheap-ag source as the worker target.
7. Verify changed code with appropriate checks, Windows spaces/subdirectory/lifecycle cases and existing Ubuntu/Windows CI when available. A fake MCP test alone is not the real CLI demonstration; document what remains untested.
8. Leave installer/skills, linked-worktree repair, hooks, native agents, publishing and benchmarks for later authorized milestones. No source-repository commits, pushes or publication are authorized.

Suggested prompt when resuming in Codex CLI:

```text
Read docs/codex-integration-handoff.md and inspect the current repository state.
The shared-engine/thin-adapter architecture is approved. Baseline diagnosis and
the Milestone 1 plan are complete. Summarize the pending focused fixture repairs
and Milestone 1 scope, and wait for my approval before implementing.
Do not commit, push or publish. Use disposable repositories for demonstrations.
```

This document update is the only newly authorized repository edit for the return to CLI. It records the completed diagnosis and pending plan; it does not imply implementation approval.
