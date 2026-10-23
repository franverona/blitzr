import { NextResponse, type NextRequest } from 'next/server'
import { isLoopbackHost } from '@/lib/localHost'

// No matcher: the JS chunks name the Server Actions, so they need the check too.
export function proxy(request: NextRequest) {
  if (!isLoopbackHost(request.headers.get('host'))) {
    return new NextResponse('Forbidden', { status: 403 })
  }
}
