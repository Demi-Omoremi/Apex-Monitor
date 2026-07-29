# Wipe Postgres data only (keeps containers running).
# Usage: .\scripts\reset-db.ps1

$ErrorActionPreference = "Stop"

Write-Host "Truncating apex_monitor tables..." -ForegroundColor Yellow
docker exec apex_postgres psql -U apex_user -d apex_monitor -c "TRUNCATE alert_rules, market_ticks, assets RESTART IDENTITY CASCADE;"

Write-Host "Database cleared. Restart the backend to reload in-memory state." -ForegroundColor Green
