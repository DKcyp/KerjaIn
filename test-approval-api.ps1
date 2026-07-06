# Test Script untuk API Approval Tasklist (PowerShell)
# Session Token: 172dc4710ab54af8b1b405c89d6de9f0

$BaseUrl = "http://192.168.1.10:3000"
$SessionToken = "172dc4710ab54af8b1b405c89d6de9f0"
$Headers = @{
    "Cookie" = "session=$SessionToken"
    "Content-Type" = "application/json"
}

Write-Host "🚀 Testing Tasklist Approval API" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "Base URL: $BaseUrl"
Write-Host "Session Token: $SessionToken"
Write-Host ""

# Test 1: Get Approval Queue
Write-Host "📋 Test 1: Get Approval Queue" -ForegroundColor Yellow
Write-Host "------------------------------"
try {
    $response1 = Invoke-RestMethod -Uri "$BaseUrl/api/tasklist/approval-queue" -Method GET -Headers $Headers
    Write-Host "✅ Success - Found $($response1.total) tasks pending approval" -ForegroundColor Green
    if ($response1.items.Count -gt 0) {
        Write-Host "📝 First task: $($response1.items[0].kode) - $($response1.items[0].pegawaiNama)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Get Approval Queue with Filters
Write-Host "📋 Test 2: Get Approval Queue with Filters" -ForegroundColor Yellow
Write-Host "-------------------------------------------"
try {
    $response2 = Invoke-RestMethod -Uri "$BaseUrl/api/tasklist/approval-queue?page=1&size=5&sortKey=scheduleAt&sortDir=asc" -Method GET -Headers $Headers
    Write-Host "✅ Success - Found $($response2.total) tasks (filtered)" -ForegroundColor Green
    Write-Host "📊 Summary: $($response2.summary.totalPending) pending, $($response2.summary.overdueCount) overdue" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Get Approval Statistics
Write-Host "📊 Test 3: Get Approval Statistics" -ForegroundColor Yellow
Write-Host "-----------------------------------"
try {
    $response3 = Invoke-RestMethod -Uri "$BaseUrl/api/tasklist/approval-stats?period=30" -Method GET -Headers $Headers
    Write-Host "✅ Success - Statistics for 30 days" -ForegroundColor Green
    Write-Host "📈 Pending: $($response3.summary.pendingApprovals), Approved: $($response3.summary.approvedTasks), Rejected: $($response3.summary.rejectedTasks)" -ForegroundColor Cyan
    if ($response3.summary.avgApprovalTimeHours) {
        Write-Host "⏱️ Avg Approval Time: $($response3.summary.avgApprovalTimeHours) hours" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Get Task Detail
Write-Host "🔍 Test 4: Get Task Detail" -ForegroundColor Yellow
Write-Host "--------------------------"
try {
    $response4 = Invoke-RestMethod -Uri "$BaseUrl/api/tasklist/1" -Method GET -Headers $Headers
    Write-Host "✅ Success - Task details retrieved" -ForegroundColor Green
    Write-Host "📝 Task: $($response4.item.kode) - Status: $($response4.item.status)" -ForegroundColor Cyan
    Write-Host "👤 Assignee: $($response4.item.pegawaiNama)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Get Tasks Waiting for Review
Write-Host "📝 Test 5: Get Tasks Waiting for Review" -ForegroundColor Yellow
Write-Host "----------------------------------------"
try {
    $response5 = Invoke-RestMethod -Uri "$BaseUrl/api/tasklist?status=MENUNGGU_REVIEW_PM&page=1&size=10" -Method GET -Headers $Headers
    Write-Host "✅ Success - Found $($response5.total) tasks waiting for review" -ForegroundColor Green
    if ($response5.items.Count -gt 0) {
        foreach ($task in $response5.items) {
            Write-Host "📋 $($task.kode) - $($task.pegawaiNama) - $($task.proyekNama)" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Approve Task (commented out)
Write-Host "✅ Test 6: Approve Task (DISABLED)" -ForegroundColor Gray
Write-Host "-----------------------------------"
Write-Host "⚠️ Approval test is disabled to prevent accidental changes" -ForegroundColor Yellow
Write-Host "💡 To enable, uncomment the code block below" -ForegroundColor Yellow

<#
$approveBody = @{
    status = "SELESAI"
    keterangan = "Task approved via PowerShell test script - excellent work!"
} | ConvertTo-Json

try {
    $response6 = Invoke-RestMethod -Uri "$BaseUrl/api/tasklist/1" -Method PUT -Headers $Headers -Body $approveBody
    Write-Host "✅ Task approved successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
#>
Write-Host ""

# Test 7: Reject Task (commented out)
Write-Host "❌ Test 7: Reject Task (DISABLED)" -ForegroundColor Gray
Write-Host "---------------------------------"
Write-Host "⚠️ Rejection test is disabled to prevent accidental changes" -ForegroundColor Yellow

<#
$rejectBody = @{
    status = "MENUNGGU_PROSES_USER"
    keterangan = "Please fix the following issues: 1. Add error handling, 2. Update tests, 3. Fix formatting"
} | ConvertTo-Json

try {
    $response7 = Invoke-RestMethod -Uri "$BaseUrl/api/tasklist/1" -Method PUT -Headers $Headers -Body $rejectBody
    Write-Host "✅ Task rejected successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
#>
Write-Host ""

Write-Host "✅ Testing completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Notes:" -ForegroundColor Cyan
Write-Host "- Tests 6 & 7 (approve/reject) are disabled to prevent accidental changes"
Write-Host "- Uncomment them if you want to test actual approval/rejection"
Write-Host "- Green = Success, Red = Error, Yellow = Warning"
Write-Host ""
Write-Host "🔧 To run this script:" -ForegroundColor Cyan
Write-Host "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser"
Write-Host ".\test-approval-api.ps1"