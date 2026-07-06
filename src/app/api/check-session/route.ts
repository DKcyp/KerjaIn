import { NextRequest, NextResponse } from 'next/server';
import { parseSessionFromCookieHeader } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);

    const now = Math.floor(Date.now() / 1000);
    const isExpired = session?.exp ? session.exp < now : false;
    
    let expiresIn = '';
    if (session?.exp) {
      const secondsLeft = session.exp - now;
      if (secondsLeft > 0) {
        const days = Math.floor(secondsLeft / 86400);
        const hours = Math.floor((secondsLeft % 86400) / 3600);
        const minutes = Math.floor((secondsLeft % 3600) / 60);
        
        if (days > 0) {
          expiresIn = `Expires in ${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
        } else if (hours > 0) {
          expiresIn = `Expires in ${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
        } else {
          expiresIn = `Expires in ${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
      } else {
        expiresIn = 'Expired';
      }
    }

    return NextResponse.json({
      hasSession: !!session,
      session: session || null,
      cookieHeader: cookieHeader || null,
      isExpired,
      expiresIn,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking session:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check session',
        hasSession: false,
        session: null,
        cookieHeader: null,
        isExpired: true,
      },
      { status: 500 }
    );
  }
}
