# PowerShell Script to Auto-Close Fully Funded Applications
# This script calls the maintenance endpoint to fix existing data

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Auto-Close Fully Funded Applications" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:4000"
$loginEmail = Read-Host "Enter your Trust email"
$loginPassword = Read-Host "Enter your Trust password" -AsSecureString
$loginPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($loginPassword))

Write-Host ""
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow

# Login to get token
$loginBody = @{
    email = $loginEmail
    password = $loginPasswordPlain
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Call maintenance endpoint
Write-Host "Step 2: Running maintenance to auto-close applications..." -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $maintenanceResponse = Invoke-RestMethod -Uri "$baseUrl/api/trusts/maintenance/auto-close-applications" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✅ Maintenance completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results:" -ForegroundColor Cyan
    Write-Host "  - Applications closed: $($maintenanceResponse.closedApplications)" -ForegroundColor White
    Write-Host "  - Updated to partially approved: $($maintenanceResponse.updatedToPartiallyApproved)" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ Done! Refresh your trust dashboard to see the changes." -ForegroundColor Green
    
} catch {
    Write-Host "❌ Maintenance failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error Details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Response -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
