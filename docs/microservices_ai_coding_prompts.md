# E-commerce & Order Fulfillment Platform --- AI Coding Prompt Playbook

Use this file alongside `docs/architecture-blueprint.md`. These prompts
are designed for Cursor, Claude Code, Windsurf, or another
repository-aware coding agent.

## How to use this playbook

1.  Create a Git repository and put the architecture blueprint at
    `docs/architecture-blueprint.md`.
2.  Open the repository root in your AI coding editor.
3.  Run the **Prompt 0** first. Then run prompts in order, one at a
    time.
4.  Let the editor inspect the repository before it edits files. Review
    the plan before allowing large changes.
5.  After each phase, run the verification commands and inspect the
    diff. Commit only when the phase passes.
6.  Do not tell the AI to skip tests, suppress errors, invent secrets,
    or mark unfinished work as complete.
7.  Keep `docs/implementation-status.md` updated at the end of every
    phase.

The blueprint is the architectural source of truth. If it conflicts with
an implementation idea, explain the conflict and propose an Architecture
Decision Record (ADR) rather than silently changing the design.

## Prompt 0 --- Establish project rules and inspect the blueprint

```text
Act as my staff/principal software engineer, solution architect, security reviewer, and pragmatic mentor. We are building an end-to-end e-commerce and order-fulfillment platform as a learning project with production-oriented engineering practices.

First inspect the complete repository and read docs/architecture-blueprint.md from beginning to end. Do not implement application features yet.

Goals:
- React + TypeScript Next js storefront and admin UI.
- Node.js + TypeScript Nest js backend services.
- PostgreSQL with clear service-owned data boundaries.
- Apache Kafka for asynchronous domain-event communication.
- Docker-based local development on Debian.
- Automated tests, observability, security controls, CI, and deployment documentation.

Rules:
1. Treat docs/architecture-blueprint.md as the source of truth.
2. Do not invent requirements, endpoints, Kafka topics, event fields, environment variables, or successful test results.
3. Prefer supported, stable versions and pin versions consistently. Explain major version choices.
4. Use strict TypeScript, input validation, structured errors, configuration validation, structured logging, and automated tests.
5. Do not store secrets in source control. Provide `.env.example` with placeholders only.
6. Never claim production readiness just because the app starts. Define evidence-based acceptance criteria.
7. Do not create all services in one giant change. Work phase by phase.
8. For every change, explain the architectural reason, files changed, commands run, results, risks, and follow-up items.
9. If a blueprint detail is ambiguous, list the ambiguity and ask me before making an irreversible or architecture-changing assumption.
10. Keep docs/implementation-status.md current with completed, in-progress, blocked, and not-started items.

Deliver now:
- A concise summary of the architecture found in the blueprint.
- A list of important design decisions and open questions.
- A proposed implementation sequence and acceptance gates.
- A proposed repository tree.
- Any contradictions or missing decisions you found.

Do not write application code until I approve this plan.
```

## Prompt 1 --- Repository foundation and engineering standards

```text
Implement Phase 1: repository foundation only. Re-read docs/architecture-blueprint.md and the agreed plan first.

Create the minimum repository scaffolding, root README, AGENTS.md (or the equivalent instructions file supported by this editor), .gitignore, .editorconfig, formatting/linting/type-checking configuration, and docs/implementation-status.md. Set up a consistent package manager and workspace strategy suitable for the agreed repository structure. Do not scaffold all business services yet.

Requirements:
- Strict TypeScript defaults where applicable.
- Reproducible dependency installation and a committed lockfile.
- Consistent formatting, linting, type checking, and test conventions.
- Clear commands documented in README.
- No real credentials or secrets.
- Small, reviewable changes.

Before editing, present the proposed file list and package/workspace choices. Then implement after explaining any consequential tradeoffs.

Verification: run the configured formatter check, linter, type checker, and baseline tests. Report exact commands and outcomes. Update implementation-status.md. Do not claim a command passed unless you ran it.
```

## Prompt 2 --- Debian developer environment and Docker baseline

```text
Implement Phase 2: local development infrastructure on Debian. Inspect the host and existing files first; do not change OS-wide settings or install software without asking me.

Create a minimal Docker Compose development environment for only the infrastructure needed by the first vertical slice: PostgreSQL and a single-node Kafka-compatible local broker configured in KRaft mode, unless the blueprint specifies a different approved choice. Pin images to explicit versions. Add health checks, named volumes, internal networking, sensible resource guidance, and documented ports.

Requirements:
- Provide `.env.example`; do not commit `.env`.
- Validate required environment variables at startup where practical.
- Add health checks and a documented clean reset procedure.
- Do not expose databases or Kafka publicly by default.
- Document how to start, inspect logs, check health, and stop services.
- Explain that a single broker is for local development and is not a highly available production cluster.

Run Compose config validation and start the infrastructure if the environment permits. Verify service health using real commands. If Docker is unavailable or permissions block execution, state that clearly and give me the exact commands to run. Update docs/implementation-status.md.
```

## Prompt 3 --- Shared contracts, configuration, and error conventions

```text
Implement Phase 3: shared technical foundations, not business features.

Define agreed conventions for:
- Environment/config parsing and startup validation.
- API error shape, correlation/request IDs, and safe error responses.
- Logging fields and redaction of secrets and personal/payment data.
- Health and readiness endpoints.
- API schema/versioning and validation.
- Event envelope metadata, event version, event ID, aggregate/entity ID, timestamp, correlation ID, causation ID, and trace context where appropriate.
- Shared TypeScript contracts only where sharing is safe; do not couple service internals through a giant shared domain package.

Use the blueprint as source of truth. Add tests for configuration validation, error serialization, and contract validation. Explain which types are shared and which domain models must remain service-owned. Do not create Kafka producers/consumers or business logic yet. Run all relevant checks and update implementation-status.md.
```

## Prompt 4 --- Catalog service and database

```text
Implement Phase 4: Catalog service as the first backend business service.

Before coding, summarize the blueprint requirements for catalog entities, API routes, validation, ownership, and persistence. Flag missing decisions.

Implement:
- A standalone Node.js + TypeScript service using the agreed server framework.
- PostgreSQL schema and versioned migrations.
- Catalog operations specified in the blueprint (for example, list/search products, get product, and authorized product administration only if in scope).
- Request validation, pagination, consistent errors, structured logs, correlation IDs, health/readiness endpoints, and configuration validation.
- Unit and integration tests against a real disposable test database where feasible.
- OpenAPI documentation or the repository's agreed API-contract format.
- Dockerfile suitable for local development and a production build, using a non-root runtime where practical.

Do not add fake production data, insecure admin endpoints, or unvalidated SQL. Use parameterized queries or a well-configured ORM. Add migration and seed commands; seed data must be explicitly development-only.

Acceptance criteria: migrations apply to an empty database; API behavior matches documented contracts; invalid inputs return safe 4xx responses; tests cover success, not-found, invalid input, and database failures. Run checks and report exact evidence. Update implementation-status.md.
```

## Prompt 5 --- Catalog API verification and API documentation

```text
Review the Catalog service as a skeptical API reviewer. Do not add new business scope.

Check API contracts, status codes, pagination, sorting allowlists, validation, SQL safety, error leakage, logging/redaction, migration safety, and test quality. Verify OpenAPI matches actual behavior. Add missing tests and fix confirmed defects.

Produce:
- A route-by-route API verification table.
- Example curl requests using placeholders or development-only sample IDs.
- A list of unresolved limitations.
- Commands and observed test results.

Do not report a security issue as fixed without showing the code/test evidence. Update docs/implementation-status.md.
```

## Prompt 6 --- Kafka foundation and event contracts

```text
Implement Phase 5: Kafka event infrastructure and contracts, without connecting business workflows yet.

Re-read the blueprint's event catalogue and architecture decisions. Create or refine documented event schemas for only the approved events. Define topic names, partition keys, retention/cleanup policies, consumer groups, retry strategy, dead-letter handling, schema compatibility rules, and ownership for each event. Do not invent fields silently.

Implement a small reusable Kafka integration layer with:
- Explicit producer and consumer configuration.
- Safe startup/shutdown and connection handling.
- Structured logs and correlation/trace metadata.
- Schema validation before publish and after consume.
- Bounded retries and clear handling for non-retryable messages.
- Idempotency expectations documented at the consumer boundary.
- Integration tests against the local broker when available.

Do not promise exactly-once business processing. Explain Kafka delivery semantics and how the application achieves effectively-once outcomes through idempotency, transactions where appropriate, and durable state.

Include sample event JSON and contract tests. Verify topic configuration and publish/consume a test event with real local infrastructure if available. Update docs/events/ and implementation-status.md.
```

## Prompt 7 --- React storefront foundation

```text
Implement Phase 6: React + TypeScript storefront foundation. Read the blueprint's wireframes, UX expectations, API contracts, and accessibility requirements.

Create the app with the agreed build tool and styling approach. Build the shared layout, routing, loading/empty/error states, responsive behavior, accessible navigation, API client, runtime configuration, and reusable UI primitives. Avoid premature abstraction and do not invent backend APIs.

Implement the catalog browsing/product detail flow against the real Catalog API. If the API is not running, use a clearly marked local mock adapter that can be removed or disabled; do not silently ship mock data as production behavior.

Add component tests and at least one browser-level smoke test if the repository supports it. Include accessible labels, keyboard navigation, safe rendering, and user-friendly errors. Do not store secrets in frontend environment variables; assume frontend-exposed variables are public.

Run lint, type checks, tests, and production build. Update README and implementation-status.md with exact commands/results.
```

## Prompt 8 --- Identity, authorization, and admin access

```text
Implement the approved identity and access-control design from the blueprint. If the blueprint does not specify an identity provider or authentication flow, stop and present viable options with tradeoffs before choosing.

Define authentication, session/token handling, role/permission model, admin route protection, service-to-service identity, token validation, expiration, logout/revocation expectations, and secure cookie/CORS/CSRF choices as applicable. Enforce authorization on the backend; frontend route guards are only a UX layer.

Requirements:
- No hardcoded credentials or demo backdoors.
- No insecure homemade cryptography.
- Validate issuer, audience, signature, expiry, and intended token use where applicable.
- Avoid logging tokens, passwords, session IDs, or sensitive payloads.
- Test unauthenticated, unauthorized, expired/invalid token, and authorized paths.
- Document local development identity setup without embedding secrets.

Do not invent a production identity provider or claim compliance. Run tests and update the security docs and implementation-status.md.
```

## Prompt 9 --- Order service and order lifecycle

```text
Implement Phase 7: Order service and its database, following the blueprint.

Start by documenting the order lifecycle and state-transition table. Implement service-owned persistence, migrations, order creation/read endpoints, validation, ownership/authorization checks, and explicit state transitions. Avoid a distributed transaction across service databases.

Use a stable client idempotency key for order creation. Define behavior for repeated requests with the same key and payload, and for conflicting payloads. Store money using a safe decimal/minor-unit strategy and explicit currency; never use floating-point arithmetic for monetary calculations. Validate quantities and product references. Do not trust prices supplied by the browser; obtain authoritative price data according to the approved design.

Add unit, integration, and API contract tests. Do not yet implement the complete payment or fulfillment saga. Explain consistency boundaries and failure behavior. Run checks, verify migrations from an empty database, and update implementation-status.md.
```

## Prompt 10 --- Inventory service and concurrency protection

```text
Implement Phase 8: Inventory service with its own schema and API, following the blueprint.

Support the approved inventory operations, including safe stock reservation and release. Protect against overselling under concurrent requests using a database-level strategy such as conditional updates, row locking, or another justified mechanism. Do not rely on a read-then-write sequence without concurrency protection.

Define reservation IDs, expiration/reconciliation behavior if required, state transitions, and idempotency semantics. Make reservation/release operations safe when the same command is delivered repeatedly. Validate quantities and ensure stock never becomes negative.

Add concurrency-focused integration tests that submit competing reservations for limited stock. Verify that total successful reservations cannot exceed available stock. Document database transaction boundaries and recovery behavior. Run checks and update implementation-status.md.
```

## Prompt 11 --- Transactional outbox and reliable event publishing

```text
Implement the approved transactional outbox pattern for the services that need to publish domain events.

The business state change and outbox record must be committed atomically in the same service database transaction. Build a publisher/relay with bounded retries, observable failures, safe shutdown, and duplicate-publication tolerance. Use stable event IDs. Do not publish an event first and then hope the database transaction succeeds.

Add integration tests for:
- Business transaction rollback creates no committed outbox event.
- Successful transaction creates the expected outbox record.
- Publisher restart/retry does not lose records.
- Duplicate delivery is tolerated by consumers.
- Failed publishing is visible and recoverable.

Document cleanup/retention rules and operational repair procedures. Do not claim the outbox eliminates all duplicates; explain its guarantees and limitations. Run tests and update implementation-status.md.
```

## Prompt 12 --- Saga orchestration and order workflow

```text
Implement Phase 9: the order workflow/saga exactly according to the blueprint's approved orchestration model. If choreography versus orchestration is unresolved, stop and present the tradeoffs first.

Model the workflow as explicit states and transitions, for example: pending, inventory-reserved, payment-pending, confirmed, rejected/cancelled, and compensation states, adjusted to the blueprint. Persist saga state and correlate every command/event using order ID, saga ID, correlation ID, and causation ID.

Requirements:
- Handle duplicate, delayed, and out-of-order events safely.
- Make every command handler idempotent.
- Define timeouts and bounded retries.
- Define compensating actions and their failure/retry path.
- Never assume a Kafka message and database update are one atomic transaction.
- Use outbox/inbox or equivalent durable patterns where needed.
- Add integration tests for success, inventory rejection, payment failure, duplicate events, service restart, timeout, and compensation failure.

Provide a sequence diagram and a state-transition table. Do not fake a successful workflow if a dependency is unavailable. Run the end-to-end integration test with local Kafka and databases where possible; report any untested paths honestly.
```

## Prompt 13 --- Payment service with a safe provider boundary

```text
Implement the Payment service using the blueprint's approved payment-provider integration. If no provider is selected, create a provider interface and a clearly labeled local sandbox adapter only; ask before selecting a real provider.

Requirements:
- Never store raw card numbers, CVVs, or sensitive payment credentials.
- Use the provider's official SDK/API and documented idempotency features where applicable.
- Verify provider webhook signatures and handle replay/duplicate delivery.
- Keep payment state transitions explicit and auditable.
- Apply timeouts, bounded retries, safe error mapping, and reconciliation for uncertain outcomes.
- Do not mark an order paid merely because the browser redirects to a success page.
- Keep provider secrets server-side and out of logs.
- Use fake/sandbox payment methods in automated tests.

Add tests for success, decline, timeout/unknown outcome, duplicate requests, webhook signature failure, replay, and provider outage. Explain how uncertain payment states are reconciled. Run tests and update implementation-status.md.
```

## Prompt 14 --- Fulfillment service and order status tracking

```text
Implement the Fulfillment service according to the blueprint. Keep its data and business rules service-owned.

Consume only approved events, validate event schemas, track event IDs in a durable inbox/deduplication store, and make processing idempotent. Implement the approved fulfillment lifecycle, such as ready-to-fulfill, packed, shipped, delivered, or exception, only if these states are in scope.

Define how tracking/status updates reach the order view without allowing the frontend to mutate fulfillment state directly. Handle duplicate events, retries, poison messages, and dead-letter operations with documented recovery procedures.

Add integration tests for valid events, duplicate delivery, invalid schema, transient dependency failure, and recovery/replay. Document event ownership and eventual consistency. Run checks and update implementation-status.md.
```

## Prompt 15 --- Admin experience and end-to-end storefront flow

```text
Implement the next approved UI increment: admin pages and the end-to-end shopper journey supported by the existing APIs. Do not create fake backend behavior to make a UI look complete.

Cover the in-scope user journey: browse catalog, view product, add to cart, submit order, view order status, and any approved payment/fulfillment steps. Add admin capabilities only where backend authorization and auditability exist.

Requirements:
- Accessible forms and useful validation messages.
- Loading, empty, retry, error, and success states.
- No secrets or authoritative business rules in the browser.
- No sensitive payment data in client logs or analytics.
- Resilient behavior when asynchronous status updates are delayed.
- Tests for the critical happy path and key failure paths.

Use browser tests against the real local stack where feasible. Record any mocked dependency explicitly. Run the production build and tests; update implementation-status.md.
```

## Prompt 16 --- Resilience, security, and threat modeling

```text
Conduct a threat-modeling and resilience phase across the implemented platform. Inspect code and infrastructure rather than assuming controls exist.

Review:
- Authentication and authorization boundaries.
- Input validation, injection, SSRF, XSS, CSRF, CORS, and security headers as applicable.
- Secret handling and log redaction.
- Dependency and container image risks.
- Rate limits, request size limits, timeouts, retry storms, circuit breaking where justified, and resource exhaustion.
- Kafka ACLs/TLS/authentication for production, topic permissions, consumer failure behavior, and dead-letter access.
- Database least privilege, migrations, backups, restore tests, and connection limits.
- Payment/webhook replay and idempotency.
- PII minimization, retention, deletion, and audit requirements.
- Supply-chain controls and CI permissions.

Create a prioritized findings list with severity, evidence, remediation, and regression test. Fix high-priority issues that are in scope. Do not claim penetration testing, legal compliance, or certification unless actually performed. Run security checks available in the repository and report their limitations.
```

## Prompt 17 --- Observability and operational dashboards

```text
Implement observability consistent with the blueprint.

Add structured logs, request IDs, trace/correlation propagation across HTTP and Kafka, and metrics for API latency/errors, Kafka consumer lag, publish/consume failures, outbox backlog, saga duration/failure, inventory reservation conflicts, payment outcomes, and database health where appropriate. Avoid high-cardinality labels and never include secrets, tokens, payment credentials, or unnecessary personal data in telemetry.

Use the smallest local observability stack justified by the environment's resources. Provide health/readiness checks and documented dashboards/alerts with actionable thresholds. Do not invent measurements or claim dashboards are validated if they have not been run.

Add a correlation example that traces one order across service logs and events. Test graceful shutdown and verify observability during a controlled failure. Document troubleshooting steps and update implementation-status.md.
```

## Prompt 18 --- Automated testing strategy and quality gates

```text
Audit and complete the testing strategy across the platform.

Create a test matrix covering:
- Unit tests for domain logic and state transitions.
- API integration tests with real disposable databases.
- Kafka integration tests.
- Consumer idempotency and outbox/inbox tests.
- Contract tests for APIs and event schemas.
- Saga and compensation tests.
- Concurrency tests for inventory.
- Payment sandbox/webhook tests.
- Browser-level end-to-end tests.
- Security and authorization tests.
- Migration tests from an empty database and, where practical, supported upgrade paths.

Use deterministic fixtures and isolated test data. Avoid sleeps where event polling or deterministic synchronization can be used. Ensure tests clean up after themselves. Establish CI gates for formatting, linting, type checks, tests, and production builds. Do not inflate coverage with meaningless tests or lower thresholds just to pass. Run the suite and report exact results, skipped tests, and environment limitations.
```

## Prompt 19 --- CI/CD and container hardening

```text
Implement CI/CD for the repository's actual hosting platform only after confirming the target. If hosting is not selected, prepare a provider-neutral build/test pipeline and list what must be decided.

Pipeline requirements:
- Reproducible install using the lockfile.
- Format, lint, type check, unit/integration tests, contract tests, and production build.
- Build each service image with pinned base images and non-root runtime where practical.
- Scan dependencies and images with available tools.
- Do not expose secrets in logs or pull-request jobs.
- Use least-privilege pipeline permissions.
- Tag images immutably and document promotion between environments.
- Use environment approvals for production deployment where supported.
- Document rollback and database migration compatibility.

Do not add fake deployment credentials or assume cloud resources exist. Validate the pipeline configuration and run local equivalents where possible. Update deployment documentation and implementation-status.md.
```

## Prompt 20 --- Deployment, backups, restore, and runbooks

```text
Prepare a deployment plan for the target environment that I confirm. Do not deploy or modify a real production system without my explicit approval.

Create environment-specific deployment manifests/configuration, secret references, networking rules, TLS requirements, resource requests/limits, health probes, graceful shutdown, persistent storage, Kafka configuration, and database migration steps. Separate local, staging, and production configuration.

Document:
- Initial deployment and upgrade.
- Database backup and a tested restore procedure.
- Kafka topic/configuration management and recovery.
- Secret rotation.
- Failed release rollback.
- Outbox backlog and dead-letter message investigation/replay.
- Stuck saga and payment reconciliation.
- Inventory reconciliation.
- Service outage and dependency outage.
- Incident severity, triage, and escalation.

Do not use a single-node local Kafka setup as a production high-availability design. Call out the operational responsibilities and costs of managed Kafka versus self-managed Kafka. Run configuration validation and restore drills where the environment permits; clearly identify what remains unverified.
```

## Prompt 21 --- Production-readiness review and architecture defense

```text
Perform a final skeptical production-readiness review. Do not add features unless a critical gap requires it and I approve the scope.

Evaluate the system against explicit evidence:
- Functional requirements and acceptance criteria.
- Service boundaries and database ownership.
- API and event contracts.
- Kafka delivery, retry, ordering, idempotency, replay, and dead-letter behavior.
- Saga transitions and compensation.
- Inventory oversell prevention.
- Payment safety and reconciliation.
- Authentication/authorization and secrets.
- Data privacy, retention, audit, and backup/restore.
- Performance/load behavior and capacity assumptions.
- Observability, alerts, dashboards, and operational runbooks.
- CI/CD, migration safety, rollback, and dependency/container scanning.
- Accessibility and end-to-end user journeys.

For each finding, include severity, evidence, user/business impact, remediation, owner, and verification test. Distinguish verified, partially verified, not tested, and not applicable. Never label the platform production-ready if critical controls are unverified.

Then act as an interview panel and ask me 15 senior architect-level questions about decisions made in this project, including Kafka, data consistency, Saga, outbox, idempotency, security, scaling, and disaster recovery. Ask one question at a time after presenting the readiness report.
```

## Prompt 22 --- Ongoing feature/change protocol

Use this prompt for each new feature or change after the core phases:

```text
Implement this change: [DESCRIBE THE CHANGE].

Before editing:
1. Read docs/architecture-blueprint.md, docs/implementation-status.md, and relevant ADRs, API specs, event schemas, tests, and runbooks.
2. Explain the affected services, data ownership, API/event contract changes, migration needs, security implications, and backward-compatibility risks.
3. Propose a small implementation plan and acceptance criteria.

Then implement only the approved scope. Add or update tests, contracts, migrations, observability, and documentation. Never silently break an existing API/event contract or edit another service's database directly. Run the relevant tests and checks, inspect the diff, update implementation-status.md, and report verified outcomes plus unresolved risks.
```

## Cross-phase review prompt --- use after every phase

```text
Act as an independent reviewer who did not write this phase. Compare the implementation with docs/architecture-blueprint.md and the phase's acceptance criteria.

Inspect actual source files, tests, configuration, migrations, and command results. Look for:
- Requirements that are missing or only stubbed.
- Fake/mock behavior accidentally used in non-test code.
- Incorrect Kafka assumptions, lost events, duplicate processing, unsafe retries, or missing idempotency.
- Security weaknesses, leaked secrets, weak validation, and unsafe authorization.
- Untested error paths and misleading health checks.
- Poor shutdown behavior, resource leaks, and hidden coupling.
- Documentation that claims behavior not implemented.
- Tests that pass without exercising the important behavior.

Fix confirmed issues within this phase's scope. Do not suppress tests or weaken acceptance criteria. Run the relevant checks again and report: findings, fixes, commands, observed results, remaining gaps, and whether the phase is accepted. Update docs/implementation-status.md.
```

## Definition of done for every phase

A phase is complete only when all applicable items are true:

- [ ] Acceptance criteria are written and met.
- [ ] Code is implemented; no unexplained TODOs or fake success paths
      remain.
- [ ] Unit and integration tests cover important success and failure
      paths.
- [ ] Lint, type check, tests, and build pass---or failures are
      clearly recorded.
- [ ] Configuration and secrets handling are safe.
- [ ] API/event contracts and migrations are documented.
- [ ] Logs, metrics, and failure handling are appropriate for the
      phase.
- [ ] README/runbooks/status documentation are updated.
- [ ] Changes have been reviewed and committed to Git.
- [ ] Known gaps and unverified behavior are explicitly listed.

## Recommended working cadence

For each phase:

1.  Ask the AI editor to inspect and propose a plan.
2.  Review the plan; correct assumptions before implementation.
3.  Implement one coherent slice.
4.  Run tests and inspect the diff.
5.  Run the independent cross-phase review prompt.
6.  Fix issues and rerun checks.
7.  Commit with a descriptive message.
8.  Update `docs/implementation-status.md`.
9.  Move to the next phase only after the acceptance gate passes.

## Important production note

This playbook aims for production-oriented code and a
production-readiness process. Actual production readiness depends on
real environment configuration, load and failure testing, security
review, operational ownership, backup/restore evidence, provider setup,
and business/legal requirements. Passing local tests alone is not proof
of production readiness.

# Microservices-specific upgrade — mandatory before implementation

The original prompts are a phase plan, not a guarantee that the platform is automatically a fully autonomous microservices system. Apply this addendum before Prompt 1. It closes the gaps between the broader service catalogue in the architecture blueprint and the shorter initial implementation sequence.

## Prompt A — Decide service autonomy and repository topology

```text
Before implementing features, compare the complete service catalogue in docs/architecture-blueprint.md with the proposed repository layout and all implementation prompts.

I want to learn genuine microservices architecture. Define measurable autonomy criteria for every service: business capability, owned data and migrations, API/event contracts, independent build/image/deployment, runtime configuration, identity/secrets, health/readiness, telemetry, SLO/runbook, and service-level plus contract tests.

Resolve the repository-topology decision explicitly:
- Option 1: service-oriented monorepo with independently buildable/deployable services and narrow shared packages.
- Option 2: multiple repositories as listed in the blueprint, with a developer bootstrap approach and versioned contracts.

Recommend one for this learning project, explain tradeoffs, and record the choice as an ADR. A monorepo is acceptable only if service boundaries and independent deployment remain real. Multiple repositories alone do not prove microservices quality.

Create a service catalogue with owner, responsibility, database ownership, synchronous APIs, produced events, consumed events, deployment unit, dependencies, and failure modes. Mark supporting repos (contracts/infra/tests) separately from domain services. Identify any service that is premature and explain the extraction criteria. Do not implement business features yet; wait for my approval.
```

## Prompt B — Microservice architecture review gate

```text
Act as an independent microservices architecture reviewer. Review the implemented repository against docs/architecture-blueprint.md and the ADRs.

Verify with source/config/test evidence:
- Each domain service has clear business ownership and no shared domain database.
- No service queries or writes another service's tables.
- No cross-service database transaction or hidden distributed lock.
- API and event contracts are versioned and compatibility-checked.
- Each service can build/test/package independently and has an independent deployment unit.
- Shared packages do not import or expose service internals.
- Synchronous dependency chains are short, timed out, and documented.
- Kafka consumers are idempotent; event publication is reliable; retries are bounded; poison events are observable and recoverable.
- Service startup/shutdown, health/readiness, configuration, secrets, metrics, logs, and trace propagation are implemented.
- Database migrations support rolling deployment and rollback strategy is documented.
- A failed or unavailable service does not cause misleading success responses or uncontrolled retry storms.

Report findings as verified, partially verified, failed, or not tested. Include exact evidence and tests needed. Do not use number of services or folder names as proof of autonomy. Fix only confirmed in-scope defects, rerun checks, and update docs/implementation-status.md.
```

## Required additional implementation increments

The original phases build a checkout-focused core. Add the following increments after the first end-to-end checkout workflow, in this order, so the blueprint's full service catalogue is actually implemented rather than merely documented:

1. **Pricing Service:** authoritative price quotes, promotions, quote expiry, money/currency handling, redemption limits, and price-change events.
2. **Cart Service:** cart ownership, concurrency/versioning, expiration, guest-to-user merge policy, and API contract.
3. **API Gateway/BFF:** edge routing, authentication enforcement, rate limits, request IDs, timeouts, safe aggregation, and no duplicated domain logic.
4. **Read Model Service:** event-driven order-history/operations projections, lag visibility, idempotent projection updates, and rebuild/reconciliation procedure.
5. **Search Service:** catalog-event consumers, rebuildable index, index versioning, eventual consistency, and full reindex workflow.
6. **Notification Service:** template/version management, provider adapters, retry policy, delivery records, and duplicate-notification strategy.
7. **Returns/Cancellation/Refund workflows:** policy-based state transitions, compensation, audit, payment reconciliation, and operations recovery.
8. **Independent deployment exercise:** deploy, roll back, and scale one service without rebuilding unrelated services; verify backward-compatible API/event changes.

For each increment, create a separate plan, acceptance criteria, tests, documentation updates, and review gate. Do not implement all increments in a single AI-editor request.

## Revised full-platform acceptance gate

Do not call the project a fully implemented microservices platform until all in-scope services in the blueprint are either implemented as independent runtime/deployment units or explicitly marked as deferred with a justified ADR. For every implemented service, provide evidence of data ownership, contracts, independent build/deployment, observability, security, failure handling, and tests. Production readiness is a separate gate requiring environment-specific load, security, restore, and operational validation.
