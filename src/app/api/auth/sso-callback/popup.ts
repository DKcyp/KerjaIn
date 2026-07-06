import { NextRequest, NextResponse } from 'next/server';

/**
 * SSO Callback handler specifically for popup windows
 * This sends messages to the parent window and closes the popup
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const error = searchParams.get('error');
  const success = searchParams.get('success');
  
  // Create HTML that will communicate with parent window and close popup
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>SSO Login</title>
    </head>
    <body>
      <script>
        (function() {
          const urlParams = new URLSearchParams(window.location.search);
          const error = urlParams.get('error');
          const success = urlParams.get('success');
          
          if (error) {
            // Send error to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'SSO_ERROR',
                error: decodeURIComponent(error)
              }, window.location.origin);
            }
            
            // Close popup immediately
            window.close();
            
          } else {
            // Send success to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'SSO_SUCCESS',
                user: { authenticated: true }
              }, window.location.origin);
            }
            
            // Close popup immediately
            window.close();
          }
        })();
      </script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
