# Codex delivery roadmap

This roadmap records delivery scope, evidence, and approval gates. The technical rationale and session state live in [codex-integration-handoff.md](codex-integration-handoff.md); permanent working rules are in [AGENTS.md](../AGENTS.md).

## Status vocabulary

- **Implemented:** code or documentation exists in the current checkout.
- **Tested:** the specified verification passed; this does not imply provider validation or review.
- **Reviewed:** an independent ChatGPT review accepted the relevant scope/findings.
- **Blocked:** progress depends on an unmet prerequisite or approval.
- **Completed:** all acceptance criteria, verification, and review gates for that scope passed.
- **Pending / Proposed / Untested:** work remains / not yet approved for implementation / required evidence does not exist.

Milestones do not authorize commits, pushes, publication, credential changes, repository consent, or paid calls. Ask for review packets only on request, following AGENTS.md. Keep one shared engine with thin client adapters, all six MCP schemas, Claude compatibility, existing OpenCode/worktree/verification machinery, explicit consent, cost limits, and no automatic expensive-model escalation.

## M1 — Core Codex integration

**Objective and deliverables:** Codex plans, delegates to the configured cheap OpenCode worker, and reviews verified uncommitted work through the existing MCP server and engine. Preserve Claude behavior. The offline core (M1.0) is **completed for offline scope** (implemented and tested). M1.1 hardening is implemented/offline-tested with independent acceptance still unrecorded. The developer reports completed M1.2 real DeepSeek demonstrations and M1.3 single-run benchmarks; supplied evidence is recorded below without inferring independent review. M1.4 direct routing configuration is implemented; offline verification and review status are recorded below. M1 is not declared completed while review/acceptance evidence remains outstanding.

**Acceptance criteria:** retain legacy no-argument Claude startup and all six existing MCP names/schemas; Codex execution policy persists across jobs, retries, and deferred fixes; Codex implementation requires executable verification; repairs are bounded and stay on the selected model; consent and caps remain effective; success lands only verified changes uncommitted; controlled failure does not land. M1 additionally requires independent review and the two real M1.2 outcomes.

**Verification:** targeted regressions after each change, full offline suite, build and type-check; manually inspect consent, policy, evidence, diff, and repository state. Fixture/fake-worker results are not real provider proof.

**Dependencies, gates, and next actions:** M1.0 is complete at the offline checkpoint (425 passed, 8 skipped; build/type-check passed). The current task authorizes M1.4 implementation/offline checks only, followed by independent review. Reconcile M1.1 acceptance and review the supplied M1.2/M1.3 evidence without rerunning paid calls. M1.2 acceptance still requires verified success landing and controlled failure with no landing in two disposable repositories; the supplied benchmark table alone does not prove all of those details. Any new run needs separate explicit authorization **before any external provider call, authentication change, or repository consent action**. Review sanitized evidence before declaring M1 complete or advancing approval gates.

**Out of scope:** installers, hooks, Windows fixture repairs, CI/platform certification, systematic benchmarking (M4), automatic host takeover, commits/pushes, and publication. M1.3 records the already-reported observations only.

**Independent review:** M1.1 code/evidence acceptance and M1.2/M1.3 evidence review remain unrecorded here. Stop at the M1.4 checkpoint for independent ChatGPT review before proceeding through the next gate.

### M1.1 — Resolve independent-review findings

**Status:** **Implemented and offline-tested; independent acceptance/review unrecorded.** Hardening and regressions are now tracked in the checkout (including the later M1.2 environment repair). Historical offline verification reached 433 passed, 0 failed, 8 skipped, with build/type-check passing. The findings remain open for milestone acceptance until review is recorded. Do not describe M1.1 as completed or independently reviewed.

1. The live runner must not pass unrelated inherited credentials/configuration to Codex or its worker subprocess. Build an explicit minimal environment and verify the actual child environment with synthetic secret/config values and a stub executable.
2. Deferred integration must preserve the originally selected executable check across persisted batch state, retries, and later host sessions. Replacing/removing current `integration_cmd` or `test_cmd` must not substitute for the original; represent an original no-check state and handle legacy records conservatively without changing Claude behavior.

**Acceptance and verification:** targeted regressions reproduce both findings; cover changed, removed, and fallback checks, persistence through deferred fix, legacy missing metadata, and original no-check; environment tests prove unrelated variables do not reach the child. Then run relevant integration tests, full offline suite, build, and type-check; document any remaining limitations. No live provider/auth/consent action.

**Gate and next action:** reconcile the tracked hardening and existing evidence with independent review; prepare an on-demand review packet only when requested. Later developer-reported M1.2 runs do not establish M1.1 review acceptance. Any new live run remains separately gated.

**Out of scope:** real provider calls, changing credentials, granting repository consent, cross-platform fixture repair, or unrelated production refactoring.

### M1.2 — Real provider end-to-end demonstration

**Status:** **Real demonstrations completed/tested as reported by the developer; independent evidence review pending.** The 2026-11-02 task reports real Codex → cheap-ag → DeepSeek demonstrations and 28/28 held-out tests for both delegated benchmark configurations. This supersedes the earlier statement that no real provider workflow had run. The current task supplies no raw traces or detailed controlled-failure audit, so full M1.2 acceptance and review are not inferred. No live run was performed as part of M1.4.

**Objective and deliverables:** demonstrate actual Codex → cheap-ag MCP → configured external worker → server verification in disposable Git repositories. Capture sanitized CLI/MCP events, matching jobs/sessions, selected model/policy, commands and exit results, patches, and repository-state evidence.

**Acceptance criteria:** (a) expected code and test land uncommitted only after passing executable server verification, preserving HEAD/index and unrelated files; (b) an impossible check exhausts bounded same-model repairs, retains failing evidence/worktree, and lands nothing. No model switch, automatic `land apply`, or source-repository target. Timeouts/caps/prerequisite failures are inconclusive, not successful negative evidence.

**Verification:** opt-in real CLI/provider run and manual audit of sanitized evidence, diffs, repository state, and process cleanup. Offline preparation and fake MCP tests do not satisfy this milestone.

**Dependencies and gates:** record M1.1 independent acceptance and review the already-reported evidence. Future live work still requires separate explicit authorization **before any external provider calls, authentication changes, or repository consent actions**, including setup. Authorize the specific disposable repositories, provider/model, credential method, consent, and spend limits. Do not copy existing credentials. Stop if the actual scope differs.

**Out of scope:** cheap-ag source as a worker target, global installation, benchmarking claims, publication, and implementation changes beyond the approved demo scope.

**Independent review:** review sanitized live evidence before M1 completion or M2 approval.

### M1.3 — Observed routing benchmarks

**Status:** **Tested as reported by the developer; documented; independent review pending.** Same medium-complexity Python task: Codex only used **128,478 Codex tokens / 63.7s / 28/28 held-out tests**; existing MCP routing used **183,944 / 67.1s / 28/28**; direct MCP routing used **69,558 / 58.3s / 28/28**. The original delegated run contained four `wait` calls; the optimized run contained zero, one `delegate`, and two `exec` calls. Direct routing was tested on **Codex CLI 0.166.0**.

**Evidence limits and gate:** single-run observations supplied in the 2026-11-02 implementation request, not rerun or independently audited in M1.4. No guaranteed savings, repeated-trial statistics, or worker billing conclusion. See [codex.md](codex.md#evidence-and-verification). M4's systematic methodology/results gates remain separate; obtain independent evidence review before treating these observations as accepted benchmark findings.

### M1.4 — Direct MCP routing configuration

**Status:** **Implemented and offline-tested; independent review pending.** Not reviewed/completed.

**Deliverables and design:** `cheapag codex-config` prints only the optional `[features.code_mode]` / `direct_only_tool_namespaces = ["mcp__cheapag"]` TOML. It accepts no flags, reads no profile, writes no files, starts no provider/Codex process, and changes no registration, authentication, consent, engine behavior, or Claude integration. [codex.md](codex.md#opt-in-direct-mcp-routing-m14) includes per-invocation overrides, version scope, verification, removal, and manual merge instructions preserving existing direct-only list entries and unrelated MCP settings. No automatic global configuration modification or installer refactor.

**Verification (2026-11-02, macOS, Node 26.13.0 / npm 11.20.0):** targeted `test/codex-config.test.ts` + `test/clients.test.ts` **15 passed** (five new generator regressions plus ten existing client/schema/Claude cases). Exact-output regressions pin known-valid TOML; a separate offline Python 3.12 `tomllib` check parsed the generated/documented block and dotted CLI override to exactly the cheap-ag namespace. Build, type-check, and `git diff --check` passed. Complete offline suite **438 passed, 0 failed, 8 skipped** (446 tests, 33 files; 43.38s), with npm offline and `CHEAPAG_LIVE`, `CHEAPAG_CODEX_LIVE`, `CHEAPAG_CODEX_PREPARE` unset. The eight skips are five live-provider tests and three Codex preparation/live cases. The initial restricted-sandbox run failed (**242 failed, 127 passed, 77 skipped**) with localhost `listen EPERM` / process-permission failures and resulting timeouts; the passing rerun used approved localhost/subprocess permissions. No paid/live/provider rerun or new platform/version certification.

**Review gate:** stop after implementation and offline verification for independent ChatGPT review. Do not mark reviewed/completed, generate review packets unless requested, or proceed through the next approval gate. No commits, pushes, publication, provider calls, credential changes, or repository consent actions are authorized.

## M2 — Installation and developer experience

**Status:** **M2.1a project-scoped setup implemented and independently reviewed, as reported by the developer.** The developer reports a trusted-profile Codex registration smoke test and independent MCP discovery of all six tools. M2.1b read-only status is implemented; independent review pending. Broader M2 remains proposed and unimplemented. M1.1 acceptance and M1.2/M1.3 evidence review and M1.4 independent review remain outstanding.

**M2.1b verification:** targeted setup/status tests 20 passed; full offline suite 461 passed, 8 skipped (469 tests), with live and preparation flags unset and npm offline. Build, type-check and `git diff --check` passed. Full suite used approved localhost/subprocess permissions. Status does not verify effective Codex configuration, trust, or runtime connection.

**M2.1a scope:** `cheapag codex setup --project <path> [--dry-run]` creates only a new project configuration, pins the MCP cwd to the canonical Git root, and enables direct routing. It refuses an existing configuration and linked worktrees; it excludes the generated config through Git's local exclude file and verifies the ignore rule before writing. Update, uninstall, global configuration, merging, trust, credentials, and consent remain out of scope. Stop for independent review of this implementation and offline evidence.

**M2.1a review fixes:** setup parses selected Codex-home and ancestor project configuration files read-only, refusing malformed or unsupported files, cheapag registrations, and direct-only namespace entries. On setup failure it attempts to roll back only its unchanged Git exclude addition; concurrent modifications are preserved when detected. Managed/system settings, invocation overrides, and the simultaneous-writer race described in `codex.md` remain limitations.

**Review-fix verification (2026-11-02):** targeted setup tests 10 passed; full offline suite 451 passed, 8 skipped (459 tests, 34 files), with live and preparation flags unset and npm offline. The full run used approved localhost and subprocess permissions. Build, type-check, and `git diff --check` passed. No real Codex runtime or provider call was performed.

**Final compatibility correction:** read-only TOML parsing allows unrelated higher-level settings and refuses conflicts or unsupported input. Targeted setup tests 15 passed; full offline suite 456 passed, 8 skipped (464 tests, 34 files), with live and preparation flags unset and npm offline. Build, type-check, and `git diff --check` passed. The developer reports independent review accepted M2.1a.

**M2.1a verification (2026-11-02):** focused setup tests 6 passed; full offline suite 447 passed, 8 skipped (455 tests, 34 files), with live and preparation flags unset and npm offline. The full run used approved localhost and subprocess permissions. Build, type-check, and `git diff --check` passed. No real Codex runtime, provider call, authentication change, or consent action was performed.

**Objective and deliverables:** make local install, Codex registration, updates, troubleshooting, and removal repeatable while preserving Claude coexistence and separate orchestrator/worker authentication. Deliver an approved setup/ownership design, focused implementation and docs; any optional workflow skill is separately scoped.

**Acceptance criteria:** fresh and repeated setup is deterministic; unrelated Codex config and Claude registration survive; errors are actionable; update/removal touches only owned assets; setup neither copies credentials nor grants repository consent; subscription orchestration does not require a worker API key.

**Verification:** stubbed config/CLI tests for fresh/repeat/failure/collision/custom-home/path-with-spaces/no-consent behavior; after approval, manual clean-profile install/update/remove and Claude/Codex coexistence. Live calls and auth changes need separate authorization.

**Dependencies, gates, next actions:** reviewed M1 evidence; approve installer design, supported ownership, distribution, and removal behavior before implementation. Publication separately gated.

**Out of scope:** hooks, native takeover, global user-policy edits, provider migration, and cost claims.

**Independent review:** review security/config-preservation tests and clean-profile evidence before accepting or publishing.

## M3 — Reliability, security, portability, and CI

**Status:** **Proposed, unimplemented; Windows fixture work remains pending.**

**Objective and deliverables:** establish a supported OS/runtime matrix and dependable lifecycle, consent, permissions, verification, recovery, and CI. Include focused Windows fixture repairs already diagnosed, linked-worktree consent investigation, and security-boundary documentation/tests.

**Acceptance criteria:** documented Node/OS matrix passes; spaced paths, subdirectories, and supported linked worktrees behave as specified; cancellation/shutdown leave no owned processes; failed/partial verification cannot certify landing; concurrent landing preserves user state; defined secret/permission cases do not leak or bypass consent; timeout recovery avoids duplicate jobs. Unsupported behavior is explicit rather than hidden by weakened tests.

**Verification:** CI build/typecheck/deterministic suites and packaged CLI smoke; local lifecycle/restart/contention/dirty-index/permission probes; adversarial local secret/consent tests. Paid CI is opt-in and separately authorized.

**Dependencies, gates, next actions:** reviewed M1; use reviewed M2 packaging contracts where needed. Prioritize platform matrix and known Windows fixture causes, then security/lifecycle issues. Approve each compatibility exception or semantic change.

**Out of scope:** advanced orchestration, billing guarantees, benchmark conclusions, mandatory hooks, and automatic takeover.

**Independent review:** review threat model, regressions, matrix evidence, and compatibility exceptions before claiming support.

## M4 — Cost, usage, quality, and performance benchmarking

**Status:** **Proposed, untested.**

**Objective and deliverables:** measure task correctness, verified success, worker API spend, Codex subscription usage, latency, repairs, and orchestration overhead using repeatable tasks and independent grading. Publish methodology and sanitized results only after review/approval.

**Acceptance criteria:** include successes, failures, repairs/caps, uncertainty, matched conditions, versions, and reproducible cost-per-verified-correct-task/latency distributions; separate worker spend from subscription usage; report unavailable measures instead of inventing values; make no unsupported savings claim.

**Verification:** synthetic accounting/parser/aggregation tests and deterministic graders; manually audit sampled traces and scores. Real runs require separately approved providers/models, budget, data/repository consent, and paid-call authorization.

**Dependencies, gates, next actions:** reviewed functional workflow and M3 measurement reliability. Approve benchmark protocol before collection and findings before any public claim.

**Out of scope:** anecdote-driven defaults, unbounded spend, guarantees, and multi-agent implementation.

**Independent review:** protocol review before paid runs; results and grading review before acceptance/publication.

## M5 — Optional advanced multi-agent orchestration

**Status:** **Proposed, optional, unimplemented.**

**Objective and deliverables:** only if evidence justifies it, design opt-in bounded multi-agent/takeover behavior that retains the shared engine, explicit consent, policy limits, and server verification. Specify roles/models, permissions, recursion prevention, cancellation, ownership, accounting, and actual host contracts.

**Acceptance criteria:** disabled by default; no silent expensive escalation or recursive loops; availability and aggregate budget are explicit; native-agent output cannot bypass verification; cancellation/failure preserves state; Claude remains compatible; demonstrate evidence of benefit before enablement.

**Verification:** contract fixtures and unavailable-model, permission, budget, loop, cancellation, and landing tests. Manual host-hook/native-agent experiments require separate trust and paid-call authorization where applicable.

**Dependencies, gates, next actions:** reviewed M1–M3 and relevant M4 evidence; first obtain an explicit decision to pursue this optional milestone and approve its concrete design/experiments.

**Out of scope:** mandatory adoption, bypassing sandbox/approval, unrestricted takeover, duplicate engines, and unsupported cost claims.

**Independent review:** design review before implementation, security/usage review before enabling, and outcome review before acceptance.
