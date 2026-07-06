import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const imagePath = searchParams.get('path');
    
    if (!imagePath) {
      return NextResponse.json({ error: 'Path parameter required' }, { status: 400 });
    }
    
    // Remove leading slash and construct full path
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    const fullPath = path.join(process.cwd(), 'public', cleanPath);
    
    const exists = fs.existsSync(fullPath);
    
    let stats = null;
    if (exists) {
      stats = fs.statSync(fullPath);
    }
    
    return NextResponse.json({
      path: imagePath,
      fullPath,
      exists,
      stats: stats ? {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      } : null
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
