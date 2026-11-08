# Usage: powershell -ExecutionPolicy Bypass -File db-restore.ps1 <db_user> <db_name>
param([Parameter(Mandatory)][string]$DbUser, [Parameter(Mandatory)][string]$DbName)
$ErrorActionPreference = 'Stop'
function run { & $args[0] $args[1..($args.Count - 1)]; if ($LASTEXITCODE) { throw "$($args[0]) failed ($LASTEXITCODE)" } }
Set-Location (Join-Path $PSScriptRoot '..\..\..')
$Dump = '.deployment\localhost\dump'
$SevenZip = 'C:\Program Files\7-Zip\7z.exe'

$Archive = (Get-ChildItem $Dump -Filter *-einbuergerungstest.sql.7z | Select-Object -First 1).FullName
if (-not $Archive) { throw "no *-einbuergerungstest.sql.7z in $Dump" }
run $SevenZip e -y "-o$Dump" $Archive
run podman cp "$Dump\einbuergerungstest.sql" postgres:/tmp/einbuergerungstest.sql
run podman exec postgres psql -U $DbUser -d $DbName -f /tmp/einbuergerungstest.sql
Remove-Item "$Dump\einbuergerungstest.sql"
