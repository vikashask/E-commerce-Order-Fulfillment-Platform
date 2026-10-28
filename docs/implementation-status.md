# Implementation status

Last updated: 2026-10-28

## Completed (verified locally)

- **Catalog service** (`services/commerce-catalog-service`, local Git repo)
  - Product list (search, pagination, sort allowlist) and product detail, published-only.
  - Validation with field-level 400 responses; safe 500 responses; request IDs; security headers.
  - Liveness and readiness endpoints; graceful SIGTERM shutdown.
  - Verified: `npm test` → 26 passed, 0 failed. Live server checked with curl (200, 400, 503 path covered by tests).

## In progress

- Nothing.

## Blocked

- Dockerfile build: `node:24-alpine` is not present locally and pulling it needs network access. The
  Dockerfile is written but unverified.

## Not started (in planned order)

1. Catalog → PostgreSQL adapter (`postgres:16` is available locally) with versioned migrations.
2. Contracts repository: OpenAPI for Catalog; event schemas.
3. Storefront (React + TypeScript) product browse/detail.
4. Pricing and Cart services.
5. Order service with idempotency, outbox, and Saga state.
6. Kafka foundation (`apache/kafka:4.1.0` available locally) and Inventory, Payment, Fulfillment.
7. Identity approach (decision required before protected behavior).
8. Gateway, Read Model, Search, Notifications, returns/refunds.
9. Independent deployment and rollback exercise.

## Open decisions

- Event schema format and compatibility tooling (JSON Schema proposed).
- Identity provider.
- Payment and shipping providers (sandbox-only until selected).
