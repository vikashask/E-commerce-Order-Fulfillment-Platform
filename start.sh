#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICES_DIR="$SCRIPT_DIR/services"
INFRA_DIR="$SERVICES_DIR/commerce-infra"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  STARTING E-COMMERCE PLATFORM                                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Start infrastructure
echo -e "${YELLOW}Step 1: Starting infrastructure (PostgreSQL + Kafka)...${NC}"
cd "$INFRA_DIR"
docker compose up -d --wait
echo -e "${GREEN}✓ Infrastructure started${NC}"
echo ""

# Get DB password
PG_PASS=$(docker exec commerce-local-catalog-postgres-1 printenv POSTGRES_PASSWORD 2>/dev/null || echo "localdev123")
PG_USER="commerce_platform"

# Step 2: Start backend services
echo -e "${YELLOW}Step 2: Starting backend services...${NC}"

# Kill any existing processes on our ports
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3000; do
  lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 1

# Catalog (uses CATALOG_DATABASE_URL)
cd "$SERVICES_DIR/commerce-catalog-service"
CATALOG_DATABASE_URL="postgres://$PG_USER:$PG_PASS@127.0.0.1:5501/catalog" PORT=3001 KAFKA_BROKERS=127.0.0.1:9092 \
  node dist/main.js > /tmp/catalog.log 2>&1 &
echo "  ✓ Catalog (3001)"

# All other services use DATABASE_URL
for entry in \
  "commerce-identity-service 3002 identity 5502" \
  "commerce-pricing-service 3003 pricing 5503" \
  "commerce-cart-service 3004 cart 5504" \
  "commerce-order-service 3005 orders 5505" \
  "commerce-inventory-service 3006 inventory 5506" \
  "commerce-payment-service 3007 payment 5507" \
  "commerce-fulfillment-service 3008 fulfillment 5508" \
  "commerce-notification-service 3009 notification 5509" \
  "commerce-search-service 3010 search 5510" \
  "commerce-readmodel-service 3011 readmodel 5511"; do
  read -r svc port db dbport <<< "$entry"
  cd "$SERVICES_DIR/$svc"
  DATABASE_URL="postgres://$PG_USER:$PG_PASS@127.0.0.1:$dbport/$db" PORT=$port JWT_SECRET=local-dev-jwt-secret-2026 \
    node dist/main.js > "/tmp/${svc}.log" 2>&1 &
  echo "  ✓ $svc ($port)"
done

# API Gateway
cd "$SERVICES_DIR/commerce-api-gateway"
PORT=3000 node --import tsx src/main.ts > /tmp/gateway.log 2>&1 &
echo "  ✓ API Gateway (3000)"

echo -e "${GREEN}✓ Backend services started${NC}"
echo ""

# Step 3: Start frontends
echo -e "${YELLOW}Step 3: Starting frontends...${NC}"

for port in 3080 3090; do
  lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 1

cd "$SERVICES_DIR/commerce-web"
NEXT_PUBLIC_API_URL="http://127.0.0.1:3000/api/v1" PORT=3080 \
  pnpm run dev > /tmp/storefront.log 2>&1 &
echo "  ✓ Storefront (3080)"

cd "$SERVICES_DIR/commerce-ops-web"
NEXT_PUBLIC_API_URL="http://127.0.0.1:3000/api/v1" PORT=3090 \
  pnpm run dev > /tmp/ops.log 2>&1 &
echo "  ✓ Ops Dashboard (3090)"

echo -e "${GREEN}✓ Frontends started${NC}"
echo ""

# Step 4: Wait for services to be ready
echo -e "${YELLOW}Step 4: Waiting for services to be ready...${NC}"
sleep 10

# Health checks
echo -e "${YELLOW}Health checks:${NC}"
ALL_OK=true
for entry in "catalog:3001" "identity:3002" "pricing:3003" "cart:3004" "order:3005" "inventory:3006" "payment:3007" "fulfillment:3008" "notification:3009" "search:3010" "readmodel:3011" "gateway:3000"; do
  name=${entry%%:*}
  port=${entry##*:}
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$port/health/live" 2>/dev/null || echo "FAIL")
  status="OK"
  if [ "$code" != "200" ]; then status="FAIL($code)"; ALL_OK=false; fi
  printf "  %-15s :%-5s -> %s\n" "$name" "$port" "$status"
done

# Frontend checks
for entry in "storefront:3080" "ops:3090"; do
  name=${entry%%:*}
  port=${entry##*:}
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$port" 2>/dev/null || echo "FAIL")
  status="OK"
  if [ "$code" != "200" ]; then status="FAIL($code)"; ALL_OK=false; fi
  printf "  %-15s :%-5s -> %s\n" "$name" "$port" "$status"
done

echo ""
if [ "$ALL_OK" = true ]; then
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ALL SERVICES STARTED SUCCESSFULLY                                    ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${GREEN}Access points:${NC}"
  echo -e "  🛒 Storefront:    ${YELLOW}http://127.0.0.1:3080${NC}"
  echo -e "  📊 Ops Dashboard: ${YELLOW}http://127.0.0.1:3090${NC}"
  echo -e "  🔌 API Gateway:  ${YELLOW}http://127.0.0.1:3000/api/v1${NC}"
  echo ""
  echo -e "${YELLOW}To stop all services, run: ./stop.sh${NC}"
else
  echo -e "${RED}Some services failed to start. Check logs in /tmp/*.log${NC}"
fi
