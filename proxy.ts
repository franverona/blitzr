import { NextResponse, type NextRequest } from 'next/server'
import { isLoopbackHost } from '@/lib/localHost'

const isDev = process.env.NODE_ENV === 'development'

// Injected script would reach every Server Action, so only Next's own (nonced) scripts and what
// they load run; 'wasm-unsafe-eval' is Stockfish. Styles stay inline: react-chessboard sets style
// attributes, which a nonce can't cover. chess.com's CDN serves avatars and move sounds. No
// upgrade-insecure-requests: it would send http://127.0.0.1's own requests to https.
function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    'media-src https://images.chesscomfiles.com',
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // A framed page could be clicked into deleting a game: its requests carry our own Origin.
    "frame-ancestors 'none'",
  ].join('; ')
}

// No matcher: the JS chunks name the Server Actions, so they need the check too.
export function proxy(request: NextRequest) {
  if (!isLoopbackHost(request.headers.get('host'))) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  // Next reads the nonce from the request's CSP header and puts it on its scripts.
  const csp = contentSecurityPolicy(btoa(crypto.randomUUID()))
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('Content-Security-Policy', csp)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}
