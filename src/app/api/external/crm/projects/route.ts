import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/external/crm/projects
 * Fetch projects from CRM API (action="project", requires idDep)
 * Using GET with body (non-standard but required by CRM API)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { idDep } = body;
    
    if (!idDep) {
      return NextResponse.json(
        { error: 'idDep parameter is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.CRM_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Hardcoded URL for department endpoint (different from tasklist_actions.php)
    const crmApiUrl = 'https://mycrm.expressa.id/hrd/api/dep.php';
    console.log('[CRM Projects] Fetching from:', crmApiUrl, 'with idDep:', idDep);

    // Use dynamic import to avoid build issues
    const https = await import('https');
    const http = await import('http');
    
    return new Promise<NextResponse>((resolve) => {
      const url = new URL(crmApiUrl);
      const bodyData = JSON.stringify({
        action: 'project',
        idDep: idDep,
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
            console.log('[CRM Projects] Success, got', jsonData?.data?.length || 0, 'projects');
            
            resolve(NextResponse.json({
              success: true,
              projects: jsonData.data || [],
            }));
          } catch (e) {
            console.error('[CRM Projects] Parse error:', e);
            resolve(NextResponse.json(
              { error: 'Failed to parse response', details: data },
              { status: 500 }
            ));
          }
        });
      });

      req.on('error', (error) => {
        console.error('[CRM Projects] Error:', error);
        resolve(NextResponse.json(
          { error: 'Request failed', message: error.message },
          { status: 500 }
        ));
      });

      req.on('timeout', () => {
        req.destroy();
        console.error('[CRM Projects] Timeout');
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
    console.error('[CRM Projects] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
