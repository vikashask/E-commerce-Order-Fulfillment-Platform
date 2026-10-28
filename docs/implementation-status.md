# Implementation status

Last updated: 2026-10-28

## Foundations (verified locally)

- **Architecture documentation**
  - Local multi-repository topology is accepted in ADR-001.
  - Next.js/React frontend and NestJS/Node.js backend are accepted in ADR-002.

## Prototype work (not accepted as a platform phase)

- **Catalog prototype** (`services/commerce-catalog-service`, local Git repository)
  - A dependency-free Node built-in HTTP server demonstrated public product list/detail behavior.
  - `npm test` ran with 26 passing tests; live curl checks returned expected 200/400/readiness
    responses and SIGTERM was observed.
  - It is **not** the required implementation: it does not use NestJS or PostgreSQL, lacks
    migrations/OpenAPI/contract repository integration, and has not built an image.
  - It will be replaced by the Catalog NestJS/PostgreSQL task; do not treat it as Phase 4 complete.

## In progress

- Nothing.

## Blocked

- Dockerfile build: `node:24-alpine` is not present locally and pulling it needs network access. The
  Dockerfile is written but unverified.

## Not started (in planned order)

1. Infrastructure and contracts repositories.
2. Catalog NestJS/PostgreSQL replacement plus first Next.js storefront slice.
3. Pricing, Cart, Gateway, and Order.
4. Kafka foundation, Inventory, Payment, and durable Saga workflow.
5. Identity approach (decision required before protected behavior).
6. Fulfillment, Read Model, Search, Notifications, returns/refunds, and operations UI.
7. Independent deployment and rollback exercise.

## Open decisions

- Event schema format and compatibility tooling (JSON Schema proposed).
- Identity provider.
- Payment and shipping providers (sandbox-only until selected).
