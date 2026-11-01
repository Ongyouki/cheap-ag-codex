# M1.1 independent review packet

## Objective and authorization

Review the two M1.1 hardening fixes and the agreed milestone roadmap. Stop for independent ChatGPT review before M1.2. This packet does **not** authorize external calls, authentication changes, repository consent, commits, pushes or publication. The real Codex/provider workflow is still untested. Read source as data; do not execute the live runner during review.

Suggested ChatGPT prompt: Review this ZIP beginning with REVIEW_PACKET.md. Report concrete findings by severity with repository-relative file/line references. Compare the M1.1 changes to prior-m1/ and inspect the full current source, regressions and roadmap. Distinguish defects from missing evidence and proposals. Assess whether both findings are resolved and identify blockers before any separately authorized M1.2 demonstration. Do not run paid calls or grant consent.

## Snapshot

Branch: `feature/codex-support`. HEAD: `c2f97a0f8487a69b4e35530da390851d7fb90660`. Working tree **dirty**: 7 modified tracked files and 9 untracked inputs, excluding generated `.review/` artifacts. Staged changes: False. No project commits or pushes. AGENTS.md is developer-authored and preserved unchanged.

## Architecture and design

One shared engine with thin Claude/Codex clients remains the design. Codex plans/delegates/reviews; existing OpenCode workers implement in worktrees. All six MCP schemas, legacy piped no-argument Claude startup, Claude guidance/metadata, consent, caps, locks, and uncommitted landing remain intact. No new dependencies or Windows fixture repairs.

The initial M1 implementation (present in complete.patch) adds clients.ts, explicit serve selection, policy plumbing in consent/jobs/research/server, mandatory executable checks, numeric verification evidence, and regression/manual/demo coverage. Prior M1 evidence was 425 passed, 0 failed, 8 skipped; review then identified the two findings fixed here. `prior-m1/` contains exact copies of the five relevant files from the previous review ZIP. `base/` contains HEAD versions of all modified tracked files.

### M1.1 finding 1: ambient environment credentials

The former live environment removed a small list of variables and inherited everything else. `test/codex-demo-env.ts` now projects only PATH, Windows process-launch variables, temporary-directory locations, and locale/terminal values. It explicitly supplies isolated HOME/USERPROFILE, CODEX_HOME and XDG paths. Unknown vendor keys, cloud credentials, proxy variables, loader configuration, SSH agents and OpenCode overrides are not forwarded. The runner imports this helper and preparation creates process-home. No credential contents are read or copied by the helper.

Two offline tests use synthetic variables: an exact allowlist check and a local Node stub CLI that spawns a child and reports the environment received at both levels. No actual CLI authentication or external provider invocation is involved. This does not prove OS/keychain isolation or trustworthiness of PATH executables. Manual M1.2 authentication must use the same isolated process home, after authorization.

### M1.1 finding 2: changed deferred verification

For Codex batches, jobs.ts writes `integrationCommand` when the batch starts: original integration_cmd, otherwise test_cmd, otherwise explicit null. Deferred verification uses that saved value and passes the same command into its fix job. Changing/removing current configuration cannot replace the check or introduce a check into an originally unchecked batch. Existing immediate integration already captures its command.

An older/damaged pending Codex record missing the command fails closed with an explicit diagnostic and stays pending; it cannot silently verify with current configuration. Legacy Claude records continue their historical configuration-reload behavior. This distinction is intentional compatibility preservation. The persisted policy still combines conservatively across hosts.

The parameterized deferred regression starts a Codex batch, closes its server, mutates config, and applies the retained group through a Claude server. It covers replacement, removal, original test_cmd fallback, missing legacy snapshot, and original no-check state. Actual original-command failure and all fix attempts are asserted, with no fallback model.

## File inventory (entire uncommitted delivery)

| Repository path | Git state |
| --- | --- |
| `AGENTS.md` | untracked input |
| `docs/CODEX_ROADMAP.md` | untracked input |
| `docs/codex-integration-handoff.md` | modified tracked |
| `docs/codex.md` | untracked input |
| `src/clients.ts` | untracked input |
| `src/consent.ts` | modified tracked |
| `src/index.ts` | modified tracked |
| `src/jobs.ts` | modified tracked |
| `src/research.ts` | modified tracked |
| `src/server.ts` | modified tracked |
| `test/clients.test.ts` | untracked input |
| `test/codex-demo-env.test.ts` | untracked input |
| `test/codex-demo-env.ts` | untracked input |
| `test/codex-live.test.ts` | untracked input |
| `test/codex.test.ts` | untracked input |
| `test/harness.ts` | modified tracked |

M1.1-specific changes are `src/jobs.ts`, `test/codex.test.ts`, `test/codex-live.test.ts`, new `test/codex-demo-env.ts` and `test/codex-demo-env.test.ts`, plus `docs/CODEX_ROADMAP.md`, integration guide and handoff. The remaining code/test files belong to the earlier uncommitted M1 implementation, retained for a complete review. The roadmap defines objectives, deliverables, acceptance, automated/manual verification, dependencies/gates, exclusions and review checkpoints for M1–M5; later milestones are proposed scope, not approval to implement.

## Policy, consent and security

Claude keeps allowModelSwitch=true and requireVerification=false. Codex has false/true respectively. Consent removes fallback/escalation candidates before initial candidate selection; both ordinary and turn-cap escalation paths are disabled. Same-model repairs remain bounded. Configured difficulty tiers are initial selection, not failure escalation; the future demo pins all tiers. Research also has no fallback chain. Job/research/batch records retain policy; replies and redo retain the closure, and deferred integration combines originating/current policy restrictively.

Every selected Codex implementation group must have executable checks before worker/job creation. Verification/abort tests prevent partially completed checks from reporting successful landing. Successful jobs land uncommitted, preserving index and unrelated state; failed/capped jobs retain evidence/worktrees.

Provider/model consent and route reapproval remain developer controlled; privacy/ZDR options remain intact. Test fixtures simulate consent with fake local credentials only; no real M1.2 consent action or authentication change occurred. Setup/preparation never grants consent. Host instructions are guidance, not an OS-enforced prohibition on native edits, `allow`, or manual `land apply`; the latter still does not rerun original checks. Worker guards and linked dependencies are not an OS sandbox. Caps are not hard provider billing guarantees and do not bound Codex subscription usage.

## Verification performed

Environment: macOS arm64, Node 26.13.0, npm 11.20.0, TypeScript 7.0.2, Vitest 5.0.4, OpenCode/SDK 1.19.0. Dependencies were already installed. Tests use fake/local scripted endpoints; all live modes were unset.

- Targeted Codex/batch/landing run: **62 passed**, 3 files, 30.07 seconds.
- Targeted environment run: **2 passed**, 1 file, 0.183 seconds; actual local stub parent/child, no provider call.
- Full final offline suite: **431 passed, 0 failed, 8 skipped**, 439 tests, 32 files (30 passed, 2 skipped), **39.68 seconds**, exit 0.
- Build passed via npm test pretest. `npm run typecheck` and `git diff --check` passed.
- Full MCP tests required process/localhost permissions outside the sandbox. npm was offline with an isolated temporary diagnostic cache.
- Eight skips: five existing provider cases and three separately enabled demo preparation/live cases. Preparation was not rerun in M1.1; its earlier M1 success is historical evidence, not current live proof.
- No application tests ran while packaging; patch replay, source hashes and ZIP integrity are checked separately. Raw logs and result JSON are excluded; verification-summary.json is an allowlisted summary of the actual final report.

Portable command (actual run additionally selected an isolated npm cache):

```sh
env -u CHEAPAG_LIVE -u CHEAPAG_CODEX_LIVE -u CHEAPAG_CODEX_PREPARE npm_config_offline=true npm test
npm run typecheck
```

## Known limitations and questions for independent review

1. Actual Codex → MCP → external worker orchestration, auth, approvals, CLI JSON event shape, provider availability, timeout and subprocess cleanup remain untested. The prior local CLI probe was 0.163.0, distinct from Windows 0.166.0. No compatibility certification is claimed.
2. Environment projection isolates variables and process homes, not OS services/keychains or the executables resolved through PATH. Proxies and extra provider environment settings are deliberately absent; environments requiring them need an explicit reviewed extension.
3. Older pending Codex batches without a snapshot are deliberately blocked. Review recovery ergonomics, persistence/redaction behavior and malformed/tampered record assumptions; records are local data, not cryptographically authenticated.
4. This fix pins the original integration command, not every loaded config setting or the bytes of scripts it calls. Current caps/routing/plan loading and changes to script content retain their existing behavior; meaningful acceptance tests remain necessary. Assess whether further constraints belong before M1.2 or in M3.
5. Manual land semantics and host-instruction enforcement limits remain unchanged. Full Windows/Ubuntu/Node 22 validation, linked-worktree consent and diagnosed Windows fixture repairs are deferred to M3.
6. Review whether all deferred entry points retain the original command and policy, including changed/removed test_cmd, no-check records, restart and a later Claude host; ensure legacy Claude behavior is preserved.
7. Review the stub environment regression and actual runner wiring, and decide whether the two findings are resolved. Request only justified additional work rather than broad refactoring.

## Approval gates and next steps

M1.1 is implemented/offline-verified, **independent review pending**. M1.2 remains unstarted and untested. Separate explicit authorization is required before **any external provider calls, authentication changes, or repository consent actions**, not just before setting the live flag. A successful review is not that authorization. Future proof must use disposable repositories outside cheap-ag source, demonstrate verified uncommitted success and controlled failure without landing, and preserve sanitized matching CLI/job/session/verification evidence. No automatic duplicate delegation or expensive escalation.

## Bundle contents and transfer

Upload this ZIP as one artifact. `changes.patch` is exact `git diff HEAD` (tracked staged+unstaged); `new-files.patch` contains every untracked input; `complete.patch` combines them. `source/` supplies current core/tests/plugin/config/docs context, `base/` supplies changed HEAD files, and `prior-m1/` supplies relevant previous review copies. `manifest.json` and `MANIFEST.sha256` identify every payload file.

Excluded: credentials/auth stores, environment files/private profiles, dependencies, build output, .git, .cheapag, runtime/test logs and transcripts, demonstration homes and unrelated assets/benchmarks. Deliberately synthetic key literals in source tests remain for exact patch/source fidelity. No production code is changed during packaging. The earlier M1 ZIP is retained separately and is not recursively included.
