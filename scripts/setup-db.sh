#!/bin/bash
# ============================================================
# TMH Platform — Database Setup Script
# Sets up the schema and seeds data on a fresh Supabase database.
#
# Usage:
#   DATABASE_URL="postgresql://..." ./scripts/setup-db.sh
#
# Or set DATABASE_URL in artifacts/api-server/.env first, then:
#   ./scripts/setup-db.sh
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "  TMH Platform — Database Setup"
echo "========================================"
echo ""

# ── 1. Resolve DATABASE_URL ──────────────────────────────────

if [ -z "${DATABASE_URL:-}" ]; then
  # Try loading from api-server .env
  ENV_FILE="$(dirname "$0")/../artifacts/api-server/.env"
  if [ -f "$ENV_FILE" ]; then
    DB_LINE=$(grep '^DATABASE_URL=' "$ENV_FILE" || true)
    if [ -n "$DB_LINE" ]; then
      export DATABASE_URL="${DB_LINE#DATABASE_URL=}"
      echo -e "${GREEN}Loaded DATABASE_URL from artifacts/api-server/.env${NC}"
    fi
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${RED}ERROR: DATABASE_URL is not set.${NC}"
  echo ""
  echo "Set it inline:"
  echo "  DATABASE_URL=\"postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres\" ./scripts/setup-db.sh"
  echo ""
  echo "Or add it to artifacts/api-server/.env"
  exit 1
fi

# Basic validation
if [[ ! "$DATABASE_URL" =~ ^postgres ]]; then
  echo -e "${RED}ERROR: DATABASE_URL doesn't look like a PostgreSQL connection string.${NC}"
  echo "  Got: $DATABASE_URL"
  exit 1
fi

echo -e "Database: ${YELLOW}${DATABASE_URL%%@*}@...${NC} (truncated for security)"
echo ""

# ── 2. Push Drizzle schema ───────────────────────────────────

echo "Step 1/3 — Pushing database schema..."
echo "  Running: pnpm --filter @workspace/db run push"
echo ""

pnpm --filter @workspace/db run push

echo ""
echo -e "${GREEN}Schema pushed successfully.${NC}"
echo ""

# ── 3. Seed CMS data (predictions, pulse, configs) ──────────

echo "Step 2/3 — Seeding CMS data (predictions, pulse topics, design tokens, site config)..."
echo "  Running: pnpm --filter @workspace/db exec tsx src/seed-cms-standalone.ts"
echo ""

# seed-cms.ts exports seedCmsData() — we need a standalone runner
node -e "
  process.env.DATABASE_URL = '$DATABASE_URL';
  import('@workspace/db/seed-cms').then(m => m.seedCmsData()).then(() => {
    console.log('');
    console.log('CMS seed complete.');
    process.exit(0);
  }).catch(err => {
    console.error('CMS seed failed:', err);
    process.exit(1);
  });
" 2>/dev/null || \
pnpm --filter @workspace/api-server exec tsx -e "
  import { seedCmsData } from '@workspace/db/seed-cms';
  seedCmsData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
"

echo ""
echo -e "${GREEN}CMS data seeded successfully.${NC}"
echo ""

# ── 4. Seed Majlis test data (optional) ─────────────────────

echo "Step 3/3 — Seeding Majlis test data (test users, channels, messages)..."
echo ""

if [ "${SKIP_MAJLIS_SEED:-}" = "1" ]; then
  echo -e "${YELLOW}Skipped (SKIP_MAJLIS_SEED=1).${NC}"
else
  # Majlis seed needs MAJLIS_ENCRYPTION_KEY
  if [ -z "${MAJLIS_ENCRYPTION_KEY:-}" ]; then
    # Try loading from .env
    ENV_FILE="$(dirname "$0")/../artifacts/api-server/.env"
    if [ -f "$ENV_FILE" ]; then
      KEY_LINE=$(grep '^MAJLIS_ENCRYPTION_KEY=' "$ENV_FILE" || true)
      if [ -n "$KEY_LINE" ]; then
        export MAJLIS_ENCRYPTION_KEY="${KEY_LINE#MAJLIS_ENCRYPTION_KEY=}"
      fi
    fi
  fi

  if [ -z "${MAJLIS_ENCRYPTION_KEY:-}" ]; then
    echo -e "${YELLOW}WARNING: MAJLIS_ENCRYPTION_KEY not set — generating a temporary one for seeding.${NC}"
    export MAJLIS_ENCRYPTION_KEY=$(openssl rand -hex 32)
    echo -e "${YELLOW}  Generated: $MAJLIS_ENCRYPTION_KEY${NC}"
    echo -e "${YELLOW}  Save this key! You'll need the same key in Railway env vars to decrypt messages.${NC}"
    echo ""
  fi

  pnpm --filter @workspace/db run seed:majlis

  echo ""
  echo -e "${GREEN}Majlis data seeded successfully.${NC}"
fi

# ── Done ─────────────────────────────────────────────────────

echo ""
echo "========================================"
echo -e "  ${GREEN}Database setup complete!${NC}"
echo "========================================"
echo ""
echo "Tables created and seeded:"
echo "  - 230 predictions across 10 categories"
echo "  - 56 pulse topics with live data"
echo "  - 13 design tokens"
echo "  - 12 CMS config entries (homepage, pages, settings)"
echo "  - 8 speaker/founder profiles"
echo "  - 7 polls with 24 options"
echo "  - 5 Majlis test users, 4 channels, 30+ messages"
echo ""
echo "Next steps:"
echo "  1. Deploy to Railway (see DEPLOYMENT.md)"
echo "  2. Set environment variables in Railway dashboard"
echo "  3. Point your custom domain to Railway"
echo ""
