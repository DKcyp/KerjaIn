import { NextResponse } from 'next/server';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSSOEnabled, isSSOBypassEnabled } from '@/lib/sso';
import { getSSOApiUrl } from '@/lib/ssoConfig';

/**
 * Aggressive SSO validation endpoint that tests multiple SSO endpoints
 * This endpoint tries different approaches to detect if SSO session is truly valid
 */
export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      return NextResponse.json(
        { valid: false, reason: 'No session found' },
        { status: 401 }
      );
    }
    
    const user = await (prisma as any).pegawai.findUnique({ 
      where: { id: session.id } as any 
    });
    
    if (!user || !user.ssoAccessToken) {
      return NextResponse.json({
        valid: false,
        reason: 'No SSO token found'
      });
    }

    if (!isSSOEnabled() || isSSOBypassEnabled()) {
      return NextResponse.json({
        valid: true,
        reason: 'SSO disabled or bypassed'
      });
    }

    console.log(`[SSO Aggressive] Testing multiple endpoints for user ${user.id}`);
    
    const testResults = [];
    const token = user.ssoAccessToken;
    
    // Test 1: /auth/verify endpoint
    try {
      const verifyUrl = getSSOApiUrl('/auth/verify');
      console.log(`[SSO Aggressive] Testing verify endpoint: ${verifyUrl}`);
      
      const verifyResponse = await fetch(verifyUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });
      
      const verifyText = await verifyResponse.text();
      let verifyData = null;
      try {
        verifyData = JSON.parse(verifyText);
      } catch {}
      
      testResults.push({
        endpoint: '/auth/verify',
        status: verifyResponse.status,
        statusText: verifyResponse.statusText,
        ok: verifyResponse.ok,
        body: verifyText.substring(0, 200),
        data: verifyData
      });
    } catch (error) {
      testResults.push({
        endpoint: '/auth/verify',
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Test 2: /auth/me endpoint (original)
    try {
      const meUrl = getSSOApiUrl('/auth/me');
      console.log(`[SSO Aggressive] Testing me endpoint: ${meUrl}`);
      
      const meResponse = await fetch(meUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });
      
      const meText = await meResponse.text();
      let meData = null;
      try {
        meData = JSON.parse(meText);
      } catch {}
      
      testResults.push({
        endpoint: '/auth/me',
        status: meResponse.status,
        statusText: meResponse.statusText,
        ok: meResponse.ok,
        body: meText.substring(0, 200),
        data: meData
      });
    } catch (error) {
      testResults.push({
        endpoint: '/auth/me',
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Test 3: /user/profile endpoint (alternative)
    try {
      const profileUrl = getSSOApiUrl('/user/profile');
      console.log(`[SSO Aggressive] Testing profile endpoint: ${profileUrl}`);
      
      const profileResponse = await fetch(profileUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });
      
      const profileText = await profileResponse.text();
      let profileData = null;
      try {
        profileData = JSON.parse(profileText);
      } catch {}
      
      testResults.push({
        endpoint: '/user/profile',
        status: profileResponse.status,
        statusText: profileResponse.statusText,
        ok: profileResponse.ok,
        body: profileText.substring(0, 200),
        data: profileData
      });
    } catch (error) {
      testResults.push({
        endpoint: '/user/profile',
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Analyze results
    const validEndpoints = testResults.filter(r => r.ok && r.status === 200);
    const invalidEndpoints = testResults.filter(r => r.status === 401 || r.status === 403);
    
    console.log(`[SSO Aggressive] Results: ${validEndpoints.length} valid, ${invalidEndpoints.length} invalid`);
    
    // If any endpoint returns 401/403, consider token invalid
    const isTokenValid = invalidEndpoints.length === 0 && validEndpoints.length > 0;
    
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
      
      return NextResponse.json({
        valid: false,
        reason: 'SSO token is invalid (aggressive test)',
        testResults,
        validEndpoints: validEndpoints.length,
        invalidEndpoints: invalidEndpoints.length,
        tokenCleared: true
      }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      reason: 'SSO token is valid (aggressive test)',
      testResults,
      validEndpoints: validEndpoints.length,
      invalidEndpoints: invalidEndpoints.length,
      tokenPreview: token.substring(0, 20) + '...'
    });

  } catch (error) {
    console.error('SSO aggressive validation error:', error);
    return NextResponse.json(
      { 
        valid: false, 
        reason: 'Aggressive validation failed', 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
