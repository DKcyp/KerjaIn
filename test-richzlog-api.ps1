# RichzLog API Testing Script (PowerShell)
# Tests Timeline and Chat APIs for Flutter mobile app

$BaseUrl = "http://localhost:3000"
$TasklistId = 1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "RichzLog API Testing" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Get Timeline
Write-Host "Test 1: GET Timeline" -ForegroundColor Yellow
Write-Host "GET $BaseUrl/api/richzlog/tasklist/$TasklistId/timeline"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/richzlog/tasklist/$TasklistId/timeline?page=1&size=20" `
        -Method Get `
        -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
    Write-Host "Status: 200 OK" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 2: Get Timeline with pagination
Write-Host "Test 2: GET Timeline (Page 2)" -ForegroundColor Yellow
Write-Host "GET $BaseUrl/api/richzlog/tasklist/$TasklistId/timeline?page=2&size=10"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/richzlog/tasklist/$TasklistId/timeline?page=2&size=10" `
        -Method Get `
        -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
    Write-Host "Status: 200 OK" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 3: Get Chat Messages
Write-Host "Test 3: GET Chat Messages" -ForegroundColor Yellow
Write-Host "GET $BaseUrl/api/richzlog/tasklist/$TasklistId/chat"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/richzlog/tasklist/$TasklistId/chat?page=1&size=50" `
        -Method Get `
        -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
    Write-Host "Status: 200 OK" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 4: Send Chat Message (Text)
Write-Host "Test 4: POST Chat Message (Text)" -ForegroundColor Yellow
Write-Host "POST $BaseUrl/api/richzlog/tasklist/$TasklistId/chat"
try {
    $body = @{
        message = "Test message from PowerShell testing script"
        messageType = "text"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/richzlog/tasklist/$TasklistId/chat" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    $response | ConvertTo-Json -Depth 10
    Write-Host "Status: 201 Created" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 5: Send Chat Message with File
Write-Host "Test 5: POST Chat Message (With File)" -ForegroundColor Yellow
Write-Host "POST $BaseUrl/api/richzlog/tasklist/$TasklistId/chat"
try {
    $body = @{
        message = "Here is the document"
        messageType = "file"
        attachments = @(
            @{
                fileName = "test-document.pdf"
                fileSize = 1024000
                fileType = "application/pdf"
                fileUrl = "https://example.com/files/test-document.pdf"
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/richzlog/tasklist/$TasklistId/chat" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    $response | ConvertTo-Json -Depth 10
    Write-Host "Status: 201 Created" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 6: Get Unread Count
Write-Host "Test 6: GET Unread Count" -ForegroundColor Yellow
Write-Host "GET $BaseUrl/api/richzlog/tasklist/$TasklistId/chat/unread-count"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/richzlog/tasklist/$TasklistId/chat/unread-count" `
        -Method Get `
        -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
    Write-Host "Status: 200 OK" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 7: Mark Messages as Read
Write-Host "Test 7: POST Mark Messages as Read" -ForegroundColor Yellow
Write-Host "POST $BaseUrl/api/richzlog/tasklist/$TasklistId/chat/read"
try {
    $body = @{
        messageIds = @(1, 2, 3)
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/richzlog/tasklist/$TasklistId/chat/read" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    $response | ConvertTo-Json -Depth 10
    Write-Host "Status: 200 OK" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 8: Test with Invalid Tasklist ID
Write-Host "Test 8: GET Timeline (Invalid ID)" -ForegroundColor Yellow
Write-Host "GET $BaseUrl/api/richzlog/tasklist/99999/timeline"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/richzlog/tasklist/99999/timeline" `
    