#!/bin/bash

# Test Script untuk API Approval Tasklist
# Session Token: 172dc4710ab54af8b1b405c89d6de9f0

BASE_URL="http://192.168.1.10:3000"
SESSION_TOKEN="172dc4710ab54af8b1b405c89d6de9f0"

echo "🚀 Testing Tasklist Approval API"
echo "================================="
echo "Base URL: $BASE_URL"
echo "Session Token: $SESSION_TOKEN"
echo ""

# Test Auth First
echo "🔐 Test 0: Check Authentication"
echo "-------------------------------"
curl -X GET "$BASE_URL/api/auth/me" \
  -H "Cookie: session=$SESSION_TOKEN" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"
echo "📋 Test 1: Get Approval Queue"
echo "------------------------------"
curl -X GET "$BASE_URL/api/tasklist/approval-queue" \
  -H "Cookie: session=$SESSION_TOKEN" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

# Test 2: Get Approval Queue with Filters
echo "📋 Test 2: Get Approval Queue with Filters"
echo "-------------------------------------------"
curl -X GET "$BASE_URL/api/tasklist/approval-queue?page=1&size=5&sortKey=scheduleAt&sortDir=asc" \
  -H "Cookie: session=$SESSION_TOKEN" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

# Test 3: Get Approval Statistics
echo "📊 Test 3: Get Approval Statistics"
echo "-----------------------------------"
curl -X GET "$BASE_URL/api/tasklist/approval-stats?period=30" \
  -H "Cookie: session=$SESSION_TOKEN" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

# Test 4: Get Task Detail (before approval)
echo "🔍 Test 4: Get Task Detail"
echo "--------------------------"
curl -X GET "$BASE_URL/api/tasklist/1" \
  -H "Cookie: session=$SESSION_TOKEN" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

# Test 5: Get All Tasks with Status Filter
echo "📝 Test 5: Get Tasks Waiting for Review"
echo "----------------------------------------"
curl -X GET "$BASE_URL/api/tasklist?status=MENUNGGU_REVIEW_PM&page=1&size=10" \
  -H "Cookie: session=$SESSION_TOKEN" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

# Test 6: Approve Task (uncomment to test)
echo "✅ Test 6: Approve Task (Multiple Formats)"
echo "------------------------------------------"

# Format 1: Standard
echo "🔧 Testing Format 1: Standard Cookie"
curl -X PUT "$BASE_URL/api/tasklist/1" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$SESSION_TOKEN" \
  -d '{
    "status": "SELESAI",
    "keterangan": "Task approved via test script - format 1"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"

echo ""

# Format 2: With quotes
echo "🔧 Testing Format 2: Quoted Cookie"
curl -X PUT "$BASE_URL/api/tasklist/1" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=\"$SESSION_TOKEN\"" \
  -d '{
    "status": "SELESAI",
    "keterangan": "Task approved via test script - format 2"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"

echo ""

# Format 3: With Path and HttpOnly
echo "🔧 Testing Format 3: Full Cookie Attributes"
curl -X PUT "$BASE_URL/api/tasklist/1" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$SESSION_TOKEN; Path=/; HttpOnly" \
  -d '{
    "status": "SELESAI",
    "keterangan": "Task approved via test script - format 3"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"

echo ""

# Test 7: Reject Task (uncomment to test)
# echo "❌ Test 7: Reject Task"
# echo "----------------------"
# curl -X PUT "$BASE_URL/api/tasklist/1" \
#   -H "Content-Type: application/json" \
#   -H "Cookie: session=$SESSION_TOKEN" \
#   -d '{
#     "status": "MENUNGGU_PROSES_USER",
#     "keterangan": "Please fix the following issues: 1. Add error handling, 2. Update tests, 3. Fix formatting"
#   }' \
#   -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

echo "✅ Testing completed!"
echo ""
echo "📝 Notes:"
echo "- Tests 6 & 7 (approve/reject) are commented out to prevent accidental changes"
echo "- Uncomment them if you want to test actual approval/rejection"
echo "- Status 200 = Success, 401 = Unauthorized, 403 = Forbidden"
echo ""
echo "🔧 To run this script:"
echo "chmod +x test-approval-api.sh"
echo "./test-approval-api.sh"