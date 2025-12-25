# PDF Verification Script

## Purpose
Audits all 11,614 PDFs in the Epstein Exposed platform to ensure they are accessible and working.

## Usage

### Quick Test (First 100 PDFs)
```powershell
cd C:\Users\user\CascadeProjects\epsteinexposed\scripts
.\verify-all-pdfs.ps1 -BatchSize 100
```

### Full Audit (All 11,614 PDFs)
```powershell
.\verify-all-pdfs.ps1
```
⏱️ **Takes ~20-30 minutes**

### Test Against Local Dev Server
```powershell
.\verify-all-pdfs.ps1 -BaseUrl "http://localhost:3000"
```

## Output

### Console Output
```
🔍 Epstein Exposed - PDF Verification Audit
=============================================

Base URL: https://epsteinexposed.netlify.app
Batch Size: 100 PDFs per request

📊 Fetching total PDF count...
✅ Found 11614 PDFs in index

📦 Will process 117 batches of 100 PDFs each

🔄 Batch 1/117 (offset: 0)...
  ✅ All PDFs OK in this batch
  Progress: 0.9% (100/11614)

...

=============================================
📊 FINAL AUDIT REPORT
=============================================

Total PDFs in Index: 11614
Total Checked: 11614

✅ Successful: 11050 (95.14%)
❌ Errors: 500 (4.31%)
⏱️  Timeouts: 64 (0.55%)

🎉 VERDICT: EXCELLENT - Platform is production-ready!
```

### JSON Report
Saved to `pdf-verification-report.json`:
```json
{
  "timestamp": "2025-12-25 10:05:00",
  "summary": {
    "totalInIndex": 11614,
    "totalChecked": 11614,
    "successful": 11050,
    "errors": 500,
    "successRate": "95.14%"
  },
  "errors": [
    {
      "id": "EFTA00001234",
      "filename": "document.pdf",
      "url": "https://...",
      "status": "error",
      "httpStatus": 404,
      "error": "HTTP 404"
    }
  ]
}
```

## Success Criteria

| Success Rate | Verdict | Action |
|--------------|---------|--------|
| ≥95% | ✅ Excellent | Production-ready |
| 90-94% | ⚠️ Good | Acceptable, monitor |
| 80-89% | ⚠️ Fair | Review errors |
| <80% | ❌ Poor | Do not launch |

## What It Tests

1. **PDF Accessibility**: HEAD request to each PDF URL
2. **Response Time**: Tracks how long each request takes
3. **Error Types**: HTTP errors, timeouts, network issues
4. **Batch Processing**: Tests in batches to avoid overwhelming server

## Troubleshooting

### "Failed to connect to API"
- Netlify site not deployed yet
- Check URL is correct
- Verify site is live

### High Error Rate (>10%)
- Check Supabase storage bucket permissions
- Verify pdf-index.json paths are correct
- Review error breakdown for patterns

### Timeouts
- Server under load
- Network issues
- Increase timeout in verification endpoint

## Next Steps After Running

1. **If success rate ≥95%**: ✅ Safe to promote platform
2. **If 90-95%**: Review errors, most are acceptable
3. **If <90%**: Investigate and fix broken PDFs before launch
