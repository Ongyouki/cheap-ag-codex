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

**Objective and deliverables:** Codex plans, delegates to the configured cheap OpenCode worker, and reviews verified uncommitted work through the existing MCP server and engine. Preserve Claude behavior. The offline core (M1.0) is **completed for offline scope** (implemented and tested). M1.1 review hardening is **pending**; M1.2 live provider demonstration is **pending, untested, and blocked on separate authorization**. M1 is not completed.

**Acceptance criteria:** retain legacy no-argument Claude startup and all six existing MCP names/schemas; Codex execution policy persists across jobs, retries, and deferred fixes; Codex implementation requires executable verification; repairs are bounded and stay on the selected model; consent and caps remain effective; success lands only verified changes uncommitted; controlled failure does not land. M1 additionally requires independent review and the two real M1.2 outcomes.

**Verification:** targeted regressions after each change, full offline suite, build and type-check; manually inspect consent, policy, evidence, diff, and repository state. Fixture/fake-worker results are not real provider proof.

**Dependencies, gates, and next actions:** M1.0 is complete at the offline checkpoint (425 passed, 8 skipped; build/type-check passed). First resume M1.1 and resolve both findings below, run its acceptance checks, then stop for independent review. M1.2 may start only after M1.1 review and separate explicit authorization **before any external provider call, authentication change, or repository consent action**. M1.2 requires two disposable repositories: verified success landing and controlled failure with no landing. Review sanitized evidence before declaring M1 complete.

**Out of scope:** installers, hooks, Windows fixture repairs, CI/platform certification, benchmarking, automatic host takeover, commits/pushes, and publication.

**Independent review:** M1.1 code/evidence review before M1.2; M1.2 evidence review before M1 completion.

### M1.1 — Resolve independent-review findings

**Status:** **Pending** acceptance/review. Candidate hardening and regression tests exist uncommitted in this checkout from the previous session; the findings remain open for this milestone until the next session validates or corrects the candidate and the reviewer accepts the results. Do not describe M1.1 as completed or independently reviewed.

1. The live runner must not pass unrelated inherited credentials/configuration to Codex or its worker subprocess. Build an explicit minimal environment and verify the actual child environment with synthetic secret/config values and a stub executable.
2. Deferred integration must preserve the originally selected executable check across persisted batch state, retries, and later host sessions. Replacing/removing current `integration_cmd` or `test_cmd` must not substitute for the original; represent an original no-check state and handle legacy records conservatively without changing Claude behavior.

**Acceptance and verification:** targeted regressions reproduce both findings; cover changed, removed, and fallback checks, persistence through deferred fix, legacy missing metadata, and original no-check; environment tests prove unrelated variables do not reach the child. Then run relevant integration tests, full offline suite, build, and type-check; document any remaining limitations. No live provider/auth/consent action.

**Gate and next action:** implementation and offline checks are authorized. Resolve/reassess the local candidate in the next session; prepare an on-demand review packet only when requested, then stop for independent review. M1.2 remains separately gated.

**Out of scope:** real provider calls, changing credentials, granting repository consent, cross-platform fixture repair, or unrelated production refactoring.

### M1.2 — Real provider end-to-end demonstration

**Status:** **Pending, untested, blocked on separate explicit authorization.** No real Codex-to-cheap-worker provider workflow has been verified.

**Objective and deliverables:** demonstrate actual Codex → cheap-ag MCP → configured external worker → server verification in disposable Git repositories. Capture sanitized CLI/MCP events, matching jobs/sessions, selected model/policy, commands and exit results, patches, and repository-state evidence.

**Acceptance criteria:** (a) expected code and test land uncommitted only after passing executable server verification, preserving HEAD/index and unrelated files; (b) an impossible check exhausts bounded same-model repairs, retains failing evidence/worktree, and lands nothing. No model switch, automatic `land apply`, or source-repository target. Timeouts/caps/prerequisite failures are inconclusive, not successful negative evidence.

**Verification:** opt-in real CLI/provider run and manual audit of sanitized evidence, diffs, repository state, and process cleanup. Offline preparation and fake MCP tests do not satisfy this milestone.

**Dependencies and gates:** accepted M1.1 independent review plus separate explicit authorization **before any external provider calls, authentication changes, or repository consent actions**, including setup. Authorize the specific disposable repositories, provider/model, credential method, consent, and spend limits. Do not copy existing credentials. Stop if the actual scope differs.

**Out of scope:** cheap-ag source as a worker target, global installation, benchmarking claims, publication, and implementation changes beyond the approved demo scope.

**Independent review:** review sanitized live evidence before M1 completion or M2 approval.

## M2 — Installation and developer experience

**Status:** **Proposed, unimplemented.**

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
