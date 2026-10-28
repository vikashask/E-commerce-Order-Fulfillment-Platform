# Commerce Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the local contracts, infrastructure, and NestJS/Next.js baseline needed for the first independently deployable catalog-browse slice.

**Architecture:** Separate local Git repositories retain independent dependency manifests, test
suites, Dockerfiles, data stores and release commands. `commerce-infra` coordinates only local
dependencies. `commerce-contracts` owns versioned public contracts; service internals are never
shared.

**Tech Stack:** Docker Compose, PostgreSQL 16, Apache Kafka 4.1 KRaft, NestJS, Node.js,
TypeScript, Next.js, React, JSON Schema, OpenAPI 3.1.

**Spec:** `docs/superpowers/specs/2026-10-28-local-commerce-platform-design.md`

## Global Constraints

- Use no network access; install packages only from the verified local npm cache.
- Use Node.js 24 and pinned Docker images already present locally.
- Never place a database password or other secret in source control.
- Keep service data, migrations and domain types service-owned.
- Do not mark Docker/image verification complete until the command actually succeeds.

## Review Focus

- Missing or malformed configuration must fail at startup without exposing secrets.
- A caller cannot obtain a draft catalog product through a public endpoint.
- A storage outage must make readiness fail and must not leak internal errors.
- API clients receive stable error shape and request IDs for invalid routes and input.
- Every later event/HTTP contract change must retain old-consumer compatibility or publish a new version.

---

### Task 1: Rebaseline project documentation and existing Catalog prototype

**Files:**
- Modify: `docs/implementation-status.md`
- Create: `docs/adr/ADR-002-technology-baseline.md`
- Modify: `services/commerce-catalog-service/README.md`

**Interfaces:**
- Consumes: the blueprint and the local platform design.
- Produces: a truthful status that distinguishes the discarded prototype from an accepted service.

- [ ] Record that the existing Node built-in Catalog prototype is not the NestJS/PostgreSQL
  implementation required by the blueprint.
- [ ] Record NestJS/Node.js and Next.js/React/TypeScript as the accepted baseline.
- [ ] Run `git -C services/commerce-catalog-service status --short` and commit documentation only
  in the repository it changes.

### Task 2: Create `commerce-infra` local repository

**Files:**
- Create: `services/commerce-infra/compose.yaml`
- Create: `services/commerce-infra/.env.example`
- Create: `services/commerce-infra/README.md`
- Create: `services/commerce-infra/.gitignore`

**Interfaces:**
- Consumes: local images `postgres:16` and `apache/kafka:4.1.0`.
- Produces: internal Docker network, Catalog PostgreSQL database, Kafka KRaft listener, health checks and documented safe reset.

- [ ] Write Compose config with no host exposure for broker or database by default.
- [ ] Run `docker compose config` and bring up only infrastructure.
- [ ] Verify container health using real `docker compose ps` and database/Kafka commands.
- [ ] Commit `commerce-infra` separately.

### Task 3: Create `commerce-contracts` local repository

**Files:**
- Create: `services/commerce-contracts/openapi/catalog.v1.yaml`
- Create: `services/commerce-contracts/events/event-envelope.v1.schema.json`
- Create: `services/commerce-contracts/README.md`
- Create: `services/commerce-contracts/test/*.test.ts`

**Interfaces:**
- Produces: `CatalogProduct`, `CatalogProductPage`, standard error response, and versioned event envelope contracts.
- Consumers: Catalog, Gateway, Storefront, and eventual Kafka producers/consumers.

- [ ] Add contract tests that validate catalog examples and envelope-required metadata.
- [ ] Run the contract tests from the contracts repository.
- [ ] Commit `commerce-contracts` separately.

### Task 4: Rebuild Catalog as a NestJS + PostgreSQL service

**Files:**
- Replace: `services/commerce-catalog-service/src/**`
- Create: `services/commerce-catalog-service/migrations/**`
- Create: `services/commerce-catalog-service/openapi/**`
- Modify: `services/commerce-catalog-service/Dockerfile`
- Test: `services/commerce-catalog-service/test/**`

**Interfaces:**
- Consumes: Catalog OpenAPI contract and `CATALOG_DATABASE_URL`.
- Produces: `GET /api/v1/products`, `GET /api/v1/products/{id}`, liveness/readiness, versioned migrations and development-only seed command.

- [ ] Write failing integration tests for published listing/detail, draft non-disclosure, invalid
  pagination, migration from an empty database, and unavailable database readiness.
- [ ] Implement a NestJS module with parameterized PostgreSQL access and migration runner.
- [ ] Run service unit/integration/contract checks and verify the API against a real local database.
- [ ] Build the service image and commit it separately.

### Task 5: Create the first Next.js storefront increment

**Files:**
- Create: `services/commerce-web/app/**`
- Create: `services/commerce-web/lib/catalog-client.ts`
- Create: `services/commerce-web/test/**`
- Create: `services/commerce-web/Dockerfile`

**Interfaces:**
- Consumes: Catalog contract through the Gateway URL (Gateway temporary passthrough is explicit).
- Produces: responsive product list and product detail pages with loading, empty and error states.

- [ ] Add component/browser tests for product list, product detail, and API error display.
- [ ] Implement pages without mock production behavior.
- [ ] Run lint, typecheck, tests, production build and browser smoke test.
- [ ] Commit `commerce-web` separately.

### Checkpoint: Catalog browse slice

- [ ] Infrastructure config and health are verified.
- [ ] Contracts tests pass.
- [ ] Catalog migration applies to an empty database.
- [ ] NestJS Catalog and Next.js storefront pass their documented checks.
- [ ] Service is independently image-buildable and a browser displays real Catalog data.
