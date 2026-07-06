import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  console.log('🔄 Portal SSO Logout API called');
  
  try {
    // Get current user from session
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.pegawai.findUnique({ 
      where: { id: session.id },
      select: {
        id: true,
        username: true,
        ssoUserId: true,
      }
    });

    if (!user) {
      console.log('❌ User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      isSSO: !!user.ssoUserId
    });

    // Determine logout flow based on whether user is SSO user
    const portalUrl = process.env.PORTAL_URL;
    
    if (!portalUrl) {
      console.warn('⚠️ PORTAL_URL not configured, cannot logout from Portal');
    }
    
    let portalLogoutSuccess = false;

    if (user.ssoUserId && portalUrl) {
      // SSO user - logout from Portal on server-side to avoid CORS issues
      const portalLogoutUrl = `${portalUrl}/api/auth/logout`;
      console.log('🔗 SSO User - Will logout from Portal');
      console.log('📍 Portal URL:', portalUrl);
      console.log('🔗 Portal logout URL:', portalLogoutUrl);
      
      try {
        console.log('🔄 Calling Portal logout from server...');
        const portalResponse = await fetch(portalLogoutUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader || '', // Forward cookies to Portal
          },
          credentials: 'include',
        });
        
        if (portalResponse.ok) {
          console.log('✅ Portal logout successful from server');
          portalLogoutSuccess = true;
        } else {
          console.warn('⚠️ Portal logout returned status:', portalResponse.status);
        }
      } catch (error) {
        console.error('⚠️ Portal logout failed:', error instanceof Error ? error.message : error);
        // Continue anyway - local session is already cleared
      }
    } else if (user.ssoUserId && !portalUrl) {
      console.warn('⚠️ SSO user but PORTAL_URL not configured');
    } else {
      // Local user - just clear local session
      console.log('👤 Local user - Clearing local session only');
    }

    // Clear local session cookie
    const response = NextResponse.json({ 
      success: true,
      portalLogoutSuccess
    });
    
    response.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: req.nextUrl.protocol === 'https:',
      maxAge: 0,
    });

    // Clear SSO cookies from Portal domain (richz_sso_token, etc.)
    const cookiesToClear = ['richz_sso_token', 'next-auth.session-token', 'next-auth.callback-url', '__Secure-next-auth.session-token'];
    const cookieDomain = process.env.COOKIE_DOMAIN; // e.g. ".richz.id" for cross-subdomain

    for (const cookieName of cookiesToClear) {
      // Clear without domain (current domain)
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: req.nextUrl.protocol === 'https:',
        maxAge: 0,
      });
      // Clear with shared parent domain if configured
      if (cookieDomain) {
        response.headers.append(
          'Set-Cookie',
          `${cookieName}=; Path=/; Max-Age=0; Domain=${cookieDomain}; SameSite=Lax${req.nextUrl.protocol === 'https:' ? '; Secure' : ''}`
        );
      }
    }

    console.log('✅ Logout completed successfully');
    return response;

  } catch (error) {
    console.error('POST /api/auth/sso-logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
