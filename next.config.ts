import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // CLAUDE.md already points agents at node_modules/next/dist/docs/; don't write AGENTS.md.
  agentRules: false,
}

export default nextConfig
