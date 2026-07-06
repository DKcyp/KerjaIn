import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import mime from 'mime-types';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        //  Await params to fix Next.js 15 compatibility
        const resolvedParams = await params;
        const filePath = resolvedParams.path.join('/');

        // Construct full file path - explicitly add 'chat' directory
        const fullPath = path.join(process.cwd(), 'public', 'uploads', 'chat', filePath);

        // Security: Prevent directory traversal
        const normalizedPath = path.normalize(fullPath);
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'chat');
        if (!normalizedPath.startsWith(uploadsDir)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Check if file exists
        try {
            const stats = await stat(normalizedPath);
            if (!stats.isFile()) {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }
        } catch (error) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Read file
        const fileBuffer = await readFile(normalizedPath);

        // Determine content type
        const contentType = mime.lookup(normalizedPath) || 'application/octet-stream';

        // Return file with appropriate headers
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Content-Length': fileBuffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('Error serving chat file:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
