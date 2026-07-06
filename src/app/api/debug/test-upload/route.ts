import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing upload functionality...');
    
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    
    if (!file) {
      return NextResponse.json({ 
        error: 'No file provided',
        debug: 'Make sure to send a file with key "image"'
      }, { status: 400 });
    }
    
    console.log('📁 File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Check upload directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tasklist');
    console.log('📂 Upload directory:', uploadsDir);
    
    try {
      await fs.access(uploadsDir);
      console.log('✅ Upload directory exists');
    } catch {
      console.log('🔧 Creating upload directory...');
      await fs.mkdir(uploadsDir, { recursive: true });
    }
    
    // Test file write
    const bytes = Buffer.from(await file.arrayBuffer());
    const testFilename = `test_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const fullPath = path.join(uploadsDir, testFilename);
    
    console.log('💾 Writing test file:', fullPath);
    await fs.writeFile(fullPath, bytes);
    
    // Verify file was written
    const stats = await fs.stat(fullPath);
    console.log('📊 File written successfully:', {
      size: stats.size,
      path: fullPath
    });
    
    // Clean up test file
    await fs.unlink(fullPath);
    console.log('🧹 Test file cleaned up');
    
    return NextResponse.json({
      success: true,
      message: 'Upload test successful',
      debug: {
        originalFile: {
          name: file.name,
          size: file.size,
          type: file.type
        },
        uploadDir: uploadsDir,
        testFile: testFilename,
        writtenSize: stats.size
      }
    });
    
  } catch (error) {
    console.error('❌ Upload test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Upload test failed',
      details: error instanceof Error ? error.message : String(error),
      debug: {
        cwd: process.cwd(),
        nodeVersion: process.version,
        platform: process.platform
      }
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Upload test endpoint',
    usage: 'POST a file with key "image" to test upload functionality',
    example: 'curl -X POST -F "image=@test.jpg" /api/debug/test-upload'
  });
}
