import { NextRequest, NextResponse } from 'next/server';

const SSO_API_URL = process.env.SSO_API_URL || process.env.SSO_BASE_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    // Test SSO server connectivity
    const response = await fetch(`${SSO_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({ status: 'unknown' }));
      return NextResponse.json({
        success: true,
        ssoServerStatus: 'connected',
        ssoBaseUrl: SSO_API_URL,
        ssoResponse: data
      });
    } else {
      return NextResponse.json({
        success: false,
        ssoServerStatus: 'error',
        ssoBaseUrl: SSO_API_URL,
        statusCode: response.status,
        statusText: response.statusText
      }, { status: 503 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      ssoServerStatus: 'unreachable',
      ssoBaseUrl: SSO_API_URL,
      error: error.message,
      details: 'Cannot connect to SSO server. Please check if SSO server is running.'
    }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({
        error: 'Username and password required for SSO test'
      }, { status: 400 });
    }

    // Test SSO login endpoint
    const response = await fetch(`${SSO_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        client_public_ip: '127.0.0.1'
      }),
    });

    const responseData = await response.json().catch(() => ({}));

    return NextResponse.json({
      success: response.ok,
      ssoServerStatus: response.ok ? 'login_successful' : 'login_failed',
      ssoBaseUrl: SSO_API_URL,
      statusCode: response.status,
      statusText: response.statusText,
      ssoResponse: responseData,
      testResult: response.ok ? 'SSO credentials are valid' : 'SSO credentials are invalid or server error'
    }, { status: response.ok ? 200 : response.status });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      ssoServerStatus: 'unreachable',
      ssoBaseUrl: SSO_API_URL,
      error: error.message,
      testResult: 'Cannot connect to SSO server for login test'
    }, { status: 503 });
  }
}
