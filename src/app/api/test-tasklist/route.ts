import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Testing simplified tasklist query...');
    
    // Test basic tasklist query without authentication
    const tasks = await prisma.tasklist.findMany({
      take: 5,
      select: {
        id: true,
        kode: true,
        status: true,
        pegawaiId: true,
        projectId: true,
        moduleId: true,
        createdAt: true
      }
    });
    
    console.log('✅ Basic tasklist query successful, found:', tasks.length);
    
    // Test with specific user filter
    const userTasks = await prisma.tasklist.findMany({
      where: { pegawaiId: 20 },
      take: 5,
      select: {
        id: true,
        kode: true,
        status: true,
        pegawaiId: true
      }
    });
    
    console.log('✅ User-filtered query successful, found:', userTasks.length);
    
    return NextResponse.json({
      success: true,
      totalSample: tasks.length,
      userTasksSample: userTasks.length,
      sampleTasks: tasks,
      userTasks: userTasks
    });
    
  } catch (error) {
    console.error('❌ Simplified tasklist test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
