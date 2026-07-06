import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signSession, SESSION_COOKIE, getSessionCookieOptionsForRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  // Check if this is a tab callback
  const isTab = searchParams.get('tab') === 'true' || searchParams.get('popup') === 'true';
  
  // Collect all parameters for processing
  const allParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    allParams[key] = value;
  });
  
  // Extract OAuth-style parameters as documented in SSO.md
  const access_token = searchParams.get('access_token');
  const refresh_token = searchParams.get('refresh_token');
  const token_type = searchParams.get('token_type');
  const expires_in = searchParams.get('expires_in');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  
  // For backward compatibility, also check other token parameter names
  const token = access_token || 
                searchParams.get('token') || 
                searchParams.get('auth_token') ||
                searchParams.get('accessToken') ||
                searchParams.get('access') ||
                searchParams.get('bearer_token');
  
  // Username might be in URL params or need to be extracted from JWT
  const username = searchParams.get('username') || 
                   searchParams.get('user') || 
                   searchParams.get('login') ||
                   searchParams.get('uid') ||
                   searchParams.get('email') ||
                   searchParams.get('user_id') ||
                   searchParams.get('userId');


  // DEBUG MODE: If debug=true parameter is present, show debug info instead of processing
  if (searchParams.get('debug') === 'true') {
    console.log('🚨🚨🚨 DEBUG MODE: SSO Callback received, logging everything and stopping');
    console.log('📨 Full Request URL:', req.url);
    console.log('📨 Request Method:', req.method);
    console.log('📨 All Headers:', Object.fromEntries(req.headers.entries()));
    console.log('📨 All URL Parameters:', allParams);
    console.log('📨 Extracted Token Data:', {
      access_token: access_token,
      refresh_token: refresh_token,
      token_type: token_type,
      expires_in: expires_in,
      error: error,
      state: state,
      token: token,
      username: username,
    });

    const debugInfo = {
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: req.url,
      isTab: isTab,
      headers: {
        host: req.headers.get('host'),
        'user-agent': req.headers.get('user-agent'),
        origin: req.headers.get('origin'),
        referer: req.headers.get('referer'),
        'content-type': req.headers.get('content-type'),
        'content-length': req.headers.get('content-length'),
        'authorization': req.headers.get('authorization'),
        'cookie': req.headers.get('cookie'),
      },
      allParams: allParams,
      extractedData: {
        access_token: access_token,
        refresh_token: refresh_token,
        token_type: token_type,
        expires_in: expires_in,
        error: error,
        state: state,
        token: token,
        username: username,
      },
      validation: {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        hasToken: !!token,
        hasUsername: !!username,
        hasError: !!error,
        tokenLength: (access_token || token)?.length || 0,
        usernameLength: username?.length || 0,
      },
      message: "🚨 DEBUG MODE: This is what SSO sent back. No further processing will occur."
    };

    // Return HTML page with debug info for better readability
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SSO Debug - Response Data</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            background: #1a1a1a;
            color: #00ff00;
            padding: 20px;
            margin: 0;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          h1 {
            color: #ff6b6b;
            text-align: center;
            border-bottom: 2px solid #ff6b6b;
            padding-bottom: 10px;
          }
          .section {
            background: #2a2a2a;
            margin: 20px 0;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #4ecdc4;
          }
          .section h2 {
            color: #4ecdc4;
            margin-top: 0;
          }
          pre {
            background: #000;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .highlight {
            background: #333;
            padding: 2px 4px;
            border-radius: 3px;
            color: #ffeb3b;
          }
          .error {
            color: #ff5722;
          }
          .success {
            color: #4caf50;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚨 SSO DEBUG MODE - Response Analysis</h1>
          
          <div class="section">
            <h2>📨 Request Information</h2>
            <pre>Method: ${debugInfo.method}
URL: ${debugInfo.url}
Timestamp: ${debugInfo.timestamp}
Is Tab: ${debugInfo.isTab}</pre>
          </div>

          <div class="section">
            <h2>📋 Headers Received</h2>
            <pre>${JSON.stringify(debugInfo.headers, null, 2)}</pre>
          </div>

          <div class="section">
            <h2>🔗 URL Parameters</h2>
            <pre>${JSON.stringify(debugInfo.allParams, null, 2)}</pre>
          </div>

          <div class="section">
            <h2>🔑 Token Data Extracted</h2>
            <pre>${JSON.stringify(debugInfo.extractedData, null, 2)}</pre>
          </div>

          <div class="section">
            <h2>✅ Validation Results</h2>
            <pre>Has Access Token: <span class="${debugInfo.validation.hasAccessToken ? 'success' : 'error'}">${debugInfo.validation.hasAccessToken}</span>
Has Refresh Token: <span class="${debugInfo.validation.hasRefreshToken ? 'success' : 'error'}">${debugInfo.validation.hasRefreshToken}</span>
Has Any Token: <span class="${debugInfo.validation.hasToken ? 'success' : 'error'}">${debugInfo.validation.hasToken}</span>
Has Username: <span class="${debugInfo.validation.hasUsername ? 'success' : 'error'}">${debugInfo.validation.hasUsername}</span>
Has Error: <span class="${debugInfo.validation.hasError ? 'error' : 'success'}">${debugInfo.validation.hasError}</span>
Token Length: ${debugInfo.validation.tokenLength}
Username Length: ${debugInfo.validation.usernameLength}</pre>
          </div>

          <div class="section">
            <h2>🎯 Analysis</h2>
            <pre>${debugInfo.validation.hasToken ? 
              '✅ SUCCESS: Tokens were received from SSO server' : 
              '❌ ISSUE: No tokens received - check SSO server configuration'
            }

${debugInfo.validation.hasUsername ? 
  '✅ SUCCESS: Username/user info received' : 
  '⚠️  WARNING: No username received - may need to extract from token'
}

${debugInfo.validation.hasError ? 
  '❌ ERROR: SSO server returned an error' : 
  '✅ No errors reported by SSO server'
}</pre>
          </div>

          <div class="section">
            <h2>📝 Raw JSON Data</h2>
            <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
          </div>

          <div class="section">
            <h2>🔄 Next Steps</h2>
            <pre>1. Check if tokens are present above
2. If no tokens, verify SSO server callback URL configuration
3. If tokens present, remove ?debug=true to enable normal processing
4. Check server logs for additional debugging information</pre>
          </div>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store',
      }
    });
  }

  // Handle SSO error
  if (error) {
    console.error('SSO callback error:', error);
    
    if (isTab) {
      // For tab mode, return HTML that communicates with parent
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>SSO Error</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'SSO_ERROR',
                error: '${error.replace(/'/g, "\\'")}'
              }, window.location.origin);
            }
            window.close();
          </script>
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    return NextResponse.redirect(new URL('/signin?error=' + encodeURIComponent(error), appUrl));
  }

  // If we have a code but no token, this might be OAuth authorization code flow
  if (searchParams.get('code') && !token) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    return NextResponse.redirect(new URL('/signin?error=oauth_code_flow_not_implemented', appUrl));
  }

  // Validate required parameters
  if (!token && !username) {
    console.error('SSO callback missing parameters:', { 
      token: !!token, 
      username: !!username,
      hasCode: !!searchParams.get('code'),
      allParams 
    });
    
    if (isTab) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>SSO Error</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'SSO_ERROR',
                error: 'Invalid SSO callback parameters'
              }, window.location.origin);
            }
            window.close();
          </script>
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    // If no parameters at all, might be a direct access
    if (Object.keys(allParams).length === 0) {
      return NextResponse.redirect(new URL('/signin?error=direct_callback_access', appUrl));
    }
    
    return NextResponse.redirect(new URL('/signin?error=invalid_callback', appUrl));
  }

  // If we have token but no username, try to extract username from JWT
  let finalUsername = username;
  if (token && !username) {
    try {
      // Decode JWT token to extract username (without verification for now)
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        finalUsername = payload.username || payload.sub || payload.user || payload.login;
      }
    } catch (e) {
      console.error('Failed to decode JWT token:', e);
    }
  }

  try {
    // Test database connection first
    try {
      await (prisma as any).$connect();
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      throw new Error(`Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown DB error'}`);
    }
    
    let localUser;
    try {
      localUser = await (prisma as any).pegawai.findFirst({
        where: {
          OR: [
            { username: finalUsername },
            { ssoUserId: finalUsername }
          ]
        }
      });
    } catch (userError) {
      console.error('User lookup failed:', userError);
      throw new Error(`User lookup failed: ${userError instanceof Error ? userError.message : 'Unknown user error'}`);
    }

  if (!localUser) {
      // Create new user from SSO data
      try {
        const nextNoUrut = await getNextNoUrut();
        
        const createData: any = {
          noUrut: nextNoUrut,
          username: finalUsername,
          namaLengkap: finalUsername, // Will be updated when we get full user data
          noHp: '', // Default empty, can be updated later
          role: 'PROGRAMMER', // Default role for new SSO users
          ssoUserId: finalUsername,
          ssoAccessToken: access_token || token,
          ssoRefreshToken: refresh_token,
          ssoTokenExpiry: expires_in ? new Date(Date.now() + parseInt(expires_in) * 1000) : new Date(Date.now() + 3600 * 1000),
        };
        
        localUser = await (prisma as any).pegawai.create({
          data: createData
        });
      } catch (createError) {
        console.error('User creation failed:', createError);
        throw new Error(`User creation failed: ${createError instanceof Error ? createError.message : 'Unknown create error'}`);
      }
    } else {
      // Update existing user with SSO token
      try {
        const updateData = {
          ssoUserId: finalUsername,
          ssoAccessToken: access_token || token,
          ssoRefreshToken: refresh_token,
          ssoTokenExpiry: expires_in ? new Date(Date.now() + parseInt(expires_in) * 1000) : new Date(Date.now() + 3600 * 1000),
        };
        
        localUser = await (prisma as any).pegawai.update({
          where: { id: localUser.id },
          data: updateData
        });
      } catch (updateError) {
        console.error('User update failed:', updateError);
        throw new Error(`User update failed: ${updateError instanceof Error ? updateError.message : 'Unknown update error'}`);
      }
    }

    // Create local session token
    let sessionToken;
    try {
      sessionToken = signSession({ 
        id: localUser.id, 
        role: localUser.role as any, 
        namaLengkap: localUser.namaLengkap, 
        username: localUser.username,
        departemenId: localUser.departemenId || null
      });
    } catch (sessionError) {
      console.error('Session creation failed:', sessionError);
      throw new Error(`Session creation failed: ${sessionError instanceof Error ? sessionError.message : 'Unknown session error'}`);
    }

    if (isTab) {
      // For popup mode, set cookie and return HTML that communicates with parent
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>SSO Success</title>
        </head>
        <body>
          <script>
            // Set the session cookie
            document.cookie = '${SESSION_COOKIE}=${sessionToken}; path=/; ${getSessionCookieOptionsForRequest(req).secure ? 'secure;' : ''} ${getSessionCookieOptionsForRequest(req).sameSite ? 'samesite=' + getSessionCookieOptionsForRequest(req).sameSite + ';' : ''}';
            
            // Send success message to parent immediately
            if (window.opener) {
              window.opener.postMessage({
                type: 'SSO_SUCCESS',
                user: {
                  id: ${localUser.id},
                  username: '${localUser.username}',
                  namaLengkap: '${localUser.namaLengkap}',
                  role: '${localUser.role}',
                  departemenId: ${localUser.departemenId || 'null'}
                }
              }, window.location.origin);
              
              // Close popup immediately after sending message
              window.close();
            } else {
              // Fallback: close immediately if no opener
              window.close();
            }
          </script>
        </body>
        </html>
      `;
      
      const response = new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' }
      });
      response.cookies.set(SESSION_COOKIE, sessionToken, getSessionCookieOptionsForRequest(req));
      return response;
    }

    // For non-popup mode, return HTML that checks if we're in a popup context
    // This handles cases where the SSO server doesn't respect the return_url parameter
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SSO Success</title>
      </head>
      <body>
        <script>
          // Set the session cookie
          document.cookie = '${SESSION_COOKIE}=${sessionToken}; path=/; ${getSessionCookieOptionsForRequest(req).secure ? 'secure;' : ''} ${getSessionCookieOptionsForRequest(req).sameSite ? 'samesite=' + getSessionCookieOptionsForRequest(req).sameSite + ';' : ''}';
          
          // Check if we're in a popup context
          if (window.opener && window.opener !== window) {
            // We're in a popup - send message to parent and close
            window.opener.postMessage({
              type: 'SSO_SUCCESS',
              user: {
                id: ${localUser.id},
                username: '${localUser.username}',
                namaLengkap: '${localUser.namaLengkap}',
                role: '${localUser.role}',
                departemenId: ${localUser.departemenId || 'null'}
              }
            }, window.location.origin);
            
            // Close popup immediately
            window.close();
          } else {
            // We're in the main window - redirect to dashboard immediately
            window.location.href = '${new URL('/project-dashboard', dashboardUrl).toString()}';
          }
        </script>
      </body>
      </html>
    `;
    
    const response = new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    response.cookies.set(SESSION_COOKIE, sessionToken, getSessionCookieOptionsForRequest(req));
    return response;

  } catch (error) {
    console.error('SSO callback failed:', {
      error: error instanceof Error ? error.message : error,
      username: finalUsername,
      hasToken: !!token
    });
    
    if (isTab) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>SSO Error</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'SSO_ERROR',
                error: 'Authentication failed: ${error instanceof Error ? error.message.replace(/'/g, "\\'") : 'Unknown error'}'
              }, window.location.origin);
            }
            window.close();
          </script>
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const errorParam = error instanceof Error ? error.message : 'callback_failed';
    return NextResponse.redirect(new URL('/signin?error=' + encodeURIComponent(errorParam), appUrl));
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
 * Handle POST requests to SSO callback (some SSO servers use POST instead of GET)
 */
export async function POST(req: NextRequest) {
  // Check for debug mode first
  const debugParams = new URL(req.url).searchParams;
  if (debugParams.get('debug') === 'true') {
    
    try {
      const contentType = req.headers.get('content-type') || '';
      let body = null;
      let formData = null;
      let rawText = null;
      
      // Try to read the body in different formats
      try {
        if (contentType.includes('application/json')) {
          body = await req.json().catch(() => null);
          console.log('📨 POST JSON Body:', body);
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          formData = await req.formData().catch(() => null);
          console.log('📨 POST Form Data:', formData ? Object.fromEntries(formData.entries()) : null);
        } else {
          rawText = await req.text().catch(() => null);
          console.log('📨 POST Raw Text:', rawText);
        }
      } catch (e) {
        console.log('📨 Error reading POST body:', e);
      }
      
      const debugInfo = {
        timestamp: new Date().toISOString(),
        method: 'POST',
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
        urlParams: Object.fromEntries(debugParams.entries()),
        body: body,
        formData: formData ? Object.fromEntries(formData.entries()) : null,
        rawText: rawText,
        contentType: contentType,
        message: "🚨 DEBUG MODE: This is what SSO sent via POST. No further processing will occur."
      };

      // Return HTML page with debug info for better readability
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>SSO Debug - POST Response Data</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              background: #1a1a1a;
              color: #00ff00;
              padding: 20px;
              margin: 0;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
            }
            h1 {
              color: #ff6b6b;
              text-align: center;
              border-bottom: 2px solid #ff6b6b;
              padding-bottom: 10px;
            }
            .section {
              background: #2a2a2a;
              margin: 20px 0;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #4ecdc4;
            }
            .section h2 {
              color: #4ecdc4;
              margin-top: 0;
            }
            pre {
              background: #000;
              padding: 15px;
              border-radius: 4px;
              overflow-x: auto;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .highlight {
              background: #333;
              padding: 2px 4px;
              border-radius: 3px;
              color: #ffeb3b;
            }
            .error {
              color: #ff5722;
            }
            .success {
              color: #4caf50;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚨 SSO DEBUG MODE - POST Response Analysis</h1>
            
            <div class="section">
              <h2>📨 Request Information</h2>
              <pre>Method: ${debugInfo.method}
URL: ${debugInfo.url}
Timestamp: ${debugInfo.timestamp}
Content-Type: ${debugInfo.contentType}</pre>
            </div>

            <div class="section">
              <h2>📋 All Headers Received</h2>
              <pre>${JSON.stringify(debugInfo.headers, null, 2)}</pre>
            </div>

            <div class="section">
              <h2>🔗 URL Parameters</h2>
              <pre>${JSON.stringify(debugInfo.urlParams, null, 2)}</pre>
            </div>

            <div class="section">
              <h2>📦 POST Body Data</h2>
              <pre>JSON Body: ${JSON.stringify(debugInfo.body, null, 2)}

Form Data: ${JSON.stringify(debugInfo.formData, null, 2)}

Raw Text: ${debugInfo.rawText || 'null'}</pre>
            </div>

            <div class="section">
              <h2>🎯 Analysis</h2>
              <pre>${debugInfo.body || debugInfo.formData || debugInfo.rawText ? 
                '✅ SUCCESS: POST data was received from SSO server' : 
                '❌ ISSUE: No POST data received - check SSO server configuration'
              }

Content-Type: ${debugInfo.contentType || 'Not specified'}

${debugInfo.body ? '✅ JSON data found in body' : ''}
${debugInfo.formData ? '✅ Form data found in body' : ''}
${debugInfo.rawText ? '✅ Raw text data found in body' : ''}</pre>
            </div>

            <div class="section">
              <h2>📝 Raw JSON Data</h2>
              <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
            </div>

            <div class="section">
              <h2>🔄 Next Steps</h2>
              <pre>1. Check if POST data is present above
2. If no data, verify SSO server is sending POST requests correctly
3. If data present, remove ?debug=true to enable normal processing
4. Check server logs for additional debugging information</pre>
            </div>
          </div>
        </body>
        </html>
      `;

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store',
        }
      });
    } catch (error) {
      return NextResponse.json({
        error: 'Debug mode failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }
  
  // For POST requests, parameters might be in the body or still in URL params
  let searchParams: URLSearchParams;
  
  try {
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Handle JSON body
      const body = await req.json().catch(() => null);
      
      if (body && Object.keys(body).length > 0) {
        searchParams = new URLSearchParams();
        Object.entries(body).forEach(([key, value]) => {
          if (typeof value === 'string') {
            searchParams.set(key, value);
          }
        });
      } else {
        searchParams = new URL(req.url).searchParams;
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Handle form data
      const formData = await req.formData().catch(() => null);
      
      if (formData) {
        searchParams = new URLSearchParams();
        formData.forEach((value, key) => {
          if (typeof value === 'string') {
            searchParams.set(key, value);
          }
        });
      } else {
        searchParams = new URL(req.url).searchParams;
      }
    } else {
      // Try to parse as text and then as URLSearchParams
      const text = await req.text().catch(() => '');
      
      if (text) {
        try {
          // Try parsing as URL-encoded string
          searchParams = new URLSearchParams(text);
        } catch {
          // Fall back to URL parameters
          searchParams = new URL(req.url).searchParams;
        }
      } else {
        searchParams = new URL(req.url).searchParams;
      }
    }
  } catch (error) {
    console.error('Error parsing POST body, falling back to URL params:', error);
    searchParams = new URL(req.url).searchParams;
  }
  
  // Also check URL parameters and merge them
  const urlParams = new URL(req.url).searchParams;
  urlParams.forEach((value, key) => {
    if (!searchParams.has(key)) {
      searchParams.set(key, value);
    }
  });

  // Create a new request object with the parameters in the URL for consistent processing
  const urlWithParams = new URL(req.url);
  searchParams.forEach((value, key) => {
    urlWithParams.searchParams.set(key, value);
  });

  // Create a new NextRequest with the parameters in the URL
  const modifiedReq = new NextRequest(urlWithParams.toString(), {
    method: 'GET', // Process as GET for consistent handling
    headers: req.headers,
  });

  // Delegate to the GET handler
  return GET(modifiedReq);
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://192.168.1.6:3000',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}

