# Codex delivery roadmap

Status vocabulary: **completed** means implemented with the stated evidence; **pending** means agreed work remains; **untested** means the required evidence is absent; **proposed** means scope needs a concrete plan and implementation approval. Review acceptance is distinct from passing tests. No milestone authorizes commits, pushes, publication, credentials changes, or paid calls by itself.

## Delivery principles and gates

Keep one shared engine with thin clients, preserve Claude Code and all six MCP schemas, reuse OpenCode/worktrees/server verification, preserve developer-owned repository consent and cost controls, and leave expensive escalation under Codex control. Deliver small increments with targeted tests, full offline regression checks and type-check. Prepare a review packet only on request, following AGENTS.md; stop for independent ChatGPT review at each checkpoint. Review findings need resolution or explicit disposition before progression. Later milestone designs are proposals, not blanket implementation approval.

## Milestone 1 — Core Codex integration

**Objective/scope:** Codex plans/delegates/reviews; a configured cheap worker implements in isolation; the shared server verifies and lands successful work uncommitted. Core implementation and offline verification are **completed** (425 passed, 8 skipped at the initial checkpoint). Independent review identified the two M1.1 findings below. Real provider orchestration is **untested**, and M1 is not accepted end to end.

**Deliverables:** explicit Codex startup and Claude-compatible legacy startup; unchanged six schemas; persistent client policies; required executable checks; bounded same-model repairs without automatic fallback/escalation; offline regressions; manual connection guide and gated smoke runner. M1.1 adds the review fixes; M1.2 supplies real evidence.

**Acceptance:** default Claude behavior and schemas pass regression checks; unapproved repositories create no delegation/research jobs or model calls; all selected Codex implementation groups require executable checks; success has nonempty passing server evidence and lands uncommitted with HEAD/index/unrelated bytes preserved; failed/capped work stays unlanded with evidence; policy survives replies, redo, and deferred integration through a later host. Both review findings must be resolved and independently reviewed. M1 acceptance additionally requires M1.2 evidence.

**Verification:** automated MCP/fake-worker tests plus existing real OpenCode/local scripted endpoint tests, build and type-check; manual inspection of policy, consent and patches; separately authorized actual CLI/provider proof. Historical Windows fixture failures do not block M1.1; cross-platform certification is deferred to M3.

**Dependencies/gates:** original architecture approved; M1.1 implementation authorized by the current request. Stop after M1.1 for independent review. M1.2 needs separate explicit authorization **before any external provider calls, authentication changes, or repository consent actions**, including setup that would perform them. Successful M1.1 review does not grant those permissions.

**Out of scope:** installers, hooks, native takeover, platform rewrites, paid benchmarking and publication.

**Independent review:** review core design and M1.1 fixes before authorizing M1.2; review actual M1.2 evidence before declaring M1 complete.

### M1.1 — Review hardening (completed implementation and offline verification; independent review pending)

1. Replace inherited live-runner environments with an explicit minimal environment. Unrelated provider credentials and configuration/loader/proxy overrides must not reach Codex or its worker child; isolated homes remain explicit. Cover the actual subprocess environment offline with synthetic credentials, including a stub child.
2. Capture the original integration verification command when a Codex batch starts, persist it including an explicit no-check value, and use that snapshot for deferred checks and fix jobs. Changed `integration_cmd`/`test_cmd` must not substitute or erase the original command. Define conservative behavior for older Codex records without a snapshot while preserving historical Claude behavior.

**Acceptance/verification:** new regressions reproduce both findings and pass after fixes; cover replaced/removed checks, configured `test_cmd` fallback, persistence across a later Claude host, original no-check state and missing legacy metadata; no unintended Claude changes; full offline suite, build and type-check pass. Update documentation and prepare a complete tracked/untracked review bundle. No live/auth/consent operations are part of this increment.

**Recorded M1.1 verification:** 62 targeted Codex/batch/landing tests and 2 environment tests passed; full offline suite 431 passed, 0 failed, 8 skipped (439 tests, 32 files), 39.68 seconds; build/typecheck and whitespace checks passed. No real provider, authentication or consent actions were performed.

**Review gate:** independent ChatGPT review of implementation, tests, and remaining risks. M1.2 stays pending and untested.

### M1.2 — Real provider demonstration (pending; untested; not authorized)

**Scope/deliverables:** use two disposable Git repositories outside cheap-ag source, isolated Codex/worker profiles, an explicitly chosen model and budgets, and developer-issued repository consent. Record installed CLI/auth method, actual MCP delegation events, matching worker sessions/jobs, patch, executed checks and exit results.

**Acceptance:** one successful task produces expected code/test, server verification passes, changes land uncommitted and HEAD/index/unrelated staged/unstaged/untracked bytes stay intact. A controlled impossible-check task exhausts bounded same-model repairs, retains failing evidence/worktree and never lands. No model switch, native takeover or automatic `land apply`; ambiguous timeouts use existing-job lookup rather than duplicate delegation. Caps/environment failures are incomplete proof, not an accepted negative case.

**Verification:** opt-in real CLI/provider runner and manual diff/evidence/state/process-cleanup review. No fixture preparation or fake MCP test alone proves this workflow.

**Gate/dependencies:** accepted M1.1 review plus separate explicit authorization for external calls, authentication changes and each developer consent action. Do not copy existing credential files. Stop if prerequisites, permissions, budget or model availability differ from the approved demonstration scope.

**Out of scope/review:** no source-repository worker target, global installation, benchmark claims or publication. Independently review sanitized evidence before M1 acceptance or M2 implementation approval.

## Milestone 2 — Codex installation and developer experience (proposed; unimplemented)

**Objective/scope:** repeatable local setup, connection, update and removal while preserving Claude coexistence and separate worker/orchestrator authentication.

**Deliverables:** concrete installer/registration design; explicit client setup; reuse of saved worker login; collision-safe registration respecting isolated/custom homes; manual fallback; optional focused workflow skill if approved; setup/troubleshooting/removal docs.

**Acceptance:** fresh install and rerun are deterministic; existing unrelated config and Claude registrations survive; missing CLI/login/model errors are actionable; updates/removal affect only owned assets; setup never grants repository consent or silently copies credentials; subscription orchestration does not require a worker's OpenAI API key.

**Verification:** automated stub CLI/config tests for fresh/repeated/failed setup, collisions, custom homes, paths/spaces, asset packaging and no-consent writes; manual clean-profile install/update/remove and Claude/Codex coexistence after approval. Any live calls or authentication actions require separate explicit authorization.

**Dependencies/gates:** reviewed M1 evidence; approve concrete setup, distribution and ownership plan before implementation; publication remains separately gated.

**Out of scope:** hooks, native agents, provider migration, global user policy changes and cost-savings claims.

**Independent review:** review installer security/config-preservation tests and clean-profile evidence before accepting developer experience or publishing.

## Milestone 3 — Reliability, security, portability and CI (proposed; pending)

**Objective/scope:** make the shared workflow dependable across supported OS/runtime combinations without weakening consent, permissions, verification or state preservation.

**Deliverables:** focused Windows fixture repairs already diagnosed; linked-worktree consent fix; explicit supported runtime/OS matrix; timeout/recovery/process ownership design; CI for core and packaged CLI; security boundary documentation and regression coverage.

**Acceptance:** documented Node/Ubuntu/Windows/macOS matrix passes deterministic checks; spaced paths/subdirectory/linked worktrees work; cancellation/shutdown leave no test-owned processes; failed/partial checks cannot falsely certify landing; concurrent landing preserves developer state; no credential leakage or consent bypass in defined threat cases; timeout recovery avoids duplicate jobs. Resolve or explicitly document unsupported behavior rather than weakening assertions.

**Verification:** CI build/typecheck/deterministic suites and packaged CLI smoke; local OS lifecycle, restart, contention, dirty-index and sandbox-permission probes; adversarial local permission/secret tests. Paid/live CI remains opt-in and separately authorized.

**Dependencies/gates:** approved reliability/security scope after reviewed M1; use M2 installer contracts where packaging is involved. Security changes and any semantic compatibility exceptions require independent review; do not infer broad refactor approval.

**Out of scope:** advanced orchestration, billing guarantees, benchmarking conclusions, mandatory Codex hooks and automatic native takeover.

**Independent review:** inspect threat model, matrix evidence, regressions and compatibility exceptions before declaring portability/reliability supported.

## Milestone 4 — Cost, usage, quality and performance benchmarking (proposed; untested)

**Objective/scope:** measure the fork's actual tradeoffs using repeatable tasks and grading, separating worker API spend from Codex subscription usage.

**Deliverables:** approved task set and hidden/independent checks; recorded model/config/runtime versions; per-task latency, worker usage/cost, verification/landing outcomes, correctness and orchestration overhead; reproducible methodology, raw-data retention and sanitized reports.

**Acceptance:** report successful and failed attempts, repairs/caps and uncertainty; comparisons use matched tasks and stated conditions; no extrapolation from Claude benchmarks; provider spend and subscription usage are not conflated; cost per verified correct task and latency distributions are reproducible. Declare unavailable usage measurements rather than inventing dollars.

**Verification:** automated accounting/parser/aggregation tests with synthetic data; deterministic grading checks; manually audit sampled traces and results. Real benchmark runs require explicit model/provider choices, spend/usage limits, repository/data consent and a separate paid-call authorization.

**Dependencies/gates:** reviewed functional workflow and adequate M3 measurement/reliability; approve benchmark protocol before collection and review analysis before public claims.

**Out of scope:** changing defaults based on anecdote, unbounded paid runs, guarantees of savings and native multi-agent implementation.

**Independent review:** review protocol before paid execution and results/quality grading afterward; publication requires separate approval.

## Milestone 5 — Optional advanced multi-agent orchestration (proposed; optional; unimplemented)

**Objective/scope:** explore explicit bounded multi-agent/takeover features only where evidence shows value. Preserve the shared engine, consent and server verification.

**Deliverables:** separately approved design for role/model selection, permissions, recursion prevention, cancellation, ownership and budget accounting; opt-in agents/hooks only with validated actual host contracts; verified completion path before automatic landing; comparative evaluation.

**Acceptance:** disabled by default; no silent expensive escalation or recursive delegation loops; account/model availability checked; aggregate usage and worker limits explicit; native-agent output cannot bypass server verification; failures/cancellation preserve state; Claude remains compatible. Enable only with developer-approved policy and evidence of benefit.

**Verification:** automated contract fixtures, unavailable-model/permission tests, budget/loop/cancellation and completion/landing tests; separately authorized manual host-hook/native-agent proofs and controlled evaluation. Native subagents are not assumed to be cheap external-provider workers.

**Dependencies/gates:** reviewed M1–M3 foundations and relevant M4 evidence; explicit decision to undertake this optional milestone and approve each paid/host-trust experiment. Hook trust, authentication, publication and consent changes remain separately controlled.

**Out of scope:** mandatory adoption, bypassing sandbox/approvals, unrestricted takeover, duplicated engines or unsupported cost claims.

**Independent review:** design review before implementation, security/usage review before enabling, and outcome review before accepting optional features.
