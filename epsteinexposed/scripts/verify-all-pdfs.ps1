# PDF Verification Script for Epstein Exposed
# Tests all PDFs in pdf-index.json via the /api/verify-pdfs endpoint
# Generates comprehensive report with error details

param(
    [string]$BaseUrl = "https://epsteinexposed.netlify.app",
    [int]$BatchSize = 100,
    [string]$OutputFile = "pdf-verification-report.json"
)

Write-Host "🔍 Epstein Exposed - PDF Verification Audit" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Base URL: $BaseUrl" -ForegroundColor Yellow
Write-Host "Batch Size: $BatchSize PDFs per request" -ForegroundColor Yellow
Write-Host ""

# First, get total count
Write-Host "📊 Fetching total PDF count..." -ForegroundColor Green
try {
    $initialResponse = Invoke-RestMethod -Uri "$BaseUrl/api/verify-pdfs?limit=1" -Method Get -ErrorAction Stop
    $totalPdfs = $initialResponse.summary.totalInIndex
    Write-Host "✅ Found $totalPdfs PDFs in index" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Failed to connect to API: $_" -ForegroundColor Red
    exit 1
}

# Calculate batches
$totalBatches = [Math]::Ceiling($totalPdfs / $BatchSize)
Write-Host "📦 Will process $totalBatches batches of $BatchSize PDFs each" -ForegroundColor Yellow
Write-Host ""

# Initialize aggregated results
$allErrors = @()
$totalChecked = 0
$totalOk = 0
$totalErrors = 0
$totalTimeouts = 0
$batchResults = @()

# Process each batch
for ($batch = 0; $batch -lt $totalBatches; $batch++) {
    $offset = $batch * $BatchSize
    $batchNum = $batch + 1
    
    Write-Host "🔄 Batch $batchNum/$totalBatches (offset: $offset)..." -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/verify-pdfs?limit=$BatchSize&offset=$offset" -Method Get -ErrorAction Stop
        
        # Aggregate results
        $totalChecked += $response.summary.checked
        $totalOk += $response.summary.ok
        $totalErrors += $response.summary.errors
        $totalTimeouts += $response.summary.timeouts
        
        # Collect errors
        if ($response.errors -and $response.errors.Count -gt 0) {
            $allErrors += $response.errors
            Write-Host "  ⚠️  Found $($response.errors.Count) errors in this batch" -ForegroundColor Yellow
        } else {
            Write-Host "  ✅ All PDFs OK in this batch" -ForegroundColor Green
        }
        
        # Store batch result
        $batchResults += @{
            batch = $batchNum
            offset = $offset
            checked = $response.summary.checked
            ok = $response.summary.ok
            errors = $response.summary.errors
            timeouts = $response.summary.timeouts
            successRate = $response.summary.successRate
        }
        
        # Progress indicator
        $progress = [Math]::Round(($totalChecked / $totalPdfs) * 100, 1)
        Write-Host "  Progress: $progress% ($totalChecked/$totalPdfs)" -ForegroundColor Gray
        Write-Host ""
        
        # Small delay to avoid overwhelming the server
        Start-Sleep -Milliseconds 500
        
    } catch {
        Write-Host "  ❌ Batch failed: $_" -ForegroundColor Red
        Write-Host ""
    }
}

# Calculate final statistics
$successRate = if ($totalChecked -gt 0) { [Math]::Round(($totalOk / $totalChecked) * 100, 2) } else { 0 }
$errorRate = if ($totalChecked -gt 0) { [Math]::Round(($totalErrors / $totalChecked) * 100, 2) } else { 0 }
$timeoutRate = if ($totalChecked -gt 0) { [Math]::Round(($totalTimeouts / $totalChecked) * 100, 2) } else { 0 }

# Display summary
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "📊 FINAL AUDIT REPORT" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total PDFs in Index: $totalPdfs" -ForegroundColor White
Write-Host "Total Checked: $totalChecked" -ForegroundColor White
Write-Host ""
Write-Host "✅ Successful: $totalOk ($successRate%)" -ForegroundColor Green
Write-Host "❌ Errors: $totalErrors ($errorRate%)" -ForegroundColor Red
Write-Host "⏱️  Timeouts: $totalTimeouts ($timeoutRate%)" -ForegroundColor Yellow
Write-Host ""

# Verdict
if ($successRate -ge 95) {
    Write-Host "🎉 VERDICT: EXCELLENT - Platform is production-ready!" -ForegroundColor Green
} elseif ($successRate -ge 90) {
    Write-Host "✅ VERDICT: GOOD - Minor issues, acceptable for launch" -ForegroundColor Yellow
} elseif ($successRate -ge 80) {
    Write-Host "⚠️  VERDICT: FAIR - Significant issues, review recommended" -ForegroundColor Yellow
} else {
    Write-Host "❌ VERDICT: POOR - Major issues, DO NOT LAUNCH" -ForegroundColor Red
}
Write-Host ""

# Error breakdown
if ($allErrors.Count -gt 0) {
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "🔍 ERROR BREAKDOWN (Top 20)" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    
    $errorSummary = $allErrors | Group-Object -Property error | Sort-Object -Property Count -Descending | Select-Object -First 20
    
    foreach ($errorGroup in $errorSummary) {
        Write-Host "  $($errorGroup.Count)x - $($errorGroup.Name)" -ForegroundColor Red
    }
    Write-Host ""
}

# Generate detailed JSON report
$report = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    baseUrl = $BaseUrl
    summary = @{
        totalInIndex = $totalPdfs
        totalChecked = $totalChecked
        successful = $totalOk
        errors = $totalErrors
        timeouts = $totalTimeouts
        successRate = "$successRate%"
        errorRate = "$errorRate%"
        timeoutRate = "$timeoutRate%"
    }
    batches = $batchResults
    errors = $allErrors | Select-Object -First 100  # Limit to first 100 errors to keep file size reasonable
}

$report | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputFile -Encoding UTF8
Write-Host "📄 Detailed report saved to: $OutputFile" -ForegroundColor Green
Write-Host ""

# Exit code based on success rate
if ($successRate -ge 90) {
    exit 0
} else {
    exit 1
}
