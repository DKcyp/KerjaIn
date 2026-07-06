import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

interface BacaraLogData {
  endpoint: string;
  httpMethod: string;
  requestUrl?: string;
  requestHeaders?: any;
  requestParams?: any;
  responseStatusCode?: number;
  responseHeaders?: any;
  responseTimeMs?: number;
  isError?: boolean;
  errorMessage?: string;
  errorCode?: string;
  projectId?: number;
  baId?: number;
  moduleId?: number;
  taskId?: number;
  userId?: number;
  userName?: string;
  userIp?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  actionType: string;
  actionDescription?: string;
  statusBa?: string;
  oldStatusBa?: string;
  newStatusBa?: string;
}

export async function logBacaraActivity(data: BacaraLogData) {
  try {
    await prisma.bacaraLog.create({
      data: {
        endpoint: data.endpoint,
        httpMethod: data.httpMethod,
        requestUrl: data.requestUrl,
        requestHeaders: data.requestHeaders,
        requestParams: data.requestParams,
        responseStatusCode: data.responseStatusCode,
        responseHeaders: data.responseHeaders,
        responseTimeMs: data.responseTimeMs,
        isError: data.isError || false,
        errorMessage: data.errorMessage,
        errorCode: data.errorCode,
        projectId: data.projectId,
        baId: data.baId,
        moduleId: data.moduleId,
        taskId: data.taskId,
        userId: data.userId,
        userName: data.userName,
        userIp: data.userIp,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
        requestId: data.requestId,
        actionType: data.actionType,
        actionDescription: data.actionDescription,
        statusBa: data.statusBa,
        oldStatusBa: data.oldStatusBa,
        newStatusBa: data.newStatusBa,
      },
    });
  } catch (error) {
    console.error('Error logging bacara activity:', error);
    // Don't throw error to prevent breaking the main flow
  }
}

export function extractRequestInfo(req: NextRequest) {
  const userAgent = req.headers.get('user-agent') || undefined;
  const userIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
  const requestId = req.headers.get('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    userAgent,
    userIp,
    requestId,
    requestUrl: req.url,
    requestHeaders: Object.fromEntries(req.headers.entries()),
  };
}
