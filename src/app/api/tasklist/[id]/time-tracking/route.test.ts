/**
 * Comprehensive Unit Tests for Tasklist Time-Tracking API Routes
 * 
 * This file contains extensive unit tests covering all edge cases and possibilities
 * for the time-tracking API endpoints (GET and POST).
 * 
 * Test Coverage:
 * - Authentication scenarios
 * - Parameter validation
 * - Database error handling
 * - Business logic validation
 * - Single task constraint
 * - Status transitions
 * - Error responses
 * - Success scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from './route';
import { getServerSession } from '@/lib/auth';
import { 
  startTask, 
  pauseTask, 
  resumeTask, 
  stopTask, 
  completeTask, 
  getTaskTimeInfo 
} from '@/lib/taskTimeTracker';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/taskTimeTracker');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockStartTask = startTask as jest.MockedFunction<typeof startTask>;
const mockPauseTask = pauseTask as jest.MockedFunction<typeof pauseTask>;
const mockResumeTask = resumeTask as jest.MockedFunction<typeof resumeTask>;
const mockStopTask = stopTask as jest.MockedFunction<typeof stopTask>;
const mockCompleteTask = completeTask as jest.MockedFunction<typeof completeTask>;
const mockGetTaskTimeInfo = getTaskTimeInfo as jest.MockedFunction<typeof getTaskTimeInfo>;

// Test data constants
const VALID_USER_SESSION = {
  user: {
    id: 1,
    username: 'testuser',
    role: 'PROGRAMMER' as const
  }
};

const VALID_TASK_TIME_INFO = {
  id: 123,
  status: 'SEDANG_DIPROSES_USER' as const,
  startedAt: new Date('2025-10-12T10:00:00Z'),
  pausedAt: null,
  totalDurationMinutes: 30,
  isPaused: false,
  isActive: true,
  currentSessionMinutes: 15
};

const MOCK_PARAMS = Promise.resolve({ id: '123' });

// Helper functions
const createMockRequest = (url: string = 'http://localhost:3000/api/tasklist/123/time-tracking', body?: any): NextRequest => {
  const request = new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    ...(body && {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })
  });
  return request;
};

const createMockParams = (id: string = '123') => Promise.resolve({ id });

describe('GET /api/tasklist/[id]/time-tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Tests', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);
      
      const request = createMockRequest();
      const response = await GET(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when session exists but user is null', async () => {
      mockGetServerSession.mockResolvedValue({ user: null } as any);
      
      const request = createMockRequest();
      const response = await GET(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Parameter Validation Tests', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(VALID_USER_SESSION);
    });

    it('should return 400 for invalid task ID (non-numeric)', async () => {
      const request = createMockRequest();
      const response = await GET(request, { params: createMockParams('abc') });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid task ID');
    });

    it('should return 400 for invalid task ID (zero)', async () => {
      const request = createMockRequest();
      const response = await GET(request, { params: createMockParams('0') });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid task ID');
    });

    it('should return 400 for invalid task ID (negative)', async () => {
      const request = createMockRequest();
      const response = await GET(request, { params: createMockParams('-1') });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid task ID');
    });

    it('should return 400 for invalid task ID (float)', async () => {
      const request = createMockRequest();
      const response = await GET(request, { params: createMockParams('123.45') });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid task ID');
    });
  });

  describe('Database Error Handling Tests', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(VALID_USER_SESSION);
    });

    it('should return 404 when task is not found', async () => {
      mockGetTaskTimeInfo.mockResolvedValue(null);
      
      const request = createMockRequest();
      const response = await GET(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('Task not found');
    });

    it('should return 500 when database throws error', async () => {
      mockGetTaskTimeInfo.mockRejectedValue(new Error('Database connection failed'));
      
      const request = createMockRequest();
      const response = await GET(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Database connection failed');
    });

    it('should return 500 when database throws non-Error object', async () => {
      mockGetTaskTimeInfo.mockRejectedValue('String error');
      
      const request = createMockRequest();
      const response = await GET(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Unknown error');
    });
  });

  describe('Success Scenarios', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(VALID_USER_SESSION);
    });

    it('should return task time info successfully', async () => {
      mockGetTaskTimeInfo.mockResolvedValue(VALID_TASK_TIME_INFO);
      
      const request = createMockRequest();
      const response = await GET(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual(VALID_TASK_TIME_INFO);
      expect(mockGetTaskTimeInfo).toHaveBeenCalledWith(123);
    });

    it('should handle large task IDs correctly', async () => {
      const largeId = '999999999';
      mockGetTaskTimeInfo.mockResolvedValue({ ...VALID_TASK_TIME_INFO, id: 999999999 });
      
      const request = createMockRequest();
      const response = await GET(request, { params: createMockParams(largeId) });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(mockGetTaskTimeInfo).toHaveBeenCalledWith(999999999);
    });
  });
});

describe('POST /api/tasklist/[id]/time-tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Tests', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);
      
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Parameter Validation Tests', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(VALID_USER_SESSION);
    });

    it('should return 400 for invalid task ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/tasklist/abc/time-tracking', { action: 'start' });
      const response = await POST(request, { params: createMockParams('abc') });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid task ID');
    });

    it('should return 400 when action is missing', async () => {
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', {});
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Action is required');
    });

    it('should return 400 when action is null', async () => {
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: null });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Action is required');
    });

    it('should return 400 when action is not a string', async () => {
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 123 });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Action is required');
    });

    it('should return 400 for invalid action', async () => {
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'invalid_action' });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action. Supported actions: start, pause, resume, stop, complete');
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasklist/123/time-tracking', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });
      
      mockGetServerSession.mockResolvedValue(VALID_USER_SESSION);
      
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Action is required');
    });
  });

  describe('Action-Specific Tests', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(VALID_USER_SESSION);
    });

    describe('Start Action', () => {
      it('should start task successfully', async () => {
        mockStartTask.mockResolvedValue(VALID_TASK_TIME_INFO);
        
        const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
        const response = await POST(request, { params: MOCK_PARAMS });
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.action).toBe('start');
        expect(data.timeInfo).toEqual(VALID_TASK_TIME_INFO);
        expect(mockStartTask).toHaveBeenCalledWith(123, 1);
      });

      it('should handle single task constraint error', async () => {
        mockStartTask.mockRejectedValue(new Error('ACTIVE_TASK_EXISTS:You already have an active task running: "PRJ-001-1". Please stop or complete it before starting a new task.'));
        
        const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
        const response = await POST(request, { params: MOCK_PARAMS });
        const data = await response.json();
        
        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
        expect(data.message).toContain('ACTIVE_TASK_EXISTS');
      });

      it('should handle case-insensitive action', async () => {
        mockStartTask.mockResolvedValue(VALID_TASK_TIME_INFO);
        
        const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'START' });
        const response = await POST(request, { params: MOCK_PARAMS });
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.action).toBe('start');
        expect(mockStartTask).toHaveBeenCalledWith(123, 1);
      });
    });

    describe('Pause Action', () => {
      it('should pause task successfully', async () => {
        const pausedTaskInfo = { ...VALID_TASK_TIME_INFO, isPaused: true, isActive: false };
        mockPauseTask.mockResolvedValue(pausedTaskInfo);
        
        const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'pause' });
        const response = await POST(request, { params: MOCK_PARAMS });
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.action).toBe('pause');
        expect(data.timeInfo).toEqual(pausedTaskInfo);
        expect(mockPauseTask).toHaveBeenCalledWith(123, 1);
      });
    });

    describe('Resume Action', () => {
      it('should resume task successfully', async () => {
        mockResumeTask.mockResolvedValue(VALID_TASK_TIME_INFO);
        
        const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'resume' });
        const response = await POST(request, { params: MOCK_PARAMS });
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.action).toBe('resume');
        expect(data.timeInfo).toEqual(VALID_TASK_TIME_INFO);
        expect(mockResumeTask).toHaveBeenCalledWith(123, 1);
      });
    });

    describe('Stop Action', () => {
      it('should stop task successfully', async () => {
        const stoppedTaskInfo = { ...VALID_TASK_TIME_INFO, isActive: false };
        mockStopTask.mockResolvedValue(stoppedTaskInfo);
        
        const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'stop' });
        const response = await POST(request, { params: MOCK_PARAMS });
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.action).toBe('stop');
        expect(data.timeInfo).toEqual(stoppedTaskInfo);
        expect(mockStopTask).toHaveBeenCalledWith(123, 1);
      });
    });

    describe('Complete Action', () => {
      it('should complete task successfully', async () => {
        const completedTaskInfo = { ...VALID_TASK_TIME_INFO, status: 'MENUNGGU_REVIEW_PM' as const, isActive: false };
        mockCompleteTask.mockResolvedValue(completedTaskInfo);
        
        const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'complete' });
        const response = await POST(request, { params: MOCK_PARAMS });
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.action).toBe('complete');
        expect(data.timeInfo).toEqual(completedTaskInfo);
        expect(mockCompleteTask).toHaveBeenCalledWith(123, 1);
      });
    });
  });

  describe('Error Handling Tests', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(VALID_USER_SESSION);
    });

    it('should return 500 when action function returns null', async () => {
      mockStartTask.mockResolvedValue(null);
      
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to perform action');
    });

    it('should return 404 for task not found error', async () => {
      mockStartTask.mockRejectedValue(new Error('Task not found'));
      
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('Task not found');
    });

    it('should return 403 for permission errors', async () => {
      mockStartTask.mockRejectedValue(new Error('Only the assigned user can start this task'));
      
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data.error).toBe('Only the assigned user can start this task');
    });

    it('should return 403 for status validation errors', async () => {
      mockStartTask.mockRejectedValue(new Error('Task cannot be started in current status'));
      
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data.error).toBe('Task cannot be started in current status');
    });

    it('should return 500 for database errors', async () => {
      mockStartTask.mockRejectedValue(new Error('Database connection failed'));
      
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Database connection failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockStartTask.mockRejectedValue('String error');
      
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Unknown error');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(VALID_USER_SESSION);
    });

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasklist/123/time-tracking', {
        method: 'POST',
        body: '',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Action is required');
    });

    it('should handle request without Content-Type header', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasklist/123/time-tracking', {
        method: 'POST',
        body: JSON.stringify({ action: 'start' })
      });
      
      mockStartTask.mockResolvedValue(VALID_TASK_TIME_INFO);
      
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle very long action strings', async () => {
      const longAction = 'a'.repeat(1000);
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: longAction });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action. Supported actions: start, pause, resume, stop, complete');
    });

    it('should handle action with special characters', async () => {
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start@#$%' });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action. Supported actions: start, pause, resume, stop, complete');
    });

    it('should handle action with whitespace', async () => {
      mockStartTask.mockResolvedValue(VALID_TASK_TIME_INFO);
      
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: '  start  ' });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe('start');
      expect(mockStartTask).toHaveBeenCalledWith(123, 1);
    });

    it('should handle concurrent requests gracefully', async () => {
      mockStartTask.mockResolvedValue(VALID_TASK_TIME_INFO);
      
      const request1 = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
      const request2 = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'pause' });
      
      const [response1, response2] = await Promise.all([
        POST(request1, { params: MOCK_PARAMS }),
        POST(request2, { params: MOCK_PARAMS })
      ]);
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe('Performance Tests', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(VALID_USER_SESSION);
    });

    it('should handle requests within reasonable time', async () => {
      mockStartTask.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(VALID_TASK_TIME_INFO), 10))
      );
      
      const startTime = Date.now();
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
      const response = await POST(request, { params: MOCK_PARAMS });
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle timeout scenarios', async () => {
      mockStartTask.mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), 100))
      );
      
      const request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
      const response = await POST(request, { params: MOCK_PARAMS });
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.message).toBe('Operation timeout');
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(VALID_USER_SESSION);
  });

  it('should handle complete workflow: start -> pause -> resume -> complete', async () => {
    // Start task
    mockStartTask.mockResolvedValue(VALID_TASK_TIME_INFO);
    let request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
    let response = await POST(request, { params: MOCK_PARAMS });
    expect(response.status).toBe(200);

    // Pause task
    const pausedInfo = { ...VALID_TASK_TIME_INFO, isPaused: true, isActive: false };
    mockPauseTask.mockResolvedValue(pausedInfo);
    request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'pause' });
    response = await POST(request, { params: MOCK_PARAMS });
    expect(response.status).toBe(200);

    // Resume task
    mockResumeTask.mockResolvedValue(VALID_TASK_TIME_INFO);
    request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'resume' });
    response = await POST(request, { params: MOCK_PARAMS });
    expect(response.status).toBe(200);

    // Complete task
    const completedInfo = { ...VALID_TASK_TIME_INFO, status: 'MENUNGGU_REVIEW_PM' as const, isActive: false };
    mockCompleteTask.mockResolvedValue(completedInfo);
    request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'complete' });
    response = await POST(request, { params: MOCK_PARAMS });
    expect(response.status).toBe(200);
  });

  it('should handle GET request after POST actions', async () => {
    // Start task
    mockStartTask.mockResolvedValue(VALID_TASK_TIME_INFO);
    let request = createMockRequest('http://localhost:3000/api/tasklist/123/time-tracking', { action: 'start' });
    await POST(request, { params: MOCK_PARAMS });

    // Get task info
    mockGetTaskTimeInfo.mockResolvedValue(VALID_TASK_TIME_INFO);
    request = createMockRequest();
    const response = await GET(request, { params: MOCK_PARAMS });
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toEqual(VALID_TASK_TIME_INFO);
  });
});
