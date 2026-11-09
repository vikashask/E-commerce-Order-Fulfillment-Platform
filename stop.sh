#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  STOPPING E-COMMERCE PLATFORM                                         ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Stop frontends
echo -e "${YELLOW}Stopping frontends...${NC}"
for port in 3080 3090; do
  pids=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "  Killing processes on port $port (PIDs: $pids)"
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
done
echo -e "${GREEN}✓ Frontends stopped${NC}"
echo ""

# Stop backend services
echo -e "${YELLOW}Stopping backend services...${NC}"
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011; do
  pids=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "  Killing processes on port $port (PIDs: $pids)"
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
done
echo -e "${GREEN}✓ Backend services stopped${NC}"
echo ""

# Stop infrastructure
echo -e "${YELLOW}Stopping infrastructure (PostgreSQL + Kafka)...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/services/commerce-infra"
docker compose down
echo -e "${GREEN}✓ Infrastructure stopped${NC}"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ALL SERVICES STOPPED                                                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
