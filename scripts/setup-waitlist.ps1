# Thin Windows wrapper — delegates to the cross-platform Node setup script.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
node scripts/setup-waitlist.mjs @args
exit $LASTEXITCODE
