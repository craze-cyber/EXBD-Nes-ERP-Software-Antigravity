import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Get session token from cookies
  const sessionToken = request.cookies.get("insforge-token")?.value || 
                       request.cookies.get("insforge-session")?.value;

  console.log(`Middleware: ${pathname} | Token: ${!!sessionToken}`);

  // 2. Define protected paths
  const isAuthPage = pathname.startsWith("/login");
  const isDashboardPage = pathname === "/" || 
                        pathname.startsWith("/sponsors") || 
                        pathname.startsWith("/clients") || 
                        pathname.startsWith("/workers") || 
                        pathname.startsWith("/payroll") || 
                        pathname.startsWith("/accounting") || 
                        pathname.startsWith("/reports") || 
                        pathname.startsWith("/settings");

  // 3. Redirect logic
  if (isDashboardPage && !sessionToken) {
    console.log("Middleware: Redirecting to /login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && sessionToken) {
    console.log("Middleware: Redirecting to dashboard");
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
