import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas públicas que no requieren autenticación
const publicRoutes = ['/login', '/api/auth'];

// Rutas protegidas que requieren autenticación
const protectedRoutes = ['/console', '/api/private'];

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// Función para verificar si el usuario está autenticado
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return false;
    }

    // Calling backend directly to avoid triggering the proxy/middleware again
    const authCheckUrl = `${BACKEND_URL}/users/me`;

    const response = await fetch(authCheckUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar si la ruta actual es pública
  const isPublicRoute = publicRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Verificar si la ruta actual está protegida
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Verificar autenticación
  const authenticated = await isAuthenticated(request);

  // // Handle root path '/'
  // if (pathname === '/') {
  //   if (authenticated) {
  //     return NextResponse.redirect(new URL('/console', request.url));
  //   }
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

  // Si la ruta es pública, permitir el acceso siempre
  if (isPublicRoute) {
    // Si el usuario ya está autenticado y trata de acceder a login, redirigir a console
    if (pathname === '/login' && authenticated) {
      return NextResponse.redirect(new URL('/console', request.url));
    }
    return NextResponse.next();
  }

  // Si la ruta está protegida y no está autenticado, redirigir a login
  if (isProtectedRoute && !authenticated) {
    const loginUrl = new URL('/login', request.url);
    // Agregar parámetro de redirección para volver después del login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Para todas las demás rutas, permitir el acceso
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
