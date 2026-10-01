#!/bin/sh
# Vercel build: production deploys apply pending migrations (and, when
# SEED_DEMO_DATA=true, the idempotent demo seed) before building. Preview
# deploys only build, so they never touch the production database.
set -e

npx prisma generate

if [ "$VERCEL_ENV" = "production" ]; then
  npx prisma migrate deploy
  if [ "$SEED_DEMO_DATA" = "true" ]; then
    npx prisma db seed
  fi
fi

npx next build
