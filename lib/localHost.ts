const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Whether a request's Host header names this machine. Binding to 127.0.0.1 keeps the
 * network out, but a site whose DNS is rebound to 127.0.0.1 still reaches the server
 * with its own name as Host (and a matching Origin, so Next's CSRF check passes).
 */
export function isLoopbackHost(host: string | null): boolean {
  if (!host) return false
  try {
    return LOOPBACK_HOSTNAMES.has(new URL(`http://${host}`).hostname)
  } catch {
    return false
  }
}
