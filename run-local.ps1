<#
run-local.ps1
One-step local runner for WealthWise (Windows PowerShell).

What it does:
- Starts a Postgres 15 Docker container (name: ww-postgres) if needed
- Waits for Postgres to accept connections
- Builds the backend with Maven
- Launches the backend in a new PowerShell window with required env vars
- Ensures frontend .env.local and starts the Vite dev server in a new window

Usage (from repo root):
    powershell -ExecutionPolicy Bypass -File .\run-local.ps1

Edit variables below to customize DB credentials or ports.
#>

# ------------------ Configuration ------------------
$DB_USER = "postgres"
$DB_PASSWORD = "your_password"
$DB_NAME = "wealthwise"
$DB_PORT = 5432
$DB_PORT_CANDIDATES = @(5432, 5433, 5434, 5435)
$JWT_SECRET = "WealthWiseSuperSecretKeyForJwt2026WithAtLeast512BitsOfEntropyStg1"
$BACKEND_PORT = 8081
$BACKEND_PORT_CANDIDATES = @(8081, 8082, 8083, 8084)
$FRONTEND_PORT = 5173
$POSTGRES_CONTAINER = "ww-postgres"
$ROOT = (Get-Location).Path

function Write-Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Write-ErrorAndExit($m){ Write-Host "[ERROR] $m" -ForegroundColor Red; exit 1 }

# ------------------ Cleanup previous instances ------------------
Write-Info "Stopping any lingering backend (java) or frontend (node) processes..."
Stop-Process -Name java, node -Force -ErrorAction SilentlyContinue

# ------------------ Docker: start Postgres ------------------
Write-Info "Checking Docker availability..."
try {
    docker version > $null 2>&1
} catch {
    Write-ErrorAndExit "Docker not available on PATH. Install Docker Desktop and retry."
}

# Check for Maven and npm early so we fail fast with a clear message
$mvn = Get-Command mvn -ErrorAction SilentlyContinue
$node = Get-Command npm -ErrorAction SilentlyContinue
if (-not $mvn) { Write-ErrorAndExit "Maven ('mvn') not found on PATH. Install Maven 3.8+ and retry." }
if (-not $node) { Write-Info "Warning: npm not found on PATH. Frontend steps will fail until Node.js/npm is installed." }

foreach ($candidatePort in $DB_PORT_CANDIDATES) {
    $connectionCheck = Test-NetConnection -ComputerName 'localhost' -Port $candidatePort -WarningAction SilentlyContinue
    if (-not $connectionCheck.TcpTestSucceeded) {
        $DB_PORT = $candidatePort
        break
    }
}
if (-not $DB_PORT) { Write-ErrorAndExit "No free database port found in candidates: $($DB_PORT_CANDIDATES -join ', ')." }
Write-Info "Using database port $DB_PORT."

foreach ($candidatePort in $BACKEND_PORT_CANDIDATES) {
    $connectionCheck = Test-NetConnection -ComputerName 'localhost' -Port $candidatePort -WarningAction SilentlyContinue
    if (-not $connectionCheck.TcpTestSucceeded) {
        $BACKEND_PORT = $candidatePort
        break
    }
}
if (-not $BACKEND_PORT) { Write-ErrorAndExit "No free backend port found in candidates: $($BACKEND_PORT_CANDIDATES -join ', ')." }
Write-Info "Using backend port $BACKEND_PORT."

# Reconcile any existing container with the selected port.
$containerExists = (docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $POSTGRES_CONTAINER }) -ne $null
if ($containerExists) {
    $portMapping = & docker port $POSTGRES_CONTAINER 5432/tcp 2>$null
    $portStr = $portMapping | Select-Object -First 1
    $currentMappedPort = if ($portStr -match ':(\d+)') { $Matches[1] } else { '' }
    if ($currentMappedPort -ne "$DB_PORT") {
        Write-Info "Recreating existing Postgres container '$POSTGRES_CONTAINER' to use host port $DB_PORT (was $currentMappedPort)..."
        & docker rm -f $POSTGRES_CONTAINER
        if ($LASTEXITCODE -ne 0) { Write-ErrorAndExit "Failed to remove stale Postgres container (docker rm returned exit code $LASTEXITCODE)." }
        $containerExists = $false
    }
}
if (-not $containerExists) {
    Write-Info "Creating and starting Postgres Docker container '$POSTGRES_CONTAINER'..."
    $dockerPort = '{0}:5432' -f $DB_PORT
    & docker run --name $POSTGRES_CONTAINER -e "POSTGRES_USER=$DB_USER" -e "POSTGRES_PASSWORD=$DB_PASSWORD" -e "POSTGRES_DB=$DB_NAME" -p $dockerPort -d postgres:15
    if ($LASTEXITCODE -ne 0) { Write-ErrorAndExit "Failed to create Postgres container (docker run returned exit code $LASTEXITCODE)." }
} else {
    $status = docker inspect -f '{{.State.Status}}' $POSTGRES_CONTAINER
    if ($status -ne 'running') {
        Write-Info "Starting existing container $POSTGRES_CONTAINER..."
        & docker start $POSTGRES_CONTAINER
        if ($LASTEXITCODE -ne 0) { Write-ErrorAndExit "Failed to start Postgres container (docker start returned exit code $LASTEXITCODE)." }
    } else {
        Write-Info "Postgres container '$POSTGRES_CONTAINER' already running."
    }
}

# Wait for Postgres to be ready
Write-Info "Waiting for Postgres to accept connections on localhost:$DB_PORT..."
$maxWait = 60
$attempt = 0
while ($attempt -lt $maxWait) {
    $conn = Test-NetConnection -ComputerName 'localhost' -Port $DB_PORT -WarningAction SilentlyContinue
    if ($conn.TcpTestSucceeded) { break }
    Start-Sleep -Seconds 1
    $attempt++
}
if ($attempt -ge $maxWait) { Write-ErrorAndExit "Timed out waiting for Postgres on port $DB_PORT." }
Write-Info "Postgres ready."

# ------------------ Backend: build ------------------
Write-Info "Building backend (Maven). This may take a few minutes..."
Push-Location "$ROOT\backend"
$mvn = Get-Command mvn -ErrorAction SilentlyContinue
if (-not $mvn) { Write-ErrorAndExit "Maven ('mvn') not found on PATH. Install Maven 3.8+ and retry." }
$build = & mvn clean install -DskipTests
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-ErrorAndExit "Maven build failed. Fix errors and retry." }
Pop-Location
Write-Info "Backend built successfully."

# ------------------ Frontend: ensure .env.local ------------------
Write-Info "Configuring frontend .env.local (Vite)..."
$envFile = Join-Path $ROOT 'frontend\.env.local'
$apiUrl = "http://localhost:$BACKEND_PORT"
if (-not (Test-Path $envFile)) {
    "VITE_API_URL=$apiUrl" | Out-File -FilePath $envFile -Encoding UTF8
    Write-Info "Created frontend\.env.local with VITE_API_URL=$apiUrl"
} else {
    # replace or set VITE_API_URL line
    $content = @(Get-Content -Path $envFile -ErrorAction SilentlyContinue)
    $newContent = @()
    $found = $false
    foreach ($line in $content) {
        if ($line -match '^VITE_API_URL=') {
            $newContent += "VITE_API_URL=$apiUrl"
            $found = $true
        } elseif ($line -match '\S') {
            $newContent += $line
        }
    }
    if (-not $found) { $newContent += "VITE_API_URL=$apiUrl" }
    $newContent | Set-Content -Path $envFile -Encoding UTF8
    Write-Info "Updated frontend\.env.local to VITE_API_URL=$apiUrl"
}

# ------------------ Frontend: install & run in new window ------------------
Write-Info "Installing frontend deps (if needed) and starting dev server on port $FRONTEND_PORT..."
Push-Location "$ROOT\frontend"
if (-not (Test-Path 'node_modules')) {
    $node = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $node) { Pop-Location; Write-ErrorAndExit "npm not found on PATH. Install Node.js 18+ and retry." }
    npm install
}
Pop-Location
$frontendCmd = "cd `"$ROOT\\frontend`"; npm run dev"
Start-Process -FilePath powershell.exe -ArgumentList '-NoExit','-Command',$frontendCmd -WorkingDirectory "$ROOT\frontend"

# ------------------ Backend: run in new window ------------------
Write-Info "Starting backend in a new PowerShell window (port $BACKEND_PORT)..."
$backendCmd = "`$env:DATABASE_URL='jdbc:postgresql://localhost:$DB_PORT/$DB_NAME'; `$env:DATABASE_USERNAME='$DB_USER'; `$env:DATABASE_PASSWORD='$DB_PASSWORD'; `$env:JWT_SECRET='$JWT_SECRET'; `$env:JAVA_TOOL_OPTIONS='-Duser.timezone=UTC'; `$env:PORT='$BACKEND_PORT'; cd `"$ROOT\\backend`"; mvn spring-boot:run"
Start-Process -FilePath powershell.exe -ArgumentList '-NoExit','-Command',$backendCmd -WorkingDirectory "$ROOT\backend"

Write-Info "All done. Frontend: http://localhost:$FRONTEND_PORT  Backend: http://localhost:$BACKEND_PORT"
Write-Info "Use the opened PowerShell windows to view logs."
