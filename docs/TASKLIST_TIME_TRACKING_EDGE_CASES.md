# Tasklist Time-Tracking API: Edge Cases & Test Scenarios

## Overview
This document comprehensively covers all edge cases, error scenarios, and testing possibilities for the Tasklist Time-Tracking API endpoints. It serves as a reference for developers, testers, and QA teams.

## API Endpoints Covered
- `GET /api/tasklist/[id]/time-tracking` - Get task time information
- `POST /api/tasklist/[id]/time-tracking` - Perform time tracking actions

---

## 1. Authentication & Authorization Edge Cases

### 1.1 Session Management
| Scenario | Input | Expected Behavior | Status Code | Error Message |
|----------|-------|-------------------|-------------|---------------|
| No session cookie | Request without auth | Reject request | 401 | "Unauthorized" |
| Expired session | Expired session token | Reject request | 401 | "Unauthorized" |
| Invalid session | Malformed session data | Reject request | 401 | "Unauthorized" |
| Session with null user | `{ user: null }` | Reject request | 401 | "Unauthorized" |
| Session with undefined user | `{ user: undefined }` | Reject request | 401 | "Unauthorized" |
| Valid session | Valid user session | Allow request | 200/400/500 | Based on request |

### 1.2 User Permission Edge Cases
| Scenario | Input | Expected Behavior | Status Code | Error Message |
|----------|-------|-------------------|-------------|---------------|
| User not assigned to task | Different user ID | Business logic handles | 403 | "Only the assigned user can..." |
| User with insufficient role | Wrong role | Business logic handles | 403 | Permission-specific message |
| Deleted user account | Non-existent user ID | Business logic handles | 403 | User-specific error |

---

## 2. Parameter Validation Edge Cases

### 2.1 Task ID Validation
| Scenario | Input | Expected Behavior | Status Code | Error Message |
|----------|-------|-------------------|-------------|---------------|
| Valid integer | `"123"` | Parse successfully | 200/404/500 | Based on task existence |
| Zero | `"0"` | Reject as invalid | 400 | "Invalid task ID" |
| Negative number | `"-1"` | Reject as invalid | 400 | "Invalid task ID" |
| Float number | `"123.45"` | Reject as invalid | 400 | "Invalid task ID" |
| Non-numeric string | `"abc"` | Reject as invalid | 400 | "Invalid task ID" |
| Empty string | `""` | Reject as invalid | 400 | "Invalid task ID" |
| Very large number | `"999999999999999"` | Parse if within int range | 200/404/500 | Based on task existence |
| Scientific notation | `"1e5"` | Reject as invalid | 400 | "Invalid task ID" |
| Hexadecimal | `"0xFF"` | Reject as invalid | 400 | "Invalid task ID" |
| Special characters | `"123@#$"` | Reject as invalid | 400 | "Invalid task ID" |
| Unicode characters | `"123中文"` | Reject as invalid | 400 | "Invalid task ID" |

### 2.2 Action Parameter Validation (POST only)
| Scenario | Input | Expected Behavior | Status Code | Error Message |
|----------|-------|-------------------|-------------|---------------|
| Valid actions | `"start"`, `"pause"`, `"resume"`, `"stop"`, `"complete"` | Process action | 200/500 | Based on business logic |
| Case variations | `"START"`, `"Pause"`, `"RESUME"` | Convert to lowercase and process | 200/500 | Based on business logic |
| Action with whitespace | `"  start  "` | Trim and process | 200/500 | Based on business logic |
| Invalid action | `"invalid_action"` | Reject | 400 | "Invalid action. Supported actions: ..." |
| Empty action | `""` | Reject | 400 | "Action is required" |
| Null action | `null` | Reject | 400 | "Action is required" |
| Undefined action | `undefined` | Reject | 400 | "Action is required" |
| Non-string action | `123`, `true`, `{}` | Reject | 400 | "Action is required" |
| Very long action | `"a".repeat(1000)` | Reject | 400 | "Invalid action. Supported actions: ..." |
| Action with special chars | `"start@#$%"` | Reject | 400 | "Invalid action. Supported actions: ..." |
| SQL injection attempt | `"start'; DROP TABLE--"` | Reject | 400 | "Invalid action. Supported actions: ..." |

---

## 3. Request Body Edge Cases (POST only)

### 3.1 JSON Parsing
| Scenario | Input | Expected Behavior | Status Code | Error Message |
|----------|-------|-------------------|-------------|---------------|
| Valid JSON | `{"action": "start"}` | Parse successfully | 200/400/500 | Based on content |
| Empty body | `""` | Default to empty object | 400 | "Action is required" |
| Invalid JSON | `"invalid json"` | Default to empty object | 400 | "Action is required" |
| Malformed JSON | `{"action": "start"` | Default to empty object | 400 | "Action is required" |
| Very large JSON | 10MB+ payload | Handle gracefully | 400/413 | Size limit error |
| Nested objects | `{"action": {"type": "start"}}` | Extract action field | 400 | "Action is required" |
| Array instead of object | `["start"]` | Handle gracefully | 400 | "Action is required" |
| Multiple actions | `{"action": "start", "action2": "pause"}` | Use first action | 200/400/500 | Based on action |

### 3.2 Content-Type Handling
| Scenario | Input | Expected Behavior | Status Code | Error Message |
|----------|-------|-------------------|-------------|---------------|
| application/json | Standard content type | Parse JSON | 200/400/500 | Based on content |
| No Content-Type | Missing header | Attempt JSON parse | 200/400/500 | Based on content |
| text/plain | Wrong content type | Attempt JSON parse | 200/400/500 | Based on content |
| multipart/form-data | Form data | Attempt JSON parse | 400 | "Action is required" |

---

## 4. Database Edge Cases

### 4.1 Task Existence
| Scenario | Input | Expected Behavior | Status Code | Error Message |
|----------|-------|-------------------|-------------|---------------|
| Existing task | Valid task ID | Return task info | 200 | N/A |
| Non-existent task | Non-existent ID | Return not found | 404 | "Task not found" |
| Soft-deleted task | Deleted task ID | Return not found | 404 | "Task not found" |
| Task in different project | Cross-project access | Business logic handles | 403/404 | Permission error |

### 4.2 Database Connection Issues
| Scenario | Input | Expected Behavior | Status Code | Error Message |
|----------|-------|-------------------|-------------|---------------|
| Connection timeout | Any valid request | Return server error | 500 | "Internal server error" |
| Database unavailable | Any valid request | Return server error | 500 | "Internal server error" |
| Query timeout | Long-running query | Return server error | 500 | "Internal server error" |
| Connection pool exhausted | High concurrency | Return server error | 500 | "Internal server error" |
| Deadlock scenario | Concurrent updates | Retry or return error | 500 | "Internal server error" |

### 4.3 Data Integrity Issues
| Scenario | Input | Expected Behavior | Status Code | Error Message |
|----------|-------|-------------------|-------------|---------------|
| Corrupted task data | Invalid status values | Handle gracefully | 500 | "Internal server error" |
| Missing foreign keys | Orphaned records | Handle gracefully | 500 | "Internal server error" |
| Constraint violations | Invalid updates | Return error | 500 | "Internal server error" |

---

## 5. Business Logic Edge Cases

### 5.1 Task Status Transitions
| Current Status | Action | Expected Behavior | Status Code | Error Message |
|----------------|--------|-------------------|-------------|---------------|
| MENUNGGU_PROSES_USER | start | Allow transition | 200 | N/A |
| MENUNGGU_PROSES_USER | pause/resume/stop/complete | Reject | 403 | Status-specific error |
| SEDANG_DIPROSES_USER | pause/stop/complete | Allow transition | 200 | N/A |
| SEDANG_DIPROSES_USER | start/resume | Handle appropriately | 200/403 | Based on logic |
| SEDANG_DIPROSES_USER_PAUSED | resume/stop/complete | Allow transition | 200 | N/A |
| SEDANG_DIPROSES_USER_PAUSED | start/pause | Handle appropriately | 200/403 | Based on logic |
| MENUNGGU_REVIEW_PM | Any action | Reject | 403 | "Task is under review" |
| SELESAI | Any action | Reject | 403 | "Task is completed" |

### 5.2 Single Task Constraint
| Scenario | Input | Expected Behavior | Status Code | Error Message |
|----------|-------|-------------------|-------------|---------------|
| No active tasks | start new task | Allow | 200 | N/A |
| One active task | start another task | Reject with details | 500 | "ACTIVE_TASK_EXISTS:..." |
| Resume paused task | resume action | Allow (bypass constraint) | 200 | N/A |
| Start after stopping | start after stop | Allow | 200 | N/A |
| Concurrent start requests | Multiple start calls | Handle race condition | 200/500 | First wins or error |

### 5.3 User Assignment Validation
| Scenario | Input | Expected Behavior | Status Code | Error Message |
|----------|-------|-------------------|-------------|---------------|
| Assigned user | Correct user ID | Allow action | 200 | N/A |
| Different user | Wrong user ID | Reject | 403 | "Only the assigned user can..." |
| Unassigned task | No pegawaiId | Handle gracefully | 403/500 | Assignment error |
| Multiple assignees | Complex assignment | Business logic handles | 200/403 | Based on logic |

---

## 6. Performance Edge Cases

### 6.1 Load Testing Scenarios
| Scenario | Input | Expected Behavior | Performance Target |
|----------|-------|-------------------|-------------------|
| High concurrency | 100+ simultaneous requests | Handle gracefully | < 2s response time |
| Large task IDs | Very large integers | Parse efficiently | < 100ms parsing |
| Frequent polling | GET requests every second | Cache appropriately | < 50ms cached response |
| Bulk operations | Multiple actions in sequence | Handle efficiently | < 5s total time |

### 6.2 Memory Usage
| Scenario | Input | Expected Behavior | Memory Target |
|----------|-------|-------------------|---------------|
| Large payloads | 1MB+ request body | Handle gracefully | < 100MB peak usage |
| Memory leaks | Repeated requests | No memory growth | Stable memory usage |
| Garbage collection | Long-running processes | Clean up properly | Regular GC cycles |

---

## 7. Security Edge Cases

### 7.1 Input Sanitization
| Scenario | Input | Expected Behavior | Security Concern |
|----------|-------|-------------------|------------------|
| SQL injection | Malicious SQL in action | Sanitize input | SQL injection prevention |
| XSS attempts | Script tags in action | Sanitize input | XSS prevention |
| Path traversal | `../../../etc/passwd` | Reject input | Path traversal prevention |
| Command injection | Shell commands | Sanitize input | Command injection prevention |

### 7.2 Rate Limiting
| Scenario | Input | Expected Behavior | Rate Limit |
|----------|-------|-------------------|------------|
| Normal usage | Regular requests | Allow all | No limit |
| Rapid requests | 100 req/min | Apply rate limiting | 60 req/min |
| Burst traffic | Sudden spike | Handle gracefully | Queue or reject |
| DDoS simulation | Thousands of requests | Protect service | Block/throttle |

---

## 8. Network Edge Cases

### 8.1 Connection Issues
| Scenario | Input | Expected Behavior | Timeout |
|----------|-------|-------------------|---------|
| Slow network | Delayed requests | Handle gracefully | 30s timeout |
| Connection drops | Mid-request disconnect | Log and cleanup | Immediate cleanup |
| Partial requests | Incomplete data | Handle gracefully | 10s timeout |

### 8.2 Response Handling
| Scenario | Input | Expected Behavior | Response Size |
|----------|-------|-------------------|---------------|
| Large responses | Complex task data | Stream if needed | < 1MB response |
| Empty responses | No data scenarios | Return appropriate empty | < 1KB response |
| Error responses | Various error types | Consistent format | < 10KB response |

---

## 9. Integration Edge Cases

### 9.1 External Service Dependencies
| Scenario | Input | Expected Behavior | Fallback |
|----------|-------|-------------------|----------|
| Auth service down | Authentication requests | Graceful degradation | Local cache |
| Database down | Data requests | Return service error | Error message |
| Logging service down | Log requests | Continue operation | Local logging |

### 9.2 Version Compatibility
| Scenario | Input | Expected Behavior | Compatibility |
|----------|-------|-------------------|---------------|
| Old client versions | Legacy request format | Support if possible | Backward compatibility |
| New client versions | Future request format | Handle gracefully | Forward compatibility |
| API version mismatch | Wrong API version | Return version error | Version validation |

---

## 10. Monitoring & Observability Edge Cases

### 10.1 Logging Scenarios
| Scenario | Input | Expected Behavior | Log Level |
|----------|-------|-------------------|-----------|
| Successful operations | Normal requests | Log basic info | INFO |
| Client errors | 4xx responses | Log request details | WARN |
| Server errors | 5xx responses | Log full stack trace | ERROR |
| Performance issues | Slow responses | Log timing data | WARN |

### 10.2 Metrics Collection
| Scenario | Input | Expected Behavior | Metric Type |
|----------|-------|-------------------|-------------|
| Request count | All requests | Increment counter | Counter |
| Response time | Request duration | Record histogram | Histogram |
| Error rate | Failed requests | Calculate percentage | Gauge |
| Active tasks | Current state | Track current count | Gauge |

---

## 11. Recovery & Resilience Edge Cases

### 11.1 Failure Recovery
| Scenario | Input | Expected Behavior | Recovery Time |
|----------|-------|-------------------|---------------|
| Service restart | Application restart | Resume normal operation | < 30s |
| Database failover | DB connection switch | Reconnect automatically | < 60s |
| Cache invalidation | Cache clear | Rebuild cache | < 5min |

### 11.2 Data Consistency
| Scenario | Input | Expected Behavior | Consistency Level |
|----------|-------|-------------------|-------------------|
| Concurrent updates | Multiple users | Handle conflicts | Eventual consistency |
| Transaction rollback | Failed operations | Restore previous state | Strong consistency |
| Partial failures | Some operations fail | Maintain data integrity | Strong consistency |

---

## 12. Testing Recommendations

### 12.1 Unit Test Categories
1. **Authentication Tests** - All session scenarios
2. **Validation Tests** - All parameter combinations
3. **Business Logic Tests** - All status transitions
4. **Error Handling Tests** - All error scenarios
5. **Performance Tests** - Load and stress testing
6. **Security Tests** - Input sanitization and injection

### 12.2 Integration Test Categories
1. **End-to-End Workflows** - Complete user journeys
2. **Database Integration** - Real database operations
3. **External Service Integration** - Auth and logging services
4. **Concurrent Operation Tests** - Multi-user scenarios

### 12.3 Manual Test Categories
1. **UI Integration** - Frontend component testing
2. **User Experience** - Real user workflows
3. **Browser Compatibility** - Cross-browser testing
4. **Mobile Testing** - Mobile device testing

---

## 13. Test Data Requirements

### 13.1 Database Test Data
```sql
-- Test users with different roles
INSERT INTO pegawai (id, username, role, namaLengkap) VALUES 
(1, 'testuser1', 'PROGRAMMER', 'Test User 1'),
(2, 'testuser2', 'PM', 'Test User 2'),
(3, 'testuser3', 'ADMIN', 'Test User 3');

-- Test tasks in various states
INSERT INTO tasklist (id, projectId, moduleId, pegawaiId, status, kode) VALUES
(100, 1, 1, 1, 'MENUNGGU_PROSES_USER', 'TEST-001'),
(101, 1, 1, 1, 'SEDANG_DIPROSES_USER', 'TEST-002'),
(102, 1, 1, 1, 'SEDANG_DIPROSES_USER_PAUSED', 'TEST-003'),
(103, 1, 1, 2, 'MENUNGGU_PROSES_USER', 'TEST-004'),
(104, 1, 1, 1, 'MENUNGGU_REVIEW_PM', 'TEST-005'),
(105, 1, 1, 1, 'SELESAI', 'TEST-006');
```

### 13.2 Mock Data Scenarios
- Valid sessions with different user roles
- Invalid/expired sessions
- Tasks with various status combinations
- Time tracking data with different durations
- Error scenarios with specific error types

---

## 14. Automation Guidelines

### 14.1 Continuous Integration
- Run all unit tests on every commit
- Run integration tests on merge requests
- Run performance tests on release candidates
- Run security tests weekly

### 14.2 Test Environment Setup
- Isolated test database with clean data
- Mock external services for consistent testing
- Automated test data setup and teardown
- Parallel test execution for faster feedback

---

## 15. Conclusion

This comprehensive edge case documentation ensures thorough testing coverage for the Tasklist Time-Tracking API. Regular updates to this document should reflect new features, discovered edge cases, and evolving business requirements.

### Key Testing Priorities
1. **Security** - Input validation and injection prevention
2. **Data Integrity** - Consistent state management
3. **Performance** - Response time and resource usage
4. **User Experience** - Error messages and workflow clarity
5. **Reliability** - Error handling and recovery mechanisms
