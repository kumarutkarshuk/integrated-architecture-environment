#!/bin/sh
set -e

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Running prisma migrate deploy in the background..."
  bunx prisma migrate deploy &
else
  echo "WARNING: DATABASE_URL is not set; skipping prisma migrate deploy"
fi

exec bun run start
