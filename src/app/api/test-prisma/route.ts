import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    console.log('Testing Prisma connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Prisma connected');
    
    // Test simple query
    const taskCount = await prisma.tasklist.count();
    console.log('✅ Task count query successful:', taskCount);
    
    // Test with where clause (similar to what's failing)
    const userTasks = await prisma.tasklist.count({ 
      where: { pegawaiId: 20 } 
    });
    console.log('✅ User task count:', userTasks);
    
    return NextResponse.json({ 
      success: true,
      totalTasks: taskCount,
      userTasks: userTasks,
      message: 'Prisma is working correctly'
    });
    
  } catch (error) {
    console.error('❌ Prisma test failed:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack'
    });
    
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
