import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileName = searchParams.get('name');

  if (!fileName) {
    return NextResponse.json({ error: 'File name is required' }, { status: 400 });
  }

  // Security: Only allow specific file extensions and sanitize filename
  const allowedExtensions = ['.dmg', '.exe', '.AppImage', '.zip'];
  const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
  
  if (!allowedExtensions.includes(fileExtension)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // Sanitize filename to prevent directory traversal
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '');

  // In production, files would be served from a CDN or S3 bucket
  // For now, we'll point to the dist directory where Electron Builder outputs files
  const filePath = join(process.cwd(), 'dist', sanitizedFileName);

  // Check if file exists
  if (!existsSync(filePath)) {
    // In production, redirect to actual file storage URL
    // For now, return a placeholder message
    return NextResponse.json(
      { 
        error: 'File not available yet. Please build the desktop app first using: npm run electron:package',
        buildCommand: 'npm run electron:package:all'
      },
      { status: 404 }
    );
  }

  // For actual file serving in production, you would use:
  // const fileStream = createReadStream(filePath);
  // return new NextResponse(fileStream, {
  //   headers: {
  //     'Content-Type': 'application/octet-stream',
  //     'Content-Disposition': `attachment; filename="${sanitizedFileName}"`,
  //   },
  // });

  // For now, return a redirect to the file location
  return NextResponse.redirect(new URL(`/dist/${sanitizedFileName}`, request.url));
}

