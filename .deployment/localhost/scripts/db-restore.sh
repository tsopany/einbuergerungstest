#!/bin/bash
# Usage: bash db-restore.sh <db_user> <db_name>
set -euo pipefail
cd "$(dirname "$0")/../../.."
DUMP=.deployment/localhost/dump

ARCHIVE=$(ls "$DUMP"/*-einbuergerungstest.sql.7z | head -1)
7zz e -y "-o$DUMP" "$ARCHIVE"
podman cp "$DUMP/einbuergerungstest.sql" postgres:/tmp/einbuergerungstest.sql
podman exec postgres psql -U "$1" -d "$2" -f /tmp/einbuergerungstest.sql
rm "$DUMP/einbuergerungstest.sql"
