# Usage: powershell -ExecutionPolicy Bypass -File db-dump.ps1 <db_user> <db_name>
param([Parameter(Mandatory)][string]$DbUser, [Parameter(Mandatory)][string]$DbName)
$ErrorActionPreference = 'Stop'
function run { & $args[0] $args[1..($args.Count - 1)]; if ($LASTEXITCODE) { throw "$($args[0]) failed ($LASTEXITCODE)" } }
Set-Location (Join-Path $PSScriptRoot '..\..\..')
$Dump = '.deployment\localhost\dump'
$SevenZip = 'C:\Program Files\7-Zip\7z.exe'

New-Item -ItemType Directory -Force -Path $Dump | Out-Null
Get-ChildItem $Dump -Filter *einbuergerungstest.sql* | Remove-Item -Force
run podman exec postgres pg_dump -U $DbUser -d $DbName -Fp --clean --if-exists -f /tmp/einbuergerungstest.sql
run podman cp postgres:/tmp/einbuergerungstest.sql "$Dump\einbuergerungstest.sql"
run $SevenZip a -mx=9 "$Dump\$(Get-Date -Format yyyyMMdd-HHmmss)-einbuergerungstest.sql.7z" ".\$Dump\einbuergerungstest.sql"
Remove-Item "$Dump\einbuergerungstest.sql"
