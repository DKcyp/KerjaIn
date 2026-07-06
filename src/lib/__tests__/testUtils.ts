/**
 * Test Utilities for Tasklist Time-Tracking Tests
 * 
 * This file provides comprehensive test utilities, mocks, and helper functions
 * for testing the tasklist time-tracking functionality.
 */

import { NextRequest } from 'next/server';
import { TaskStatus } from '@prisma/client';

// Type definitions for test data
export interface MockUser {
  id: number;
  username: string;
  role: 'PROGRAMMER' | 'PM' | 'ADMIN' | 'SUPER_ADMIN';
  namaLengkap?: string;
}

export interface MockTask {
  id: number;
  projectId: number;
  moduleId: number;
  pegawaiId: number;
  status: TaskStatus;
  kode: string;
  startedAt?: Date | null;
  pausedAt?: Date | null;
  totalDurationMinutes: number;
  isPaused: boolean;
  scheduleAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MockTaskTimeInfo {
  id: number;
  status: TaskStatus;
  startedAt: Date | null;
  pausedAt: Date | null;
  totalDurationMinutes: number;
  isPaused: boolean;
  isActive: boolean;
  currentSessionMinutes: number;
}

export interface MockSession {
  user: MockUser | null;
}

// Test data factories
export class TestDataFactory {
  /**
   * Create a mock user with default or custom properties
   */
  static createMockUser(overrides: Partial<MockUser> = {}): MockUser {
    return {
      id: 1,
      username: 'testuser',
      role: 'PROGRAMMER',
      namaLengkap: 'Test User',
      ...overrides
    };
  }

  /**
   * Create a mock task with default or custom properties
   */
  static createMockTask(overrides: Partial<MockTask> = {}): MockTask {
    const now = new Date();
    return {
      id: 123,
      projectId: 1,
      moduleId: 1,
      pegawaiId: 1,
      status: 'MENUNGGU_PROSES_USER',
      kode: 'TEST-001',
      startedAt: null,
      pausedAt: null,
      totalDurationMinutes: 0,
      isPaused: false,
      scheduleAt: now,
      createdAt: now,
      updatedAt: now,
      ...overrides
    };
  }

  /**
   * Create mock task time info
   */
  static createMockTaskTimeInfo(overrides: Partial<MockTaskTimeInfo> = {}): MockTaskTimeInfo {
    return {
      id: 123,
      status: 'SEDANG_DIPROSES_USER',
      startedAt: new Date('2025-10-12T10:00:00Z'),
      pausedAt: null,
      totalDurationMinutes: 30,
      isPaused: false,
      isActive: true,
      currentSessionMinutes: 15,
      ...overrides
    };
  }

  /**
   * Create a mock session
   */
  static createMockSession(user: MockUser | null = null): MockSession {
    return {
      user: user || this.createMockUser()
    };
  }

  /**
   * Create multiple mock tasks with different statuses
   */
  static createMockTaskSet(): MockTask[] {
    return [
      this.createMockTask({ 
        id: 100, 
        status: 'MENUNGGU_PROSES_USER', 
        kode: 'TEST-100' 
      }),
      this.createMockTask({ 
        id: 101, 
        status: 'SEDANG_DIPROSES_USER', 
        kode: 'TEST-101',
        startedAt: new Date(),
        isPaused: false
      }),
      this.createMockTask({ 
        id: 102, 
        status: 'SEDANG_DIPROSES_USER_PAUSED', 
        kode: 'TEST-102',
        pausedAt: new Date(),
        isPaused: true
      }),
      this.createMockTask({ 
        id: 103, 
        status: 'MENUNGGU_REVIEW_PM', 
        kode: 'TEST-103' 
      }),
      this.createMockTask({ 
        id: 104, 
        status: 'SELESAI', 
        kode: 'TEST-104' 
      })
    ];
  }
}

// Request builders
export class RequestBuilder {
  /**
   * Create a mock NextRequest for GET requests
   */
  static createGetRequest(
    taskId: string = '123',
    baseUrl: string = 'http://localhost:3000'
  ): NextRequest {
    const url = `${baseUrl}/api/tasklist/${taskId}/time-tracking`;
    return new NextRequest(url, { method: 'GET' });
  }

  /**
   * Create a mock NextRequest for POST requests
   */
  static createPostRequest(
    taskId: string = '123',
    body: any = { action: 'start' },
    baseUrl: string = 'http://localhost:3000'
  ): NextRequest {
    const url = `${baseUrl}/api/tasklist/${taskId}/time-tracking`;
    return new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Create a request with malformed JSON
   */
  static createMalformedJsonRequest(
    taskId: string = '123',
    malformedBody: string = 'invalid json'
  ): NextRequest {
    const url = `http://localhost:3000/api/tasklist/${taskId}/time-tracking`;
    return new NextRequest(url, {
      method: 'POST',
      body: malformedBody,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Create a request without Content-Type header
   */
  static createRequestWithoutContentType(
    taskId: string = '123',
    body: any = { action: 'start' }
  ): NextRequest {
    const url = `http://localhost:3000/api/tasklist/${taskId}/time-tracking`;
    return new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }
}

// Mock implementations
export class MockImplementations {
  /**
   * Create a mock implementation for getServerSession
   */
  static getServerSession(session: MockSession | null = null) {
    return jest.fn().mockResolvedValue(
      session || TestDataFactory.createMockSession()
    );
  }

  /**
   * Create a mock implementation for startTask
   */
  static startTask(
    result: MockTaskTimeInfo | null = null,
    shouldThrow: Error | null = null
  ) {
    const mockFn = jest.fn();
    
    if (shouldThrow) {
      mockFn.mockRejectedValue(shouldThrow);
    } else {
      mockFn.mockResolvedValue(
        result || TestDataFactory.createMockTaskTimeInfo()
      );
    }
    
    return mockFn;
  }

  /**
   * Create a mock implementation for pauseTask
   */
  static pauseTask(
    result: MockTaskTimeInfo | null = null,
    shouldThrow: Error | null = null
  ) {
    const mockFn = jest.fn();
    
    if (shouldThrow) {
      mockFn.mockRejectedValue(shouldThrow);
    } else {
      const pausedInfo = TestDataFactory.createMockTaskTimeInfo({
        isPaused: true,
        isActive: false,
        pausedAt: new Date()
      });
      mockFn.mockResolvedValue(result || pausedInfo);
    }
    
    return mockFn;
  }

  /**
   * Create a mock implementation for getTaskTimeInfo
   */
  static getTaskTimeInfo(
    result: MockTaskTimeInfo | null = null,
    shouldThrow: Error | null = null
  ) {
    const mockFn = jest.fn();
    
    if (shouldThrow) {
      mockFn.mockRejectedValue(shouldThrow);
    } else {
      mockFn.mockResolvedValue(
        result || TestDataFactory.createMockTaskTimeInfo()
      );
    }
    
    return mockFn;
  }

  /**
   * Create a mock implementation that simulates database timeout
   */
  static databaseTimeout(timeoutMs: number = 5000) {
    return jest.fn().mockImplementation(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), timeoutMs)
      )
    );
  }

  /**
   * Create a mock implementation that simulates connection errors
   */
  static connectionError() {
    return jest.fn().mockRejectedValue(new Error('Database connection failed'));
  }
}

// Error generators
export class ErrorGenerators {
  /**
   * Generate authentication errors
   */
  static authenticationError(): Error {
    return new Error('Authentication failed');
  }

  /**
   * Generate authorization errors
   */
  static authorizationError(): Error {
    return new Error('Only the assigned user can perform this action');
  }

  /**
   * Generate task not found errors
   */
  static taskNotFoundError(): Error {
    return new Error('Task not found');
  }

  /**
   * Generate invalid status transition errors
   */
  static invalidStatusError(): Error {
    return new Error('Task cannot be started in current status');
  }

  /**
   * Generate single task constraint errors
   */
  static activeTaskExistsError(activeTaskCode: string = 'PRJ-001-1'): Error {
    return new Error(
      `ACTIVE_TASK_EXISTS:You already have an active task running: "${activeTaskCode}". Please stop or complete it before starting a new task.`
    );
  }

  /**
   * Generate database errors
   */
  static databaseError(): Error {
    return new Error('Database operation failed');
  }

  /**
   * Generate timeout errors
   */
  static timeoutError(): Error {
    return new Error('Operation timeout');
  }

  /**
   * Generate validation errors
   */
  static validationError(field: string): Error {
    return new Error(`Invalid ${field}`);
  }
}

// Test scenarios
export class TestScenarios {
  /**
   * Get all valid task status transitions
   */
  static getValidStatusTransitions(): Array<{
    from: TaskStatus;
    action: string;
    to: TaskStatus;
    description: string;
  }> {
    return [
      {
        from: 'MENUNGGU_PROSES_USER',
        action: 'start',
        to: 'SEDANG_DIPROSES_USER',
        description: 'Start a waiting task'
      },
      {
        from: 'SEDANG_DIPROSES_USER',
        action: 'pause',
        to: 'SEDANG_DIPROSES_USER_PAUSED',
        description: 'Pause an active task'
      },
      {
        from: 'SEDANG_DIPROSES_USER_PAUSED',
        action: 'resume',
        to: 'SEDANG_DIPROSES_USER',
        description: 'Resume a paused task'
      },
      {
        from: 'SEDANG_DIPROSES_USER',
        action: 'stop',
        to: 'SEDANG_DIPROSES_USER_PAUSED',
        description: 'Stop an active task'
      },
      {
        from: 'SEDANG_DIPROSES_USER',
        action: 'complete',
        to: 'MENUNGGU_REVIEW_PM',
        description: 'Complete an active task'
      }
    ];
  }

  /**
   * Get all invalid task status transitions
   */
  static getInvalidStatusTransitions(): Array<{
    from: TaskStatus;
    action: string;
    description: string;
  }> {
    return [
      {
        from: 'MENUNGGU_PROSES_USER',
        action: 'pause',
        description: 'Cannot pause a waiting task'
      },
      {
        from: 'MENUNGGU_PROSES_USER',
        action: 'complete',
        description: 'Cannot complete a waiting task'
      },
      {
        from: 'MENUNGGU_REVIEW_PM',
        action: 'start',
        description: 'Cannot start a task under review'
      },
      {
        from: 'SELESAI',
        action: 'start',
        description: 'Cannot start a completed task'
      }
    ];
  }

  /**
   * Get edge case parameter values
   */
  static getEdgeCaseParameters(): Array<{
    name: string;
    value: string;
    expectedError: string;
  }> {
    return [
      { name: 'Zero ID', value: '0', expectedError: 'Invalid task ID' },
      { name: 'Negative ID', value: '-1', expectedError: 'Invalid task ID' },
      { name: 'Float ID', value: '123.45', expectedError: 'Invalid task ID' },
      { name: 'Non-numeric ID', value: 'abc', expectedError: 'Invalid task ID' },
      { name: 'Empty ID', value: '', expectedError: 'Invalid task ID' },
      { name: 'Very large ID', value: '999999999999999', expectedError: 'Invalid task ID' },
      { name: 'Special characters', value: '123@#$', expectedError: 'Invalid task ID' }
    ];
  }

  /**
   * Get edge case action values
   */
  static getEdgeCaseActions(): Array<{
    name: string;
    value: any;
    expectedError: string;
  }> {
    return [
      { name: 'Empty action', value: '', expectedError: 'Action is required' },
      { name: 'Null action', value: null, expectedError: 'Action is required' },
      { name: 'Undefined action', value: undefined, expectedError: 'Action is required' },
      { name: 'Number action', value: 123, expectedError: 'Action is required' },
      { name: 'Boolean action', value: true, expectedError: 'Action is required' },
      { name: 'Object action', value: {}, expectedError: 'Action is required' },
      { name: 'Invalid action', value: 'invalid', expectedError: 'Invalid action. Supported actions:' },
      { name: 'Long action', value: 'a'.repeat(1000), expectedError: 'Invalid action. Supported actions:' }
    ];
  }
}

// Performance testing utilities
export class PerformanceUtils {
  /**
   * Measure execution time of an async function
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, duration: end - start };
  }

  /**
   * Create a performance test for concurrent requests
   */
  static async testConcurrentRequests<T>(
    requestFn: () => Promise<T>,
    concurrency: number = 10
  ): Promise<{ results: T[]; totalTime: number; averageTime: number }> {
    const start = performance.now();
    
    const promises = Array(concurrency).fill(null).map(() => requestFn());
    const results = await Promise.all(promises);
    
    const end = performance.now();
    const totalTime = end - start;
    const averageTime = totalTime / concurrency;
    
    return { results, totalTime, averageTime };
  }

  /**
   * Create a load test scenario
   */
  static async loadTest<T>(
    requestFn: () => Promise<T>,
    options: {
      duration: number; // in milliseconds
      requestsPerSecond: number;
    }
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    errors: Error[];
  }> {
    const { duration, requestsPerSecond } = options;
    const interval = 1000 / requestsPerSecond;
    const endTime = Date.now() + duration;
    
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    const errors: Error[] = [];
    
    while (Date.now() < endTime) {
      const requestStart = performance.now();
      
      try {
        await requestFn();
        successfulRequests++;
        totalResponseTime += performance.now() - requestStart;
      } catch (error) {
        failedRequests++;
        errors.push(error as Error);
      }
      
      totalRequests++;
      
      // Wait for next request
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: totalResponseTime / successfulRequests,
      errors
    };
  }
}

// Database test utilities
export class DatabaseTestUtils {
  /**
   * Create test data setup SQL
   */
  static getTestDataSetupSQL(): string {
    return `
      -- Clean up existing test data
      DELETE FROM tasklist WHERE kode LIKE 'TEST-%';
      DELETE FROM pegawai WHERE username LIKE 'testuser%';
      
      -- Insert test users
      INSERT INTO pegawai (id, noUrut, username, role, namaLengkap, noHp) VALUES 
      (9991, 9991, 'testuser1', 'PROGRAMMER', 'Test User 1', '081234567890'),
      (9992, 9992, 'testuser2', 'PM', 'Test User 2', '081234567891'),
      (9993, 9993, 'testuser3', 'ADMIN', 'Test User 3', '081234567892');
      
      -- Insert test tasks
      INSERT INTO tasklist (id, projectId, moduleId, pegawaiId, status, kode, scheduleAt) VALUES
      (9991, 1, 1, 9991, 'MENUNGGU_PROSES_USER', 'TEST-001', NOW()),
      (9992, 1, 1, 9991, 'SEDANG_DIPROSES_USER', 'TEST-002', NOW()),
      (9993, 1, 1, 9991, 'SEDANG_DIPROSES_USER_PAUSED', 'TEST-003', NOW()),
      (9994, 1, 1, 9992, 'MENUNGGU_PROSES_USER', 'TEST-004', NOW()),
      (9995, 1, 1, 9991, 'MENUNGGU_REVIEW_PM', 'TEST-005', NOW()),
      (9996, 1, 1, 9991, 'SELESAI', 'TEST-006', NOW());
    `;
  }

  /**
   * Create test data cleanup SQL
   */
  static getTestDataCleanupSQL(): string {
    return `
      -- Clean up test data
      DELETE FROM tasklist WHERE kode LIKE 'TEST-%';
      DELETE FROM pegawai WHERE username LIKE 'testuser%';
    `;
  }

  /**
   * Mock Prisma client for testing
   */
  static createMockPrismaClient() {
    return {
      tasklist: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn()
      },
      pegawai: {
        findUnique: jest.fn(),
        findMany: jest.fn()
      },
      $executeRaw: jest.fn()
    };
  }
}

// Assertion helpers
export class AssertionHelpers {
  /**
   * Assert that a response has the expected status and error message
   */
  static async assertErrorResponse(
    response: Response,
    expectedStatus: number,
    expectedError: string
  ): Promise<void> {
    expect(response.status).toBe(expectedStatus);
    const data = await response.json();
    expect(data.error).toContain(expectedError);
  }

  /**
   * Assert that a response is successful with expected data
   */
  static async assertSuccessResponse(
    response: Response,
    expectedData?: any
  ): Promise<any> {
    expect(response.status).toBe(200);
    const data = await response.json();
    
    if (expectedData) {
      expect(data).toMatchObject(expectedData);
    }
    
    return data;
  }

  /**
   * Assert that a mock function was called with expected parameters
   */
  static assertMockCalledWith(
    mockFn: jest.MockedFunction<any>,
    expectedArgs: any[]
  ): void {
    expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
  }

  /**
   * Assert that performance metrics are within acceptable ranges
   */
  static assertPerformance(
    duration: number,
    maxDuration: number,
    description: string = 'Operation'
  ): void {
    expect(duration).toBeLessThan(maxDuration);
    console.log(`${description} completed in ${duration.toFixed(2)}ms`);
  }
}

export default {
  TestDataFactory,
  RequestBuilder,
  MockImplementations,
  ErrorGenerators,
  TestScenarios,
  PerformanceUtils,
  DatabaseTestUtils,
  AssertionHelpers
};
