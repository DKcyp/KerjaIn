/**
 * Integration Tests for Tasklist Time-Tracking API Routes
 * 
 * This file contains comprehensive integration tests that test the complete
 * workflow of the time-tracking system with real database operations and
 * end-to-end scenarios.
 */

import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { 
  TestDataFactory, 
  RequestBuilder, 
  AssertionHelpers,
  DatabaseTestUtils 
} from '@/lib/__tests__/testUtils';

// Mock only the authentication
jest.mock('@/lib/auth');
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

// Test configuration
const TEST_USER_ID = 9991;
const TEST_TASK_IDS = {
  waiting: 9991,
  active: 9992,
  paused: 9993,
  different_user: 9994,
  review: 9995,
  completed: 9996
};

describe('Tasklist Time-Tracking Integration Tests', () => {
  beforeAll(async () => {
    // Setup test data in real database
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup default authenticated user
    mockGetServerSession.mockResolvedValue({
      user: TestDataFactory.createMockUser({ id: TEST_USER_ID })
    });
  });

  describe('Complete Task Workflow Integration', () => {
    it('should handle complete start -> pause -> resume -> complete workflow', async () => {
      const taskId = TEST_TASK_IDS.waiting;
      const params = Promise.resolve({ id: taskId.toString() });

      // Step 1: Start the task
      let request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'start' });
      let response = await POST(request, { params });
      
      // Handle potential errors by logging them
      if (response.status !== 200) {
        const errorText = await response.text();
        console.log('Start task failed:', response.status, errorText);
        // Still run the assertion to show the failure
        expect(response.status).toBe(200);
        return;
      }
      
      let data = await response.json();
      
      // Check if we have the expected structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('action');
      expect(data).toHaveProperty('timeInfo');
      expect(data.success).toBe(true);
      expect(data.action).toBe('start');
      
      // Check basic timeInfo properties
      if (data.timeInfo) {
        expect(data.timeInfo.status).toBe('SEDANG_DIPROSES_USER');
        expect(data.timeInfo.isActive).toBe(true);
        expect(data.timeInfo.isPaused).toBe(false);
      }

      // Verify database state
      let dbTask: any = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { status: true, startedAt: true, isPaused: true }
      });
      expect(dbTask?.status).toBe('SEDANG_DIPROSES_USER');
      expect(dbTask?.startedAt).not.toBeNull();
      expect(dbTask?.isPaused).toBe(false);

      // Step 2: Pause the task
      request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'pause' });
      response = await POST(request, { params });
      
      expect(response.status).toBe(200);
      data = await response.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe('pause');
      
      if (data.timeInfo) {
        expect(data.timeInfo.status).toBe('SEDANG_DIPROSES_USER_PAUSED');
        expect(data.timeInfo.isActive).toBe(false);
        expect(data.timeInfo.isPaused).toBe(true);
      }

      // Verify database state
      dbTask = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { status: true, startedAt: true, pausedAt: true, isPaused: true, totalDurationMinutes: true }
      });
      expect(dbTask?.status).toBe('SEDANG_DIPROSES_USER_PAUSED');
      expect(dbTask?.pausedAt).not.toBeNull();
      expect(dbTask?.isPaused).toBe(true);
      expect(dbTask?.totalDurationMinutes).toBeGreaterThanOrEqual(0);

      // Step 3: Resume the task
      request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'resume' });
      response = await POST(request, { params });
      
      expect(response.status).toBe(200);
      data = await response.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe('resume');
      
      if (data.timeInfo) {
        expect(data.timeInfo.status).toBe('SEDANG_DIPROSES_USER');
        expect(data.timeInfo.isActive).toBe(true);
        expect(data.timeInfo.isPaused).toBe(false);
      }

      // Step 4: Complete the task
      request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'complete' });
      response = await POST(request, { params });
      
      expect(response.status).toBe(200);
      data = await response.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe('complete');
      
      if (data.timeInfo) {
        expect(data.timeInfo.status).toBe('MENUNGGU_REVIEW_PM');
        expect(data.timeInfo.isActive).toBe(false);
      }

      // Verify final database state
      dbTask = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { status: true, startedAt: true, pausedAt: true, totalDurationMinutes: true, isPaused: true }
      });
      expect(dbTask?.status).toBe('MENUNGGU_REVIEW_PM');
      expect(dbTask?.totalDurationMinutes).toBeGreaterThanOrEqual(0);
      expect(dbTask?.isPaused).toBe(false);
    });

    it('should handle start -> stop workflow', async () => {
      // Reset task to waiting state first
      await prisma.tasklist.update({
        where: { id: TEST_TASK_IDS.waiting },
        data: {
          status: 'MENUNGGU_PROSES_USER',
          startedAt: null,
          pausedAt: null,
          totalDurationMinutes: 0,
          isPaused: false
        }
      });
      
      const taskId = TEST_TASK_IDS.waiting;
      const params = Promise.resolve({ id: taskId.toString() });

      // Start the task
      const request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'start' });
      const response = await POST(request, { params });
      expect(response.status).toBe(200);

      // Stop the task
      const stopRequest = RequestBuilder.createPostRequest(taskId.toString(), { action: 'stop' });
      const stopResponse = await POST(stopRequest, { params });
      
      expect(stopResponse.status).toBe(200);
      let data = await stopResponse.json();
      
      expect(data.success).toBe(true);
      expect(data.action).toBe('stop');
      if (data.timeInfo) {
        expect(data.timeInfo.status).toBe('SEDANG_DIPROSES_USER_PAUSED');
        expect(data.timeInfo.isActive).toBe(false);
        expect(data.timeInfo.isPaused).toBe(true);
      }

      // Verify database state
      const dbTask = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { status: true, pausedAt: true, isPaused: true, totalDurationMinutes: true }
      });
      expect(dbTask?.status).toBe('SEDANG_DIPROSES_USER_PAUSED');
      expect(dbTask?.pausedAt).not.toBeNull();
      expect(dbTask?.isPaused).toBe(true);
      expect(dbTask?.totalDurationMinutes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Single Task Constraint Integration', () => {
    it('should prevent starting multiple tasks for the same user', async () => {
      // Reset both tasks to waiting state
      await prisma.tasklist.updateMany({
        where: { 
          id: { in: [TEST_TASK_IDS.waiting, TEST_TASK_IDS.paused] },
          pegawaiId: TEST_USER_ID
        },
        data: {
          status: 'MENUNGGU_PROSES_USER',
          startedAt: null,
          pausedAt: null,
          totalDurationMinutes: 0,
          isPaused: false
        }
      });

      // Start first task
      const firstTaskId = TEST_TASK_IDS.waiting;
      let params = Promise.resolve({ id: firstTaskId.toString() });
      let request = RequestBuilder.createPostRequest(firstTaskId.toString(), { action: 'start' });
      let response = await POST(request, { params });
      await AssertionHelpers.assertSuccessResponse(response);

      // Try to start second task - should fail
      const secondTaskId = TEST_TASK_IDS.paused;
      params = Promise.resolve({ id: secondTaskId.toString() });
      request = RequestBuilder.createPostRequest(secondTaskId.toString(), { action: 'start' });
      response = await POST(request, { params });
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.message).toContain('ACTIVE_TASK_EXISTS');
      expect(data.message).toContain('TEST-001'); // First task code

      // Verify second task is still in waiting state
      const secondTask = await prisma.tasklist.findUnique({
        where: { id: secondTaskId },
        select: { status: true, startedAt: true }
      });
      expect(secondTask?.status).toBe('MENUNGGU_PROSES_USER');
      expect(secondTask?.startedAt).toBeNull();
    });

    it('should allow starting task after stopping previous one', async () => {
      // Ensure first task is active
      await prisma.tasklist.update({
        where: { id: TEST_TASK_IDS.waiting },
        data: {
          status: 'SEDANG_DIPROSES_USER',
          startedAt: new Date(),
          isPaused: false
        }
      });

      // Stop first task
      const firstTaskId = TEST_TASK_IDS.waiting;
      let params = Promise.resolve({ id: firstTaskId.toString() });
      let request = RequestBuilder.createPostRequest(firstTaskId.toString(), { action: 'stop' });
      let response = await POST(request, { params });
      await AssertionHelpers.assertSuccessResponse(response);

      // Now start second task - should succeed
      const secondTaskId = TEST_TASK_IDS.paused;
      await prisma.tasklist.update({
        where: { id: secondTaskId },
        data: { status: 'MENUNGGU_PROSES_USER' }
      });

      params = Promise.resolve({ id: secondTaskId.toString() });
      request = RequestBuilder.createPostRequest(secondTaskId.toString(), { action: 'start' });
      response = await POST(request, { params });
      const data = await AssertionHelpers.assertSuccessResponse(response);

      expect(data.action).toBe('start');
      expect(data.timeInfo.status).toBe('SEDANG_DIPROSES_USER');
      expect(data.timeInfo.isActive).toBe(true);
    });

    it('should allow resuming paused task even with active task constraint', async () => {
      // Set up a paused task
      await prisma.tasklist.update({
        where: { id: TEST_TASK_IDS.paused },
        data: {
          status: 'SEDANG_DIPROSES_USER_PAUSED',
          pausedAt: new Date(),
          isPaused: true
        }
      });

      // Resume should work (bypasses active task check)
      const taskId = TEST_TASK_IDS.paused;
      const params = Promise.resolve({ id: taskId.toString() });
      const request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'resume' });
      const response = await POST(request, { params });
      const data = await AssertionHelpers.assertSuccessResponse(response);

      expect(data.action).toBe('resume');
      expect(data.timeInfo.status).toBe('SEDANG_DIPROSES_USER');
      expect(data.timeInfo.isActive).toBe(true);
      expect(data.timeInfo.isPaused).toBe(false);
    });
  });

  describe('Permission and Authorization Integration', () => {
    it('should reject actions from non-assigned users', async () => {
      // Use a task assigned to different user
      const taskId = TEST_TASK_IDS.different_user;
      const params = Promise.resolve({ id: taskId.toString() });
      
      const request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'start' });
      const response = await POST(request, { params });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Only the assigned user');
    });

    it('should handle unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);
      
      const taskId = TEST_TASK_IDS.waiting;
      const params = Promise.resolve({ id: taskId.toString() });
      
      const request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'start' });
      const response = await POST(request, { params });
      
      await AssertionHelpers.assertErrorResponse(response, 401, 'Unauthorized');
    });
  });

  describe('Status Validation Integration', () => {
    it('should reject invalid status transitions', async () => {
      // Try to start a task that's already under review
      const taskId = TEST_TASK_IDS.review;
      const params = Promise.resolve({ id: taskId.toString() });
      
      const request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'start' });
      const response = await POST(request, { params });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('cannot be started');
    });

    it('should reject actions on completed tasks', async () => {
      const taskId = TEST_TASK_IDS.completed;
      const params = Promise.resolve({ id: taskId.toString() });
      
      const request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'start' });
      const response = await POST(request, { params });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('cannot be started');
    });
  });

  describe('Time Tracking Accuracy Integration', () => {
    it('should accurately track time across pause/resume cycles', async () => {
      // Reset task
      await prisma.tasklist.update({
        where: { id: TEST_TASK_IDS.waiting },
        data: {
          status: 'MENUNGGU_PROSES_USER',
          startedAt: null,
          pausedAt: null,
          totalDurationMinutes: 0,
          isPaused: false
        }
      });

      const taskId = TEST_TASK_IDS.waiting;
      const params = Promise.resolve({ id: taskId.toString() });

      // Start task
      let request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'start' });
      await POST(request, { params });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Pause task
      request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'pause' });
      let response = await POST(request, { params });
      let data = await response.json();
      const firstDuration = data.timeInfo.totalDurationMinutes;

      // Resume task
      request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'resume' });
      await POST(request, { params });

      // Wait a bit more
      await new Promise(resolve => setTimeout(resolve, 100));

      // Stop task
      request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'stop' });
      response = await POST(request, { params });
      data = await response.json();
      const finalDuration = data.timeInfo.totalDurationMinutes;

      // Final duration should be >= first duration
      expect(finalDuration).toBeGreaterThanOrEqual(firstDuration);

      // Verify database consistency
      const dbTask = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { totalDurationMinutes: true }
      });
      expect(dbTask?.totalDurationMinutes).toBe(finalDuration);
    });
  });

  describe('GET Endpoint Integration', () => {
    it('should return accurate time info for active tasks', async () => {
      // Set up an active task
      const now = new Date();
      await prisma.tasklist.update({
        where: { id: TEST_TASK_IDS.active },
        data: {
          status: 'SEDANG_DIPROSES_USER',
          startedAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
          totalDurationMinutes: 10,
          isPaused: false
        }
      });

      const taskId = TEST_TASK_IDS.active;
      const params = Promise.resolve({ id: taskId.toString() });
      
      const request = RequestBuilder.createGetRequest(taskId.toString());
      const response = await GET(request, { params });
      const data = await AssertionHelpers.assertSuccessResponse(response);

      expect(data.id).toBe(taskId);
      expect(data.status).toBe('SEDANG_DIPROSES_USER');
      expect(data.isActive).toBe(true);
      expect(data.isPaused).toBe(false);
      expect(data.totalDurationMinutes).toBe(10);
      expect(data.currentSessionMinutes).toBeGreaterThanOrEqual(4); // Should be around 5 minutes
    });

    it('should return accurate time info for paused tasks', async () => {
      // Set up a paused task
      await prisma.tasklist.update({
        where: { id: TEST_TASK_IDS.paused },
        data: {
          status: 'SEDANG_DIPROSES_USER_PAUSED',
          pausedAt: new Date(),
          totalDurationMinutes: 15,
          isPaused: true
        }
      });

      const taskId = TEST_TASK_IDS.paused;
      const params = Promise.resolve({ id: taskId.toString() });
      
      const request = RequestBuilder.createGetRequest(taskId.toString());
      const response = await GET(request, { params });
      const data = await AssertionHelpers.assertSuccessResponse(response);

      expect(data.id).toBe(taskId);
      expect(data.status).toBe('SEDANG_DIPROSES_USER_PAUSED');
      expect(data.isActive).toBe(false);
      expect(data.isPaused).toBe(true);
      expect(data.totalDurationMinutes).toBe(15);
      expect(data.currentSessionMinutes).toBe(0); // No current session for paused tasks
    });
  });

  describe('Concurrent Operations Integration', () => {
    it('should handle concurrent requests gracefully', async () => {
      // Reset task
      await prisma.tasklist.update({
        where: { id: TEST_TASK_IDS.waiting },
        data: {
          status: 'MENUNGGU_PROSES_USER',
          startedAt: null,
          pausedAt: null,
          totalDurationMinutes: 0,
          isPaused: false
        }
      });

      const taskId = TEST_TASK_IDS.waiting;
      const params = Promise.resolve({ id: taskId.toString() });

      // Start task first
      let request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'start' });
      await POST(request, { params });

      // Make concurrent requests
      const requests = [
        RequestBuilder.createGetRequest(taskId.toString()),
        RequestBuilder.createPostRequest(taskId.toString(), { action: 'pause' }),
        RequestBuilder.createGetRequest(taskId.toString())
      ];

      const responses = await Promise.all([
        GET(requests[0], { params }),
        POST(requests[1], { params }),
        GET(requests[2], { params })
      ]);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBeLessThan(400);
      });
    });
  });

  describe('Error Recovery Integration', () => {
    it('should maintain data consistency after errors', async () => {
      const taskId = TEST_TASK_IDS.waiting;
      
      // Reset task to known state
      await prisma.tasklist.update({
        where: { id: taskId },
        data: {
          status: 'MENUNGGU_PROSES_USER',
          startedAt: null,
          pausedAt: null,
          totalDurationMinutes: 0,
          isPaused: false
        }
      });

      // Try invalid action (should fail)
      const params = Promise.resolve({ id: taskId.toString() });
      let request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'invalid' });
      let response = await POST(request, { params });
      expect(response.status).toBe(400);

      // Verify task state is unchanged
      let dbTask = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { status: true, startedAt: true, totalDurationMinutes: true }
      });
      expect(dbTask?.status).toBe('MENUNGGU_PROSES_USER');
      expect(dbTask?.startedAt).toBeNull();
      expect(dbTask?.totalDurationMinutes).toBe(0);

      // Valid action should still work
      request = RequestBuilder.createPostRequest(taskId.toString(), { action: 'start' });
      response = await POST(request, { params });
      await AssertionHelpers.assertSuccessResponse(response);

      // Verify task state is correctly updated
      dbTask = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { status: true, startedAt: true }
      });
      expect(dbTask?.status).toBe('SEDANG_DIPROSES_USER');
      expect(dbTask?.startedAt).not.toBeNull();
    });
  });
});

// Helper functions for test setup
async function setupTestData(): Promise<void> {
  try {
    // Clean up any existing test data
    await cleanupTestData();

    // Insert test project if it doesn't exist
    await prisma.proyek.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        noUrut: 9999,
        namaProyek: 'Test Project',
        kodeProyek: 'TEST-PRJ',
        client: 'Test Client',
        pic: 'Test PIC',
        type: 'DEVELOPMENT'
      }
    });

    // Insert test module if it doesn't exist
    await prisma.proyekModule.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        projectId: 1,
        nama: 'Test Module',
        kode: 'TEST-MOD'
      }
    });

    // Insert test users
    await prisma.pegawai.createMany({
      data: [
        {
          id: 9991,
          noUrut: 9991,
          username: 'testuser1',
          role: 'PROGRAMMER',
          namaLengkap: 'Test User 1',
          noHp: '081234567890'
        },
        {
          id: 9992,
          noUrut: 9992,
          username: 'testuser2',
          role: 'PM',
          namaLengkap: 'Test User 2',
          noHp: '081234567891'
        }
      ],
      skipDuplicates: true
    });

    // Insert test tasks
    await prisma.tasklist.createMany({
      data: [
        {
          id: 9991,
          projectId: 1,
          moduleId: 1,
          pegawaiId: 9991,
          status: 'MENUNGGU_PROSES_USER',
          kode: 'TEST-001',
          scheduleAt: new Date(),
          totalDurationMinutes: 0,
          isPaused: false
        },
        {
          id: 9992,
          projectId: 1,
          moduleId: 1,
          pegawaiId: 9991,
          status: 'SEDANG_DIPROSES_USER',
          kode: 'TEST-002',
          scheduleAt: new Date(),
          startedAt: new Date(),
          totalDurationMinutes: 0,
          isPaused: false
        },
        {
          id: 9993,
          projectId: 1,
          moduleId: 1,
          pegawaiId: 9991,
          status: 'SEDANG_DIPROSES_USER_PAUSED',
          kode: 'TEST-003',
          scheduleAt: new Date(),
          pausedAt: new Date(),
          totalDurationMinutes: 5,
          isPaused: true
        },
        {
          id: 9994,
          projectId: 1,
          moduleId: 1,
          pegawaiId: 9992, // Different user
          status: 'MENUNGGU_PROSES_USER',
          kode: 'TEST-004',
          scheduleAt: new Date(),
          totalDurationMinutes: 0,
          isPaused: false
        },
        {
          id: 9995,
          projectId: 1,
          moduleId: 1,
          pegawaiId: 9991,
          status: 'MENUNGGU_REVIEW_PM',
          kode: 'TEST-005',
          scheduleAt: new Date(),
          totalDurationMinutes: 20,
          isPaused: false
        },
        {
          id: 9996,
          projectId: 1,
          moduleId: 1,
          pegawaiId: 9991,
          status: 'SELESAI',
          kode: 'TEST-006',
          scheduleAt: new Date(),
          totalDurationMinutes: 30,
          isPaused: false
        }
      ],
      skipDuplicates: true
    });

    console.log('Test data setup completed');
  } catch (error) {
    console.error('Error setting up test data:', error);
    throw error;
  }
}

async function cleanupTestData(): Promise<void> {
  try {
    // Delete test tasks first (due to foreign key constraints)
    await prisma.tasklist.deleteMany({
      where: {
        kode: {
          startsWith: 'TEST-'
        }
      }
    });

    // Delete test users
    await prisma.pegawai.deleteMany({
      where: {
        username: {
          startsWith: 'testuser'
        }
      }
    });

    // Clean up test project and module (only if they were created for tests)
    await prisma.proyekModule.deleteMany({
      where: {
        kode: 'TEST-MOD'
      }
    });

    await prisma.proyek.deleteMany({
      where: {
        kodeProyek: 'TEST-PRJ'
      }
    });

    console.log('Test data cleanup completed');
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    // Don't throw here to avoid breaking other tests
  }
}
