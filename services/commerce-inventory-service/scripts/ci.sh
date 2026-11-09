#!/bin/bash
set -euo pipefail
echo "=== CI: ${SVC_NAME} ==="
STAGE=0
stage() { STAGE=$((STAGE+1)); echo ""; echo "[$STAGE/6] $1"; }

stage "Install"
pnpm install --frozen-lockfile --ignore-scripts

stage "Format + Lint + Typecheck"
npx prettier --check .
npx eslint .
npx tsc --noEmit

stage "Start test DB"
docker compose -f docker-compose.test.yaml up -d --wait

stage "Tests"
npm test

stage "Build"
pnpm run build

stage "Docker image"
TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
docker build -t "${SVC_NAME}:${TAG}" .

echo ""; echo "CI passed. Image: ${SVC_NAME}:${TAG}"
