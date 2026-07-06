#!/bin/bash

# Debug Script untuk API Approval Tasklist
# Session Token: 172dc4710ab54af8b1b405c89d6de9f0

BASE_URL="http://192.168.1.10:3000"
SESSION_TOKEN="172dc4710ab54af8b1b405c89d6de9f0"

echo "🔍 DEBUG: Tasklist Approval API"
echo "==============================="
echo "Base URL: $BASE_URL"
echo "Session Token: $SESSION_TOKEN"
echo ""

# Test 0: Check Authentication
echo "🔐 Test 0: Check Authentication"
echo "-------------------------------"
curl -X GET "$BASE_URL/api/auth/me" \
  -H "Cookie: session=$SESSION_TOKEN" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  -s -o /tmp/auth_response.json

echo "Response Body:"
cat /tmp/auth_response.json 2>/dev/null || echo "No response body"
echo -e "\n"

# Test 1: Get Task Detail First
echo "📋 Test 1: Get Task Detail (ID: 1)"
echo "-----------------------------------"
curl -X GET "$BASE_URL/api/tasklist/1" \
  -H "Cookie: session=$SESSION_TOKEN" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  -s -o /tmp/task_detail.json

echo "Task Detail:"
cat /tmp/task_detail.json 2>/dev/null || echo "No response body"
echo -e "\n"

# Test 2: Try Different Cookie Formats for Approval
echo "🧪 Test 2: Approve Task - Format 1 (Standard)"
echo "----------------------------------------------"
curl -X PUT "$BASE_URL/api/tasklist/1" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$SESSION_TOKEN" \
  -d '{
    "status": "SELESAI",
    "keterangan": "Debug test - format 1"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  -s -o /tmp/approve_1.json

echo "Response:"
cat /tmp/approve_1.json 2>/dev/null || echo "No response body"
echo -e "\n"

echo "🧪 Test 3: Approve Task - Format 2 (Quoted)"
echo "--------------------------------------------"
curl -X PUT "$BASE_URL/api/tasklist/1" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=\"$SESSION_TOKEN\"" \
  -d '{
    "status": "SELESAI",
    "keterangan": "Debug test - format 2"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  -s -o /tmp/approve_2.json

echo "Response:"
cat /tmp/approve_2.json 2>/dev/null || echo "No response body"
echo -e "\n"

echo "🧪 Test 4: Approve Task - Format 3 (Full Attributes)"
echo "----------------------------------------------------"
curl -X PUT "$BASE_URL/api/tasklist/1" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$SESSION_TOKEN; Path=/; HttpOnly" \
  -d '{
    "status": "SELESAI",
    "keterangan": "Debug test - format 3"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  -s -o /tmp/approve_3.json

echo "Response:"
cat /tmp/approve_3.json 2>/dev/null || echo "No response body"
echo -e "\n"

echo "🧪 Test 5: Approve Task - Verbose Mode"
echo "--------------------------------------"
echo "Running with verbose output to see headers..."
curl -X PUT "$BASE_URL/api/tasklist/1" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$SESSION_TOKEN" \
  -d '{
    "status": "SELESAI",
    "keterangan": "Debug test - verbose"
  }' \
  -v

echo -e "\n"

# Test 6: Try with Different Task ID
echo "🧪 Test 6: Try Different Task ID (ID: 2)"
echo "----------------------------------------"
curl -X PUT "$BASE_URL/api/tasklist/2" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$SESSION_TOKEN" \
  -d '{
    "status": "SELESAI",
    "keterangan": "Debug test - different ID"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  -s -o /tmp/approve_diff_id.json

echo "Response:"
cat /tmp/approve_diff_id.json 2>/dev/null || echo "No response body"
echo -e "\n"

# Test 7: Check if we can get approval queue
echo "📊 Test 7: Get Approval Queue"
echo "------------------------------"
curl -X GET "$BASE_URL/api/tasklist/approval-queue" \
  -H "Cookie: session=$SESSION_TOKEN" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  -s -o /tmp/approval_queue.json

echo "Approval Queue:"
cat /tmp/approval_queue.json 2>/dev/null || echo "No response body"
echo -e "\n"

echo "🔍 DEBUG SUMMARY"
echo "================"
echo "1. Check /tmp/auth_response.json for authentication status"
echo "2. Check /tmp/task_detail.json for task permissions"
echo "3. Check /tmp/approval_queue.json for available tasks"
echo "4. Look at verbose output above for detailed headers"
echo ""
echo "💡 NEXT STEPS:"
echo "- If auth fails: Get new session token from browser"
echo "- If task not found: Try different task ID"
echo "- If permission denied: Check user role and task ownership"
echo ""
echo "🧹 Cleanup temp files:"
echo "rm /tmp/auth_response.json /tmp/task_detail.json /tmp/approve_*.json /tmp/approval_queue.json"