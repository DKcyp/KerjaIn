import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get cookies from the incoming request to pass along
    const cookieHeader = req.headers.get('cookie') || '';
    
    const baseUrl = (process.env.JWT_API_URL || 'http://localhost:8090').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/periode/data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch periode data. Status: ${response.status}`);
      return NextResponse.json(
        { status: false, message: 'Failed to fetch periode data', data: [] }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/periode proxy:', error);
    return NextResponse.json(
      { status: false, message: error.message || 'Server error', data: [] }, 
      { status: 500 }
    );
  }
}
