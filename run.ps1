# Windows PowerShell Startup Script for Autonomous Interview Agent Platform

Write-Host "=== Starting Autonomous Interview Agent Platform ===" -ForegroundColor Green

# 1. Clean Next.js cache to avoid path mismatch conflicts (e.g. macOS vs Windows path issues)
Write-Host "Cleaning Next.js build cache..." -ForegroundColor Yellow
if (Test-Path "frontend\.next") {
    cmd.exe /c "rmdir /s /q frontend\.next"
}
if (Test-Path "frontend\tsconfig.tsbuildinfo") {
    Remove-Item -Force "frontend\tsconfig.tsbuildinfo"
}
Write-Host "Cache cleaned." -ForegroundColor Green

# Verify virtual environment exists
if (-not (Test-Path ".venv")) {
    Write-Host "Error: .venv folder not found. Please recreate it by running python -m venv .venv and installing requirements." -ForegroundColor Red
    exit 1
}

# 2. Launch LiveKit Server via Docker
Write-Host "Launching LiveKit Server via Docker in dev mode on ws://localhost:7880..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'LiveKit Server'; docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server --dev --keys `"devkey: secret`" --bind 0.0.0.0"
# Give LiveKit server a moment to start
Start-Sleep -Seconds 2

# 3. Launch FastAPI Backend
Write-Host "Launching FastAPI Backend on http://localhost:8000 in a new window..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'FastAPI Backend'; .\.venv\Scripts\activate.ps1; python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

# Wait a moment for the backend to start
Start-Sleep -Seconds 2

# 4. Launch Next.js Frontend
Write-Host "Launching Next.js Frontend on http://localhost:3000 in a new window..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'Next.js Frontend'; cd frontend; npm run dev -- -p 3000"

# 5. Optional: Check for LiveKit voice agent configuration in backend/.env
$envPath = "backend\.env"
$hasLiveKit = $false
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $livekitUrl = $envContent | Where-Object { $_ -like "LIVEKIT_URL=*" }
    $livekitKey = $envContent | Where-Object { $_ -like "LIVEKIT_API_KEY=*" }
    if ($livekitUrl -and $livekitKey -and ($livekitUrl -notlike "*your-project*") -and ($livekitKey -notlike "*your_livekit*")) {
        $hasLiveKit = $true
    }
}

if ($hasLiveKit) {
    Write-Host "LiveKit credentials found! Launching LiveKit Voice Agent worker..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'LiveKit Voice Agent'; .\.venv\Scripts\activate.ps1; python -m backend.livekit_agent dev"
} else {
    Write-Host "Note: LiveKit Voice Agent worker is not launched (LIVEKIT_URL / LIVEKIT_API_KEY not configured in backend/.env)." -ForegroundColor Yellow
    Write-Host "      To use the Live voice interview path, configure your LiveKit keys in backend/.env and start the worker manually using:" -ForegroundColor Gray
    Write-Host "      python -m backend.livekit_agent dev" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Services Launched ===" -ForegroundColor Green
Write-Host "LiveKit Server:    ws://localhost:7880" -ForegroundColor Yellow
Write-Host "FastAPI Backend:   http://localhost:8000" -ForegroundColor Yellow
Write-Host "Next.js Frontend:  http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: You can close the separate terminal windows to shut down the processes." -ForegroundColor White
