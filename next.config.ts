import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // CLAUDE.md already points agents at node_modules/next/dist/docs/; don't write AGENTS.md.
  agentRules: false,
  // A framed page could be clicked into deleting a game: its requests carry our own Origin.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        ],
      },
    ]
  },
}

export default nextConfig
