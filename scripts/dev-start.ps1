# Reset Docker volumes and start the backend with a clean database.
# Usage: .\scripts\dev-start.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Set-Location $Root

Write-Host "Stopping containers and removing volumes..." -ForegroundColor Yellow
docker compose down -v

Write-Host "Starting Postgres and Kafka..." -ForegroundColor Yellow
docker compose up -d

Write-Host "Waiting for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

$env:APEX_RESET_DOCKER = "false"

Set-Location "$Root\backend"
Write-Host "Starting Spring Boot (dev profile, create-drop schema)..." -ForegroundColor Green

if (Test-Path ".\mvnw.cmd") {
    .\mvnw.cmd spring-boot:run
} else {
    Write-Host "mvnw.cmd not found — run MonitorApplication from your IDE with -Dapex.reset-docker=false"
}
