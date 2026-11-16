#!/usr/bin/env bash
# Bring the production database in line with prisma/schema.prisma. Never seeds or deletes rows.
# Usage: DATABASE_URL="<prod direct url, port 5432>" ./scripts/migrate-prod.sh
set -euo pipefail
if [ -z "${DATABASE_URL:-}" ]; then echo "Set DATABASE_URL to the production database first."; exit 1; fi
echo "Updating database: ${DATABASE_URL%%@*}@…"
npx prisma db push
echo "Done."
