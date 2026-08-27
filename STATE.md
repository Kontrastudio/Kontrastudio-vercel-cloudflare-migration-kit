# Vercel to Cloudflare Migration Kit State

<!-- production_state:start -->
```yaml
production:
  applicability: "none"
  runtime_target: "none"
  production_url: "none"
  deployment_status: "not_applicable"
  deployed_sha: "not_applicable"
  verified_at: "2026-08-28"
  verification_method: "repository role classification: migration tooling, not a deployed application"
  verification_run: "not_applicable"
  drift: "none"
```
<!-- production_state:end -->

state_version: 2
last_updated: 2026-08-28
repository_verified_at: 2026-08-28
status: migration_tooling
current_phase: extract_and_prove_migration_protocol

## State Interpretation

This repository is operational tooling, not a production application. Its own state therefore records protocol/tooling maturity rather than pretending that the repository has a runtime deployment. Production evidence belongs to each target repository being migrated.

## Objective

The kit provides conservative, production-safe tooling for moving existing Next.js sites from Vercel to Cloudflare Workers without treating a successful build as proof of production equivalence.

Its migration discipline is:

1. audit before adaptation
2. candidate before cutover
3. behavioral equivalence before production ownership changes
4. rollback-aware staged cutover
5. independent public-host verification before declaring migration complete

## Sources of Truth

- project state: `STATE.md`
- canonical implementation: repository `main`
- migration/tooling contract: `README.md`
- manifest schema: `migration.schema.json`
- baseline capture: `scripts/capture-baseline.mjs`
- domain guard: `scripts/guard-domains.mjs`
- equivalence verifier: `scripts/verify-equivalence.mjs`
- real-world regression fixtures: `examples/`

Target-repository state, DNS/provider evidence and public runtime verification remain authoritative for an individual migration.

## Current System

The toolkit currently supports baseline capture, explicit host manifests, protected sibling hosts, candidate verification, behavioral equivalence checks, image-path/runtime probing, rollback-aware DNS facts and guarded production scope.

The migration state machine is conceptually:

`AUDITED → PREPARED → CANDIDATE_DEPLOYED → CANDIDATE_VERIFIED → WWW_CUTOVER → WWW_VERIFIED → APEX_CUTOVER → PRODUCTION_VERIFIED → ROLLBACK_HELD → MIGRATION_COMPLETE`

A target may use a different hostname order, but verification gates should not be skipped accidentally.

## Core Guarantees

- exact production hostnames are explicit; wildcard scope fails closed unless deliberately added later
- protected sibling services are not absorbed by the migrating Worker
- secrets remain in target CI/accounts, not manifests
- rollback DNS values are captured from evidence rather than memory
- candidate success is not treated as production success
- provider deployment success is not treated as public-host equivalence
- production is not declared migrated until the real public hostname is independently verified
- adapter choice remains an audit result rather than a hard-coded global assumption

## Current Priorities

1. Keep extracting common migration logic from the Theo and Kontrastudio website migrations.
2. Turn repeated hand-written checks into manifest-driven reusable tooling only where behavior is genuinely common.
3. Preserve target-specific escape hatches for unusual DNS, middleware, API, image and sibling-service behavior.
4. Keep rollback evidence first-class.
5. Add regression fixtures whenever a real migration exposes a new failure mode.

## Known Issues

The repository remains `v0.1-dev`; it is intentionally conservative and not a one-click migration product. Missing generality is not itself a defect unless a proven migration pattern should clearly be reusable and safely expressible.

## Autonomy

AI may inspect, test and improve migration tooling on reversible branches, add regression fixtures from already-understood safe cases, and maintain this state file. Explicit approval remains required before using the kit to make a new destructive DNS/domain change that has not already been authorized for a target repository.

## State Maintenance Rules

The production block remains `not_applicable` unless this repository itself is deliberately turned into a deployed service. Update the human-maintained sections when the protocol maturity, supported migration classes, safety boundaries or known current limitations materially change. Do not turn this file into a migration log; target repositories own their migration evidence.

## Definition of Done for Current Phase

- the two real website migrations are represented without special-case loss of safety
- repeated verification logic is reusable through manifests
- rollback/protected-host behavior remains explicit
- new target migrations can start from the kit without copying a large one-off workflow
- target repositories continue to own exact deployment and production truth
