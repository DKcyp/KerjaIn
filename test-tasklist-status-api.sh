#!/bin/bash

# RichzLog Tasklist Status API Test Script
# Usage: bash test-tasklist-status-api.sh

BASE_URL="http://192.168.1.5:3000"
API_KEY="172dc4710ab54af8b1b405c89d6de9f0"
USER_ID="123"
MANAGER_ID="45"
DIRECTOR_ID="1"

echo "========================================="
echo "RichzLog Tasklist Status API Test"
echo "========================================="
echo ""

# Test 1: My Tasks Summary
echo "1. Testing My Tasks Summary..."
curl -X GET "${BASE_URL}/api/richzlog/my-tasks/summary?userId=${USER_ID}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "---"
echo ""

# Test 2: My Tasks - Todo
echo "2. Testing My Tasks - Todo (Belum Dikerjakan)..."
curl -X GET "${BASE_URL}/api/richzlog/my-tasks?userId=${USER_ID}&status=todo&page=1&size=5" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "---"
echo ""

# Test 3: My Tasks - Doing
echo "3. Testing My Tasks - Doing (Sedang Dikerjakan)..."
curl -X GET "${BASE_URL}/api/richzlog/my-tasks?userId=${USER_ID}&status=doing&page=1&size=5" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "---"
echo ""

# Test 4: My Tasks - Pending Approval
echo "4. Testing My Tasks - Pending Approval (Menunggu Review)..."
curl -X GET "${BASE_URL}/api/richzlog/my-tasks?userId=${USER_ID}&status=pending_approval&page=1&size=5" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "---"
echo ""

# Test 5: My Tasks - Overdue
echo "5. Testing My Tasks - Overdue (Terlambat)..."
curl -X GET "${BASE_URL}/api/richzlog/my-tasks?userId=${USER_ID}&status=overdue&page=1&size=5" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "---"
echo ""

# Test 6: Manager Tasks Summary
echo "6. Testing Manager Tasks Summary..."
curl -X GET "${BASE_URL}/api/richzlog/manager/tasks/summary?managerId=${MANAGER_ID}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "---"
echo ""

# Test 7: Manager Tasks - Pending Approval
echo "7. Testing Manager Tasks - Pending Approval..."
curl -X GET "${BASE_URL}/api/richzlog/manager/tasks?managerId=${MANAGER_ID}&status=pending_approval&page=1&size=5" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "---"
echo ""

# Test 8: Director Tasks Summary
echo "8. Testing Director Tasks Summary..."
curl -X GET "${BASE_URL}/api/richzlog/director/tasks/summary?directorId=${DIRECTOR_ID}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "---"
echo ""

# Test 9: Director Tasks - Overdue
echo "9. Testing Director Tasks - Overdue..."
curl -X GET "${BASE_URL}/api/richzlog/director/tasks?directorId=${DIRECTOR_ID}&status=overdue&page=1&size=5" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "---"
echo ""

# Test 10: Invalid API Key
echo "10. Testing Invalid API Key (should return 401)..."
curl -X GET "${BASE_URL}/api/richzlog/my-tasks/summary?userId=${USER_ID}" \
  -H "x-api-key: invalid-key" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "---"
echo ""

# Test 11: Missing User ID
echo "11. Testing Missing User ID (should return 400)..."
curl -X GET "${BASE_URL}/api/richzlog/my-tasks/summary" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "---"
echo ""

# Test 12: Invalid Status
echo "12. Testing Invalid Status (should return 400)..."
curl -X GET "${BASE_URL}/api/richzlog/my-tasks?userId=${USER_ID}&status=invalid_status" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "---"
echo ""

echo "========================================="
echo "Test Completed!"
echo "========================================="
