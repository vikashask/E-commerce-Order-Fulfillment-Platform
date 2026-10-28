# ADR-002: Next.js and NestJS Technology Baseline

- Status: Accepted
- Date: 2026-10-28
- Owners: Platform learning project

## Context

The blueprint and prompt playbook require React/TypeScript Next.js applications and
Node.js/TypeScript NestJS services. An early local Catalog prototype used Node's built-in HTTP
server and in-memory storage. It is useful only as an exploratory reference and does not satisfy
the agreed service acceptance criteria.

## Decision

- All browser applications use Next.js, React, and TypeScript.
- All backend domain services use NestJS on Node.js and TypeScript.
- Each backend service owns PostgreSQL persistence, migrations, health/readiness, tests, Dockerfile,
  runtime configuration, and local Git repository.
- The current Catalog prototype will be replaced, not extended, during the Catalog implementation
  task.

## Consequences

- The team accepts framework and local package-cache setup work before business implementation.
- No service is accepted merely because a prototype starts locally.
- Any exception must be recorded in a new ADR and explain its effect on service autonomy.

## Validation

- Each backend service exposes its implementation through a NestJS module and independently passes
  documented build/test checks.
- Each web application builds with Next.js and uses only documented public gateway contracts.
