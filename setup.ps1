# =============================================================================
# UKCP Clean Rebuild Script
# =============================================================================
# Purpose:  Wipe generated directories, reinstall dependencies, build, confirm.
# Safe to re-run at any point. Does not touch source files or Definitions/.
# Use this to recover from a broken install or after a dependency change.
#
# Run from: Ali-Projects/UKCP/
# Command:  .\setup.ps1
# =============================================================================

Write-Host ""
Write-Host "UKCP - Clean Rebuild" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

# --- Verify location ---
if (-not (Test-Path "package.json")) {
  Write-Host "ERROR: Run this script from the UKCP project root (where package.json lives)." -ForegroundColor Red
  exit 1
}

# --- Clean generated directories ---
$toRemove = @("node_modules", "dist")
foreach ($dir in $toRemove) {
  if (Test-Path $dir) {
    Write-Host "Removing $dir..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $dir
  }
}

Write-Host ""

# --- Install dependencies ---
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "ERROR: npm install failed. Check output above." -ForegroundColor Red
  exit 1
}

Write-Host ""

# --- Build ---
Write-Host "Building..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "ERROR: Build failed. Check output above." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=====================" -ForegroundColor Green
Write-Host "Setup complete." -ForegroundColor Green
Write-Host ""
Write-Host "  Development server:  npm run dev" -ForegroundColor White
Write-Host "  Production server:   npm run start" -ForegroundColor White
Write-Host ""
