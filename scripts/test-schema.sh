#!/usr/bin/env bash
# Apply the migrations to a throwaway Postgres database and run the RLS tests.
#
# Usage:  DATABASE_URL=postgres://... scripts/test-schema.sh
#
# The auth shim under supabase/tests/ stands in for the parts of Supabase the
# migrations assume (auth.users, auth.uid(), the anon/authenticated roles) and
# is applied first. It is test-only and must never reach a real project.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="${DATABASE_URL:?set DATABASE_URL to a disposable Postgres database}"

psql "$DB" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/00_auth_shim.sql"

for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "-- applying $(basename "$f")"
  psql "$DB" -v ON_ERROR_STOP=1 -q -f "$f"
done

psql "$DB" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/01_rls_test.sql"
