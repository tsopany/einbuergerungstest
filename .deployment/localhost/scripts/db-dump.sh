#!/bin/bash
# Usage: bash db-dump.sh <db_user> <db_name>
set -euo pipefail
cd "$(dirname "$0")/../../.."
DUMP=.deployment/localhost/dump

mkdir -p "$DUMP"
find "$DUMP" -name '*einbuergerungstest.sql*' -delete
podman exec postgres pg_dump -U "$1" -d "$2" -Fp --clean --if-exists -f /tmp/einbuergerungstest.sql
podman cp postgres:/tmp/einbuergerungstest.sql "$DUMP/einbuergerungstest.sql"
7zz a -mx=9 "$DUMP/$(date +%Y%m%d-%H%M%S)-einbuergerungstest.sql.7z" "./$DUMP/einbuergerungstest.sql"
rm "$DUMP/einbuergerungstest.sql"
