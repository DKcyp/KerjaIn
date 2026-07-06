import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    isSSOEnabled: process.env.SSO_ENABLED === 'true',
    isSSOBypassEnabled: process.env.SSO_BYPASS_FOR_DEV === 'true',
    nodeEnv: process.env.NODE_ENV,
    // Don't expose sensitive URLs in production
    ...(process.env.NODE_ENV === 'development' && {
      ssoDashboardUrl: process.env.SSO_DASHBOARD_URL || process.env.NEXT_PUBLIC_SSO_DASHBOARD_URL,
      ssoApiUrl: process.env.SSO_API_URL || process.env.NEXT_PUBLIC_SSO_API_URL,
      ssoCallbackUrl: process.env.SSO_CALLBACK_URL || process.env.NEXT_PUBLIC_SSO_CALLBACK_URL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    })
  });
}
