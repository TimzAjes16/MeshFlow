import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next.js internal routes and static files to pass through
  // These should be handled by Next.js automatically
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // Files with extensions (e.g., .ico, .png, .jpg, etc.)
  ) {
    return NextResponse.next();
  }

  // Continue with normal request handling for other routes
  return NextResponse.next();
}

// Configure which routes this middleware should run on
// Exclude Next.js internal routes, API routes, and static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)',
  ],
};


