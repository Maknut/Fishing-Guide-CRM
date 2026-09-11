#!/usr/bin/env bash
# Apply migrations to the production database. Never edits schema, never seeds.
# Usage: DATABASE_URL="<prod url>" ./scripts/migrate-prod.sh
set -euo pipefail
if [ -z "${DATABASE_URL:-}" ]; then echo "Set DATABASE_URL to the production database first."; exit 1; fi
echo "Applying migrations to: ${DATABASE_URL%%@*}@…"
npx prisma migrate deploy
echo "Done."
