import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signSession, SESSION_COOKIE, getSessionCookieOptionsForRequest } from '@/lib/auth';
import { loginWithSSO, mapSSORole, getClientIP, isSSOEnabled, SSOError } from '@/lib/sso';
import { getSSOLoginUrl } from '@/lib/ssoConfig';
import { SSOLoginRequest } from '@/types/sso';

export async function GET(req: NextRequest) {
  // Check if SSO is enabled
  if (!isSSOEnabled()) {
    return NextResponse.json({ error: 'SSO is not enabled' }, { status: 400 });
  }

  try {
    // Get return URL from query parameters
    const { searchParams } = new URL(req.url);
    const returnUrl = searchParams.get('return_url') || '/';
    
    console.log(`[SSO Login] Redirecting to SSO server with return URL: ${returnUrl}`);
    
    // Get SSO login URL and redirect
    const ssoLoginUrl = getSSOLoginUrl(returnUrl);
    
    console.log(`[SSO Login] SSO server login URL: ${ssoLoginUrl}`);
    
    return NextResponse.redirect(ssoLoginUrl);
    
  } catch (error) {
    console.error('GET /api/auth/sso-login error:', error);
    return NextResponse.json({ 
      error: 'Failed to redirect to SSO login' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Check if SSO is enabled
  if (!isSSOEnabled()) {
    return NextResponse.json({ error: 'SSO is not enabled' }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');
  const otp = body?.otp ? String(body.otp) : undefined;

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  try {
    // Prepare SSO login request
    const ssoRequest: SSOLoginRequest = {
      username,
      password,
      otp,
      client_public_ip: getClientIP(req),
    };

    // Login to SSO server
    const ssoResponse = await loginWithSSO(ssoRequest);

    // Find or create local user
    let localUser;
    try {
      localUser = await (prisma as any).pegawai.findFirst({ 
        where: { username: ssoResponse.user.username } 
      });
    } catch (error) {
      console.error('Error finding user:', error);
      throw new Error('Database error while finding user');
    }

    if (!localUser) {
      // Create new user from SSO data
      try {
        const nextNoUrut = await getNextNoUrut();
        const createData: any = {
          noUrut: nextNoUrut,
          username: ssoResponse.user.username,
          namaLengkap: extractFullNameFromSSO(ssoResponse.user),
          noHp: '', // Default empty, can be updated later
          role: 'PROGRAMMER', // Default role for new SSO users - can be changed by admin later
        };

        // Add SSO fields if they exist in the schema
        try {
          createData.ssoUserId = ssoResponse.user.username;
          createData.ssoRoleId = ssoResponse.user.role_id;
          createData.ssoCompanyId = ssoResponse.user.companyId;
          createData.ssoAccessToken = ssoResponse.access_token;
          createData.ssoRefreshToken = ssoResponse.refresh_token;
          createData.ssoTokenExpiry = new Date(Date.now() + ssoResponse.expires_in * 1000);
        } catch (e) {
          console.warn('SSO fields not available in schema, creating user without SSO data');
        }

        localUser = await (prisma as any).pegawai.create({
          data: createData
        });
      } catch (error) {
        console.error('Error creating user:', error);
        throw new Error('Database error while creating user');
      }
    } else {
      // Update existing user with SSO tokens and data
      try {
        const updateData: any = {
          // Don't update role - preserve local project role settings
          // role: mapSSORole(ssoResponse.user.role), // Commented out to preserve local roles
        };

        // Update namaLengkap if it's currently just the username (indicating it was set incorrectly before)
        const potentialFullName = extractFullNameFromSSO(ssoResponse.user);
        if (localUser.namaLengkap === localUser.username && potentialFullName !== localUser.username) {
          updateData.namaLengkap = potentialFullName;
        }

        // Add SSO fields if they exist in the schema
        try {
          updateData.ssoUserId = ssoResponse.user.username;
          updateData.ssoRoleId = ssoResponse.user.role_id;
          updateData.ssoCompanyId = ssoResponse.user.companyId;
          updateData.ssoAccessToken = ssoResponse.access_token;
          updateData.ssoRefreshToken = ssoResponse.refresh_token;
          updateData.ssoTokenExpiry = new Date(Date.now() + ssoResponse.expires_in * 1000);
        } catch (e) {
          console.warn('SSO fields not available in schema, updating user without SSO data');
        }

        localUser = await (prisma as any).pegawai.update({
          where: { id: localUser.id },
          data: updateData
        });
      } catch (error) {
        console.error('Error updating user:', error);
        throw new Error('Database error while updating user');
      }
    }

    // Create local session token
    const sessionToken = signSession({ 
      id: localUser.id, 
      role: localUser.role as any, 
      namaLengkap: localUser.namaLengkap, 
      username: localUser.username,
      departemenId: localUser.departemenId || null
    });

    // Return user data without sensitive fields
    const { passwordHash, ssoAccessToken, ssoRefreshToken, ...safeUser } = localUser;
    const response = NextResponse.json({ 
      user: {
        ...safeUser,
        ssoEnabled: true,
        ssoUser: ssoResponse.user
      }
    });

    // Set session cookie
    response.cookies.set(SESSION_COOKIE, sessionToken, getSessionCookieOptionsForRequest(req));

    return response;

  } catch (error) {
    console.error('POST /api/auth/sso-login error:', error);
    
    // Ensure no session is created on any error
    const response = NextResponse.json({ 
      error: error instanceof SSOError ? error.message : 'Login failed',
      ssoError: true,
      loginBlocked: true // Explicit flag that login was blocked
    }, { 
      status: error instanceof SSOError ? (error.statusCode || 500) : 500 
    });

    // Explicitly clear any potential session cookie
    response.cookies.delete(SESSION_COOKIE);
    
    return response;
  }
}

/**
 * Get next available noUrut for new user
 */
async function getNextNoUrut(): Promise<number> {
  const lastUser = await (prisma as any).pegawai.findFirst({
    orderBy: { noUrut: 'desc' },
    select: { noUrut: true }
  });
  
  return (lastUser?.noUrut || 0) + 1;
}

/**
 * Extract full name from SSO user data
 * TODO: Update this function when SSO server provides actual full name
 */
function extractFullNameFromSSO(ssoUser: any): string {
  // Priority order for getting full name:
  // 1. full_name (when SSO server provides it)
  // 2. nama_lengkap (when SSO server provides it) 
  // 3. display_name (when SSO server provides it)
  // 4. username (fallback)
  
  return ssoUser.full_name || 
         ssoUser.nama_lengkap || 
         ssoUser.display_name || 
         ssoUser.username;
}
