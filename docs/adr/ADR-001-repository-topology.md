# ADR-001: Repository topology

- Status: Accepted
- Date: 2026-10-28
- Owners: Platform learning project

## Context
The blueprint lists one repository per service. The goal is to learn genuine microservices
boundaries, independent builds, and independent deployment. Everything runs locally; no remote
hosting is used.

## Decision
- Each domain service is its own Git repository under `services/<name>/`, with its own
  dependency manifest, tests, Dockerfile, and README.
- Supporting repositories (`contracts`, `infra`, `e2e-tests`) follow the same pattern when created.
- No shared domain library. Only versioned contracts may be shared.
- Local-only: `git init` per repository; no remote configured.

## Alternatives
- Single monorepo: simpler tooling, but boundaries become easier to blur. Rejected for this goal.
- Shared domain package: rejected; couples service internals.

## Consequences
- Each service must carry its own tooling and tests (some duplication is accepted).
- Cross-service changes need explicit contract versioning.
- Compose may start several containers for integration, but this does not couple release lifecycles.

## Validation
- Each service runs `npm test` with no other service running.
- Each service builds its image from its own directory.
