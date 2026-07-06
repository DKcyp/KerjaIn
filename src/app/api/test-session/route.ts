import { NextRequest, NextResponse } from 'next/server';
import { parseSessionFromCookieHeader } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Testing session parsing...');
    
    const cookieHeader = req.headers.get('cookie');
    console.log('Cookie header present:', !!cookieHeader);
    console.log('Cookie header length:', cookieHeader?.length || 0);
    
    if (cookieHeader) {
      console.log('Cookie header (first 100 chars):', cookieHeader.substring(0, 100));
    }
    
    const session = parseSessionFromCookieHeader(cookieHeader);
    console.log('Session parsed successfully:', !!session);
    
    if (session) {
      console.log('Session details:', {
        id: session.id,
        role: session.role,
        username: session.username || 'N/A'
      });
    }
    
    return NextResponse.json({
      success: true,
      hasCookie: !!cookieHeader,
      hasSession: !!session,
      sessionData: session ? {
        id: session.id,
        role: session.role,
        username: session.username
      } : null
    });
    
  } catch (error) {
    console.error('❌ Session test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
