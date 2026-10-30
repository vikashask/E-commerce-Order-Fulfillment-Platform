# AGENTS.md

Local, multi-repository microservices learning project. Source of truth:
`docs/microservices_architecture_blueprint.md`; phase plan: `docs/microservices_ai_coding_prompts.md`;
status: `docs/implementation-status.md`.

## Rules

- Each directory under `services/` is its own Git repository and deployment unit. Never import code
  from another service's source tree and never read or write another service's database.
- Only versioned contracts are shared, via `services/commerce-contracts`.
- Frontend: Next.js + React + TypeScript. Backend: NestJS + Node.js + TypeScript. PostgreSQL per
  service. Kafka for asynchronous events.
- No remotes, no pushes, no cloud deployment. npm registry downloads are approved; install with
  `pnpm install --frozen-lockfile --ignore-scripts` (pnpm blocks install scripts; keep it that way).
- Never commit `.env` or secrets. Money is integer minor units. Never claim a check passed without
  running it and reading the full output.

## Environment notes

- Docker Desktop on this Mac sometimes stops; start it with `open -a Docker` and wait for `docker info`.
- Local images used: `postgres:16`, `apache/kafka:4.1.0`, `node:20-alpine` (no pulls needed).
- `services/commerce-infra` runs shared local infrastructure on the internal `commerce-internal` network
  (no host ports). Each service's tests use their own disposable containers on loopback ports.

## Per-service verification

Every backend service provides `scripts/ci.sh`: frozen install, format check, lint, typecheck, tests
on real dependencies, build, image build. Run it before committing that service.

| Repository | Verify |
|---|---|
| `commerce-infra` | `docker compose --env-file .env config && docker compose --env-file .env up -d --wait` |
| `commerce-contracts` | `npm test` |
| `commerce-catalog-service` | `./scripts/ci.sh` (test DB on 127.0.0.1:55432) |
