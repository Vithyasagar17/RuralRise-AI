param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath 'backend/.env')) { Copy-Item -LiteralPath 'backend/.env.example' -Destination 'backend/.env' }
if (-not (Test-Path -LiteralPath 'frontend/.env')) { Copy-Item -LiteralPath 'frontend/.env.example' -Destination 'frontend/.env' }
if (-not $SkipInstall) {
    if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) {
        python -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw 'Python virtual environment creation failed.' }
    }
    & ./.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }
    Push-Location frontend
    try { npm ci; if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' } }
    finally { Pop-Location }
}
Write-Host 'Setup ready. Existing .env files were preserved.'
Write-Host 'Start backend: ./.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000'
Write-Host 'In another terminal: cd frontend; npm run dev'
Write-Host 'Open http://localhost:5173. Read QUICKSTART.md before enabling secure mode.'
