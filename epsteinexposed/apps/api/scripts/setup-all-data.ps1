# EPSTEIN EXPOSED - FULL DATA SETUP
# PowerShell version for Windows

Write-Host "🔥 EPSTEIN EXPOSED - FULL DATA SETUP" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Create directories
Write-Host "📁 Creating data directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "apps/api/data/external" -Force | Out-Null
New-Item -ItemType Directory -Path "apps/api/data/entities" -Force | Out-Null

# Step 1: Download external data
Write-Host ""
Write-Host "📥 Step 1: Downloading external data..." -ForegroundColor Yellow
npx ts-node apps/api/scripts/fetch-external-data.ts

# Step 2: Parse Black Book
Write-Host ""
Write-Host "📖 Step 2: Parsing Black Book..." -ForegroundColor Yellow
npx ts-node apps/api/scripts/parse-black-book.ts

# Step 3: Parse Flight Logs
Write-Host ""
Write-Host "✈️  Step 3: Parsing Flight Logs..." -ForegroundColor Yellow
npx ts-node apps/api/scripts/parse-flight-logs.ts

# Step 4: Build unified index
Write-Host ""
Write-Host "🔗 Step 4: Building unified entity index..." -ForegroundColor Yellow
npx ts-node apps/api/scripts/build-unified-index.ts

Write-Host ""
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Run 'pnpm dev' to start the server" -ForegroundColor Cyan
