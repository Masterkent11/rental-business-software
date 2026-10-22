#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TASK_PGDATA="$(mktemp -d "${TMPDIR:-/tmp}/wsp-audit-pg.XXXXXX")"
TASK_PGPORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
TASK_DATABASE=wsp_audit
cleanup() {
  pg_ctl -D "$TASK_PGDATA" stop -m fast >/dev/null 2>&1 || true
  if pg_ctl -D "$TASK_PGDATA" status >/dev/null 2>&1; then return; fi
  if [ -f "$TASK_PGDATA/server.log" ]; then cp "$TASK_PGDATA/server.log" "$TASK_PGDATA.log"; fi
  python3 - "$TASK_PGDATA" <<'PY_CLEANUP'
import shutil
import sys
from pathlib import Path
folder = Path(sys.argv[1])
if folder.name.startswith('wsp-audit-pg.') and (folder / '.westayplace-audit-disposable').is_file():
    shutil.rmtree(folder)
PY_CLEANUP
}
trap cleanup EXIT
initdb -D "$TASK_PGDATA" --auth=trust --username=postgres --locale=C >/dev/null
touch "$TASK_PGDATA/.westayplace-audit-disposable"
pg_ctl -D "$TASK_PGDATA" -o "-p $TASK_PGPORT -h 127.0.0.1 -k /tmp" -l "$TASK_PGDATA/server.log" start >/dev/null
createdb -h 127.0.0.1 -p "$TASK_PGPORT" -U postgres "$TASK_DATABASE"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$TASK_PGPORT" -U postgres -d "$TASK_DATABASE")
"${PSQL[@]}" -f "$ROOT/supabase/tests/local-supabase-stubs.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$migration"
done
"${PSQL[@]}" -c 'grant select, insert, update, delete on all tables in schema public to rental_app'
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql"
"${PSQL[@]}" -f "$ROOT/supabase/seed-tours.sql"
cd "$ROOT/apps/api"
DATABASE_URL="postgresql://rental_app:rental_app@127.0.0.1:$TASK_PGPORT/$TASK_DATABASE" \
TEST_ADMIN_DATABASE_URL="postgresql://postgres@127.0.0.1:$TASK_PGPORT/$TASK_DATABASE" \
npm test -- "$@"
printf 'Disposable cluster cleanup scheduled; server log: %s.log\n' "$TASK_PGDATA"
