#!/usr/bin/env bash
set -euo pipefail
export LC_ALL="${LC_ALL:-C}"
export PGOPTIONS="${PGOPTIONS:---client-min-messages=warning}"

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DATA="${TEST_PGDATA:-${TMPDIR:-/tmp}/rental_test_pgdata}"
PORT="${TEST_PGPORT:-55432}"
DB="${TEST_PGDATABASE:-rental_mvp}"

case "${1:-up}" in
  up)
    if [ ! -d "$DATA" ]; then
      initdb -D "$DATA" --auth=trust --username=postgres --locale=C >/dev/null
    fi
    if ! pg_ctl -D "$DATA" status >/dev/null 2>&1; then
      pg_ctl -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/server.log" start >/dev/null
      sleep 1
    fi
    psql -q -h 127.0.0.1 -p "$PORT" -U postgres -c "drop database if exists $DB" >/dev/null
    psql -q -h 127.0.0.1 -p "$PORT" -U postgres -c "create database $DB" >/dev/null
    psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres -d "$DB" -f "$ROOT/supabase/tests/local-supabase-stubs.sql" >/dev/null
    for migration in "$ROOT"/supabase/migrations/*.sql; do
      psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres -d "$DB" -f "$migration" >/dev/null
    done
    psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres -d "$DB" -c "grant select, insert, update, delete on all tables in schema public to rental_app" >/dev/null
    psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres -d "$DB" -f "$ROOT/supabase/seed.sql" >/dev/null
    psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres -d "$DB" -f "$ROOT/supabase/seed-tours.sql" >/dev/null
    if [ "${WITH_DEMO:-0}" = "1" ]; then
      psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres -d "$DB" -f "$ROOT/supabase/demo/seed-demo.sql" >/dev/null
    fi
    echo "DATABASE_URL=postgresql://rental_app:rental_app@127.0.0.1:$PORT/$DB"
    echo "TEST_ADMIN_DATABASE_URL=postgresql://postgres@127.0.0.1:$PORT/$DB"
    ;;
  down)
    pg_ctl -D "$DATA" stop >/dev/null 2>&1 || true
    ;;
  *)
    echo "usage: $0 [up|down]" >&2
    exit 2
    ;;
esac
