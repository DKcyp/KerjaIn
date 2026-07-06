#!/bin/bash

# RichzLog API Testing Script
# Tests Timeline and Chat APIs for Flutter mobile app

BASE_URL="http://localhost:3000"
TASKLIST_ID=1

echo "=========================================="
echo "RichzLog API Testing"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Get Timeline
echo -e "${YELLOW}Test 1: GET Timeline${NC}"
echo "GET $BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/timeline"
curl -X GET "$BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/timeline?page=1&size=20" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "=========================================="
echo ""

# Test 2: Get Timeline with pagination
echo -e "${YELLOW}Test 2: GET Timeline (Page 2)${NC}"
echo "GET $BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/timeline?page=2&size=10"
curl -X GET "$BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/timeline?page=2&size=10" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "=========================================="
echo ""

# Test 3: Get Chat Messages
echo -e "${YELLOW}Test 3: GET Chat Messages${NC}"
echo "GET $BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/chat"
curl -X GET "$BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/chat?page=1&size=50" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "=========================================="
echo ""

# Test 4: Send Chat Message (Text)
echo -e "${YELLOW}Test 4: POST Chat Message (Text)${NC}"
echo "POST $BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/chat"
curl -X POST "$BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test message from API testing script",
    "messageType": "text"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "=========================================="
echo ""

# Test 5: Send Chat Message with File
echo -e "${YELLOW}Test 5: POST Chat Message (With File)${NC}"
echo "POST $BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/chat"
curl -X POST "$BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Here is the document",
    "messageType": "file",
    "attachments": [{
      "fileName": "test-document.pdf",
      "fileSize": 1024000,
      "fileType": "application/pdf",
      "fileUrl": "https://example.com/files/test-document.pdf"
    }]
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "=========================================="
echo ""

# Test 6: Get Unread Count
echo -e "${YELLOW}Test 6: GET Unread Count${NC}"
echo "GET $BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/chat/unread-count"
curl -X GET "$BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/chat/unread-count" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "=========================================="
echo ""

# Test 7: Mark Messages as Read
echo -e "${YELLOW}Test 7: POST Mark Messages as Read${NC}"
echo "POST $BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/chat/read"
curl -X POST "$BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/chat/read" \
  -H "Content-Type: application/json" \
  -d '{
    "messageIds": [1, 2, 3]
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "=========================================="
echo ""

# Test 8: Test with Invalid Tasklist ID
echo -e "${YELLOW}Test 8: GET Timeline (Invalid ID)${NC}"
echo "GET $BASE_URL/api/richzlog/tasklist/99999/timeline"
curl -X GET "$BASE_URL/api/richzlog/tasklist/99999/timeline" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "=========================================="
echo ""

# Test 9: Test Timeline with Sort Direction
echo -e "${YELLOW}Test 9: GET Timeline (Ascending Order)${NC}"
echo "GET $BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/timeline?sortDir=asc"
curl -X GET "$BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/timeline?sortDir=asc&size=5" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "=========================================="
echo ""

# Test 10: Test Chat with Date Filters
echo -e "${YELLOW}Test 10: GET Chat Messages (After specific date)${NC}"
AFTER_DATE="2024-01-01T00:00:00Z"
echo "GET $BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/chat?after=$AFTER_DATE"
curl -X GET "$BASE_URL/api/richzlog/tasklist/$TASKLIST_ID/chat?after=$AFTER_DATE" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.'
echo ""
echo "=========================================="
echo ""

echo -e "${GREEN}Testing Complete!${NC}"
echo ""
echo "Summary:"
echo "- Timeline API: GET /api/richzlog/tasklist/[id]/timeline"
echo "- Chat API: GET/POST /api/richzlog/tasklist/[id]/chat"
echo "- Unread Count: GET /api/richzlog/tasklist/[id]/chat/unread-count"
echo "- Mark Read: POST /api/richzlog/tasklist/[id]/chat/read"
