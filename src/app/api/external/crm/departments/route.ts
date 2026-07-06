import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/external/crm/departments
 * Fetch departments from CRM API (action="dep")
 * Using GET with body (non-standard but required by CRM API)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = process.env.CRM_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }
    
    console.log('[CRM Departments] API Key check:', apiKey ? 'Found' : 'Missing', apiKey?.substring(0, 10) + '...');

    // Hardcoded URL for department endpoint (different from tasklist_actions.php)
    const crmApiUrl = 'https://mycrm.expressa.id/hrd/api/dep.php';
    console.log('[CRM Departments] Fetching from:', crmApiUrl);

    // Use dynamic import to avoid build issues
    const https = await import('https');
    const http = await import('http');
    
    return new Promise<NextResponse>((resolve) => {
      const url = new URL(crmApiUrl);
      const bodyData = JSON.stringify({
        action: 'dep',
        apiKey: apiKey,
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyData),
        },
      };

      const protocol = url.protocol === 'https:' ? https : http;
      const req = protocol.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            console.log('[CRM Departments] Success, got', jsonData?.data?.length || 0, 'departments');
            
            resolve(NextResponse.json({
              success: true,
              departments: jsonData.data || [],
            }));
          } catch (e) {
            console.error('[CRM Departments] Parse error:', e);
            resolve(NextResponse.json(
              { error: 'Failed to parse response', details: data },
              { status: 500 }
            ));
          }
        });
      });

      req.on('error', (error) => {
        console.error('[CRM Departments] Error:', error);
        resolve(NextResponse.json(
          { error: 'Request failed', message: error.message },
          { status: 500 }
        ));
      });

      req.on('timeout', () => {
        req.destroy();
        console.error('[CRM Departments] Timeout');
        resolve(NextResponse.json(
          { error: 'Request timeout' },
          { status: 500 }
        ));
      });

      req.setTimeout(10000); // 10 second timeout
      req.write(bodyData);
      req.end();
    });

  } catch (error: any) {
    console.error('[CRM Departments] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
