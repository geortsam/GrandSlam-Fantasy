#!/bin/sh
# Vercel build: production deploys apply pending migrations (and, when
# SEED_DEMO_DATA=true, the idempotent demo seed) before building. Preview
# deploys only build, so they never touch the production database.
set -e

# Prefer the connection strings managed by the Supabase Vercel integration.
# Migrations need a session connection: use POSTGRES_URL_NON_POOLING when it
# goes through the pooler (Vercel builds have no IPv6 for the direct host),
# else the transaction pooler URL switched to the session port.
if [ -n "$POSTGRES_PRISMA_URL" ]; then
  export DATABASE_URL="$POSTGRES_PRISMA_URL"
  case "$POSTGRES_URL_NON_POOLING" in
    *pooler.supabase.com*) export DIRECT_URL="$POSTGRES_URL_NON_POOLING" ;;
    *) export DIRECT_URL="$(echo "$POSTGRES_PRISMA_URL" | sed -e 's/:6543\//:5432\//' -e 's/?pgbouncer=true&/?/' -e 's/[?&]pgbouncer=true//')" ;;
  esac
fi

npx prisma generate

if [ "$VERCEL_ENV" = "production" ]; then
  npx prisma migrate deploy
  if [ "$SEED_DEMO_DATA" = "true" ]; then
    npx prisma db seed
  fi
fi

npx next build
