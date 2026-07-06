import { NextResponse } from 'next/server';
import { parseSessionFromCookieHeader, signSession, getSessionCookieOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSSOEnabled, isSSOBypassEnabled, SSOError, validateSSOToken } from '@/lib/sso';
import { verifyPortalSession, fetchHubDepartment, mapPortalRole } from '@/lib/portal-sso';

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    if (!session) return NextResponse.json(
      { user: null },
      { headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'Pragma': 'no-cache' } }
    );
    
    const user = await (prisma as any).pegawai.findUnique({
      where: { id: session.id },
      include: {
        departemen: {
          select: {
            id: true,
            idDep: true,
            nama: true,
            logoUrl: true,
          }
        }
      }
    });

    if (!user) return NextResponse.json(
      { user: null },
      { headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'Pragma': 'no-cache' } }
    );

    // Always verify Portal session when SSO is enabled and user has ssoUserId
    // BUT: Skip this check for external DB users who have a local session cookie
    // External DB users are identified by having a valid local session — we trust it
    if (isSSOEnabled() && !isSSOBypassEnabled() && user.ssoUserId) {
      // Only do Portal session switching if there is NO valid local session already
      // i.e. only auto-switch Portal users, not users who explicitly logged in locally
      const hasLocalPassword = !!user.passwordHash;
      if (!hasLocalPassword) {
      console.log(`[Auth Me] Verifying Portal session for user ${user.id} (ssoUserId: ${user.ssoUserId})`);
      
      try {
        const portalResponse = await verifyPortalSession(cookieHeader || undefined);
        
        if (portalResponse.authenticated && portalResponse.user) {
          const portalUserId = portalResponse.user.id;
          
          // If Portal user is different from local session user, switch
          if (portalUserId !== user.ssoUserId) {
            console.log(`[Auth Me] Portal user changed! Local: ${user.ssoUserId}, Portal: ${portalUserId}`);
            
            // Find the new user in Logbook
            let newUser = await (prisma as any).pegawai.findFirst({
              where: { ssoUserId: portalUserId },
              include: {
                departemen: {
                  select: { id: true, idDep: true, nama: true, logoUrl: true }
                }
              }
            });
            
            if (!newUser) {
              // New user doesn't exist in Logbook yet - create them
              console.log(`[Auth Me] Creating new user from Portal: ${portalResponse.user.email}`);
              
              // Resolve department
              const portalTenantId = portalResponse.user.tenant?.id || null;
              const portalTenantName = portalResponse.user.tenant?.name || null;
              let departemenId: number | null = null;
              
              if (portalTenantId) {
                let dept = await (prisma as any).masterDepartemen.findUnique({
                  where: { idDep: portalTenantId }
                });
                if (!dept && portalTenantName) {
                  dept = await (prisma as any).masterDepartemen.create({
                    data: { idDep: portalTenantId, nama: portalTenantName, isActive: true }
                  });
                }
                if (dept) {
                  departemenId = dept.id;
                  if (!dept.logoUrl) {
                    const hubDept = await fetchHubDepartment(portalTenantId);
                    if (hubDept?.dep_logo) {
                      await (prisma as any).masterDepartemen.update({
                        where: { id: dept.id },
                        data: { logoUrl: hubDept.dep_logo },
                      });
                    }
                  }
                }
              }
              
              // Generate noUrut
              const lastUser = await (prisma as any).pegawai.findFirst({
                orderBy: { noUrut: 'desc' },
                select: { noUrut: true },
              });
              const nextNoUrut = (lastUser?.noUrut || 0) + 1;
              
              const emailUsername = portalResponse.user.email.split('@')[0];
              let username = emailUsername;
              let counter = 1;
              while (await (prisma as any).pegawai.findFirst({ where: { username } })) {
                username = `${emailUsername}${counter}`;
                counter++;
              }
              
              newUser = await (prisma as any).pegawai.create({
                data: {
                  noUrut: nextNoUrut,
                  namaLengkap: portalResponse.user.displayName,
                  username: username,
                  noHp: '',
                  passwordHash: '',
                  role: mapPortalRole(portalResponse.user.role),
                  ssoUserId: portalUserId,
                  portalTenantId: portalTenantId,
                  departemenId: departemenId,
                },
                include: {
                  departemen: {
                    select: { id: true, idDep: true, nama: true, logoUrl: true }
                  }
                }
              });
              
              console.log(`[Auth Me] New user created: ${newUser.id}`);
            }
            
            // Create new session for the Portal user
            const newToken = signSession({
              id: newUser.id,
              role: newUser.role,
              namaLengkap: newUser.namaLengkap,
              username: newUser.username,
              departemenId: newUser.departemenId || null,
            });
            
            const { passwordHash: _ph2, ssoAccessToken: _sat2, ssoRefreshToken: _srt2, ...safe2 } = (newUser as any) || {};
            const newUserWithSSO = {
              ...safe2,
              ssoEnabled: true,
              ssoTokenValid: true,
              departemenNama: newUser.departemen?.nama || null,
              departemenIdDep: newUser.departemen?.idDep || null,
              departemenLogoUrl: newUser.departemen?.logoUrl || null,
            };
            
            const response = NextResponse.json(
              { user: newUserWithSSO },
              { headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'Pragma': 'no-cache' } }
            );
            
            const isHttps = req.url.startsWith('https:');
            response.cookies.set('session', newToken, {
              httpOnly: true,
              sameSite: 'lax',
              path: '/',
              secure: isHttps,
              maxAge: 60 * 60 * 24 * 7,
              ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
            });
            
            console.log(`[Auth Me] Session switched to Portal user ${newUser.id} (${portalResponse.user.email})`);
            return response;
          } else {
            console.log(`[Auth Me] Portal session matches local user ${user.id}`);
          }
        } else {
          console.log(`[Auth Me] Portal session not authenticated - keeping local session`);
        }
      } catch (portalError) {
        console.error(`[Auth Me] Portal verification error (keeping local session):`, portalError);
      }
      } // end if (!hasLocalPassword)
    }

    console.log(`[Auth Me] SSO Check - Enabled: ${isSSOEnabled()}, HasToken: ${!!user.ssoAccessToken}, HasSSOUserId: ${!!user.ssoUserId}, Bypass: ${isSSOBypassEnabled()}`);
    
    // Portal V2 SSO: Check ssoUserId instead of ssoAccessToken
    // If user has ssoUserId, they're using Portal V2 SSO (NextAuth session-based)
    const isPortalV2User = !!user.ssoUserId;
    
    // If SSO is enabled but user has no SSO token AND not a Portal V2 user, redirect to SSO login
    // BUT: Skip this check if SSO bypass is enabled (for development)
    // ALSO: Skip if user has a valid local passwordHash (external DB auth user) or has no SSO linkage at all
    // External DB users (no ssoUserId, no ssoAccessToken) are allowed to stay logged in via local session
    const isExternalDbUser = !user.ssoUserId && !user.ssoAccessToken;
    if (isSSOEnabled() && !user.ssoAccessToken && !isPortalV2User && !isSSOBypassEnabled() && !isExternalDbUser) {
      console.log(`[Auth Me] SSO enabled but no token found - redirecting to SSO login`);
      
      // Clear session cookie and return redirect response
      const response = NextResponse.json(
        { 
          user: null, 
          requiresSSOLogin: true, 
          reason: 'SSO authentication required' 
        },
        { 
          status: 401,
          headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'Pragma': 'no-cache' } 
        }
      );
      
      // Clear session cookie
      response.cookies.set('session', '', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: req.url.startsWith('https:'),
        maxAge: 0,
      });
      
      return response;
    }
    
    // Log when SSO check is bypassed
    if (isSSOBypassEnabled()) {
      console.log(`[Auth Me] SSO bypass enabled - allowing login without SSO token`);
    }
    
    // Portal V2 users don't need token validation (they use NextAuth session from Portal)
    if (isPortalV2User) {
      console.log(`[Auth Me] Portal V2 user detected (ssoUserId: ${user.ssoUserId}) - skipping token validation`);
    }
    
    // SSO validation for users with SSO tokens (old SSO system)
    if (isSSOEnabled() && user.ssoAccessToken && !isSSOBypassEnabled()) {
      console.log(`[Auth Me] Starting SSO validation for user ${user.id}`);
      
      // Validate SSO token on every request (no rate limiting)
      try {
          
          // Just validate the current SSO token - no refresh
          const isTokenValid = await validateSSOToken(user.ssoAccessToken);
          
          if (!isTokenValid) {
            
            // Clear SSO tokens from database
            await (prisma as any).pegawai.update({
              where: { id: user.id },
              data: {
                ssoAccessToken: null,
                ssoRefreshToken: null,
                ssoTokenExpiry: null,
              }
            });
            
            
            // Return session expired response to show modal
            // Don't clear session cookie here - let frontend handle it gracefully
            return NextResponse.json(
              { user: null, sessionExpired: true, reason: 'SSO token expired or invalid' },
            { 
              status: 401,
              headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'Pragma': 'no-cache' } 
            }
          );
        } else {
          // Update token expiry to track last validation (reuse existing field)
          const now = Date.now();
          await (prisma as any).pegawai.update({
            where: { id: user.id },
            data: {
              ssoTokenExpiry: new Date(now + (24 * 60 * 60 * 1000)), // 24 hours from now
            }
          });
        }
      } catch (error) {
          console.error('SSO token validation failed:', error);
          
          // Clear SSO tokens and force logout on any SSO error
          if (error instanceof SSOError) {
            try {
              await (prisma as any).pegawai.update({
                where: { id: user.id },
                data: {
                  ssoAccessToken: null,
                  ssoRefreshToken: null,
                  ssoTokenExpiry: null,
                }
              });
              
              
              // Return session expired response - let frontend handle cookie clearing
              return NextResponse.json(
                { user: null, sessionExpired: true, reason: 'SSO token validation failed' },
                { 
                  status: 401,
                  headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'Pragma': 'no-cache' } 
                }
              );
            } catch (dbError) {
              console.error('Failed to clear SSO tokens:', dbError);
            }
          }
        }
    } else {
      console.log(`[Auth Me] SSO validation skipped - Enabled: ${isSSOEnabled()}, HasToken: ${!!user.ssoAccessToken}, Bypass: ${isSSOBypassEnabled()}`);
    }

    // Check for role mismatch between session and database
    let updatedSession = session;
    let needsNewCookie = false;
    
    if (session.role !== user.role) {
      
      // Create new session with updated role from database
      updatedSession = {
        id: user.id,
        role: user.role,
        namaLengkap: user.namaLengkap,
        username: user.username,
        departemenId: user.departemenId || null
      };
      needsNewCookie = true;
    }

    const { passwordHash: _ph, ssoAccessToken: _sat, ssoRefreshToken: _srt, ...safe } = (user as any) || {};
    
    // Add SSO status to response
    // Portal V2 users (with ssoUserId) are considered SSO enabled
    const userWithSSOStatus = {
      ...safe,
      ssoEnabled: !!user.ssoUserId,
      ssoTokenValid: user.ssoTokenExpiry ? new Date(user.ssoTokenExpiry) > new Date() : false,
      departemenNama: user.departemen?.nama || null,
      departemenIdDep: user.departemen?.idDep || null,
      departemenLogoUrl: user.departemen?.logoUrl || null,
    };

    const response = NextResponse.json(
      { user: userWithSSOStatus },
      { headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'Pragma': 'no-cache' } }
    );

    // Set new session cookie if role was updated
    if (needsNewCookie) {
      const newToken = signSession(updatedSession);
      const cookieOptions = getSessionCookieOptions();
      response.cookies.set('session', newToken, cookieOptions);
    }

    return response;
  } catch (e) {
    console.error('GET /api/auth/me error', e);
    return NextResponse.json(
      { user: null },
      { headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'Pragma': 'no-cache' } }
    );
  }
}
