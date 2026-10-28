# Design: Local Commerce Microservices Platform

## Objective

Build the e-commerce and order-fulfillment platform described in
`docs/microservices_architecture_blueprint.md` as a local learning project. The user is an
experienced monolithic-application developer learning architect-level microservices practice.
Success is evidence that each implemented service owns its data, contracts, image, tests, and
deployment lifecycle, and that the checkout workflow remains correct under duplicate messages and
component failure.

## Tech Stack

- Frontend: Next.js, React, TypeScript.
- Backend: NestJS, Node.js, TypeScript.
- Persistence: PostgreSQL 16, one database and database role per service.
- Messaging: Apache Kafka 4.1.0 in KRaft mode for local development.
- Contracts: OpenAPI 3.1 for HTTP; JSON Schema event envelopes and payloads.
- Local platform: Docker Compose; every application retains its own Dockerfile.

## Commands

The `commerce-infra` README will provide the final commands. Expected baseline:

```sh
docker compose --env-file .env --project-directory . config
docker compose --env-file .env --project-directory . up -d
docker compose --env-file .env --project-directory . ps
docker compose --env-file .env --project-directory . down
```

Each service must document its own `lint`, `typecheck`, `test`, `build`, `start`, migration, and
image-build commands. Commands must work without another service except tests explicitly marked as
integration or end-to-end.

## Project Structure

- `services/<repository>/`: separate local Git repositories for domain services and applications.
- `docs/`: blueprint, ADRs, status, architecture artefacts and runbooks.
- `CAPABILITY-MAP.md`: stable module IDs and dependency direction.
- No repository imports another service's source tree or database schema.

## Code Style

Use strict TypeScript, constructor-injected ports/adapters, runtime request validation, structured
JSON logs, explicit error codes, and safe error responses.

```ts
// A service owns state and emits facts through its own outbox transaction.
async reserve(command: ReserveInventory): Promise<ReservationResult> {
  return this.transaction.run(async (tx) => {
    const result = await this.repository.reserveAtomically(tx, command);
    await this.outbox.record(tx, inventoryReservedEvent(result));
    return result;
  });
}
```

## Testing Strategy

- Unit-test domain rules and state transitions.
- Integration-test each service against its own disposable PostgreSQL database.
- Contract-test OpenAPI and JSON Schema compatibility.
- Integration-test Kafka producer/consumer, outbox/inbox, retries and idempotency.
- Add browser smoke and end-to-end tests only when the affected APIs exist.
- Do not label a check passed unless it was run and its output recorded.

## Boundaries

- Always: validate external input; use integer minor units for money; preserve service data
  ownership; use idempotency for consumer side effects; document and test every contract change.
- Ask first: network access; real payment/shipping/identity provider integration; destructive data
  resets; deployment outside local Docker; breaking API/event changes.
- Never: commit secrets; share a business database; query another service's tables; use raw card
  data; fake successful workflow state; claim production readiness from local tests.

## Success Criteria

- Each implemented service independently passes its local checks and builds an image.
- Each service uses its own PostgreSQL schema, migration lifecycle, credentials, and health checks.
- Browser applications call the Gateway only; browsers never connect to Kafka.
- API/event contracts are versioned and compatibility tested.
- Checkout uses a persisted Saga, transactional outboxes, durable inbox deduplication, bounded
  retry/DLQ behavior, and explicit compensation/reconciliation paths.
- Local failure drills show recovery from Kafka, consumer, and downstream-service interruptions.

## Open Decisions

- OIDC provider and protected-route policies.
- Payment provider, authorization/capture policy, and provider webhook protocol.
- Carrier provider and shipping policy.
- Cloud runtime, production Kafka topology, secrets manager, RPO/RTO, and legal/privacy policies.
