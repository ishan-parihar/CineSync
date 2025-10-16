# Integration test script for AI agents

Write-Host "Running Integration Tests..." -ForegroundColor Cyan

# Test 1: Dependency validation
Write-Host "`n[Test 1] Validating dependencies..." -ForegroundColor Yellow
& "C:\Users\Ishan\Documents\GitHub\LipSyncAutomation\venv\Scripts\python.exe" -c "from src.utils.validators import validate_dependencies; import json; c = json.load(open('config/settings.json')); assert validate_dependencies(c['system']['rhubarb_path'], c['system']['ffmpeg_path'])"
if ($LASTEXITCODE -eq 0) { Write-Host "Dependencies OK" -ForegroundColor Green } else { Write-Host "Dependencies Failed" -ForegroundColor Red; exit 1 }

# Test 2: Preset discovery
Write-Host "`n[Test 2] Discovering presets..." -ForegroundColor Yellow
& "C:\Users\Ishan\Documents\GitHub\LipSyncAutomation\venv\Scripts\python.exe" src\cli.py --list-presets
if ($LASTEXITCODE -eq 0) { Write-Host "Preset Discovery OK" -ForegroundColor Green } else { Write-Host "Preset Discovery Failed" -ForegroundColor Red; exit 1 }

# Test 3: Unit tests
Write-Host "`n[Test 3] Running unit tests..." -ForegroundColor Yellow
& "C:\Users\Ishan\Documents\GitHub\LipSyncAutomation\venv\Scripts\python.exe" -m unittest discover -s tests -p "test_*.py"
if ($LASTEXITCODE -eq 0) { Write-Host "Unit Tests Passed" -ForegroundColor Green } else { Write-Host "Unit Tests Failed" -ForegroundColor Red; exit 1 }

Write-Host "`nAll Integration Tests Passed" -ForegroundColor Green
