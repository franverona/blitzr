import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // CLAUDE.md already points agents at node_modules/next/dist/docs/; don't write AGENTS.md.
  agentRules: false,
  // A framed page could be clicked into deleting a game: its requests carry our own Origin. The
  // Content-Security-Policy (with frame-ancestors) is set per request in proxy.ts, for its nonce.
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] }]
  },
}

export default nextConfig
