#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
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
initdb -D "$TASK_PGDATA" --auth=trust --username=postgres --locale=C --encoding=UTF8 >/dev/null
touch "$TASK_PGDATA/.westayplace-audit-disposable"
pg_ctl -D "$TASK_PGDATA" -o "-p $TASK_PGPORT -h 127.0.0.1 -k /tmp" -l "$TASK_PGDATA/server.log" start >/dev/null
createdb -h 127.0.0.1 -p "$TASK_PGPORT" -U postgres "$TASK_DATABASE"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$TASK_PGPORT" -U postgres -d "$TASK_DATABASE")
"${PSQL[@]}" -f "$ROOT/supabase/tests/local-supabase-stubs.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  if [[ "$(basename "$migration")" > "20261101000000" ]]; then continue; fi
  "${PSQL[@]}" -f "$migration"
done
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql"
"${PSQL[@]}" -f "$ROOT/supabase/seed-tours.sql"
"${PSQL[@]}" <<'SQL'
insert into user_profiles(id,display_name) values ('00000000-0000-4000-9000-000000000701','Synthetic legacy dual member');
insert into organizations(id,legal_name,trading_name) values ('00000000-0000-4000-9000-000000000702','Synthetic legacy Owner','Synthetic legacy Owner');
insert into organization_members(user_id,organization_id,role) values ('00000000-0000-4000-9000-000000000701','00000000-0000-4000-9000-000000000702','OWNER');
insert into agent_profiles(id,user_id,display_name) values ('00000000-0000-4000-9000-000000000703','00000000-0000-4000-9000-000000000701','Synthetic legacy Agent');
insert into user_capabilities(user_id,capability,organization_id,source_type) values ('00000000-0000-4000-9000-000000000701','OWNER','00000000-0000-4000-9000-000000000702','MEMBERSHIP'),('00000000-0000-4000-9000-000000000701','AGENT',null,'REGISTRATION');
insert into user_profiles(id,display_name) values ('00000000-0000-4000-9000-000000000704','Synthetic legacy reviewer');
insert into user_capabilities(user_id,capability,source_type) values ('00000000-0000-4000-9000-000000000704','PLATFORM_ADMIN','PLATFORM');
begin;
select set_config('app.verification_actor','00000000-0000-4000-9000-000000000704',true);
update agent_profiles set verification_state='VERIFIED',verified_at=now(),verified_by='00000000-0000-4000-9000-000000000704' where id='00000000-0000-4000-9000-000000000703';
commit;

SQL
"${PSQL[@]}" -f "$ROOT/supabase/tests/partner-tenant-preflight.sql"
TASK_BASELINE_COUNTS="$("${PSQL[@]}" -Atc "select json_build_array((select count(*) from organizations),(select count(*) from agent_profiles),(select count(*) from organization_members),(select count(*) from listings))")"
pg_dump -h 127.0.0.1 -p "$TASK_PGPORT" -U postgres -Fc -d "$TASK_DATABASE" -f "$TASK_PGDATA/baseline.dump"
for migration in "$ROOT"/supabase/migrations/20261101*.sql; do
  "${PSQL[@]}" --single-transaction -f "$migration"
done
TASK_MIGRATED_COUNTS="$("${PSQL[@]}" -Atc "select json_build_array((select count(*) from organizations),(select count(*) from agent_profiles),(select count(*) from organization_members),(select count(*) from listings))")"
if [[ "$TASK_BASELINE_COUNTS" != "$TASK_MIGRATED_COUNTS" ]]; then exit 1; fi
printf 'Migration preserved organization, Agent, membership and listing counts: %s\n' "$TASK_MIGRATED_COUNTS"
cd "$ROOT/apps/api"
DATABASE_URL="postgresql://rental_app:rental_app@127.0.0.1:$TASK_PGPORT/$TASK_DATABASE" \
TEST_ADMIN_DATABASE_URL="postgresql://postgres@127.0.0.1:$TASK_PGPORT/$TASK_DATABASE" \
npm test -- "$@"
createdb -h 127.0.0.1 -p "$TASK_PGPORT" -U postgres wsp_restore
pg_restore -h 127.0.0.1 -p "$TASK_PGPORT" -U postgres -d wsp_restore --exit-on-error "$TASK_PGDATA/baseline.dump"
TASK_RESTORED_COUNTS="$(psql -X -qAt -h 127.0.0.1 -p "$TASK_PGPORT" -U postgres -d wsp_restore -c "select json_build_array((select count(*) from organizations),(select count(*) from agent_profiles),(select count(*) from organization_members),(select count(*) from listings))")"
if [[ "$TASK_BASELINE_COUNTS" != "$TASK_RESTORED_COUNTS" ]]; then exit 1; fi
printf 'Baseline restore rehearsal preserved counts: %s\n' "$TASK_RESTORED_COUNTS"
printf 'Disposable cluster cleanup scheduled; server log: %s.log\n' "$TASK_PGDATA"
