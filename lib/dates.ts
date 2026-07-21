// Hand-formatted (not Intl/toLocaleString) so output is deterministic across
// server and client regardless of locale — DD/MM/YYYY, 24h clock.
export function formatDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${d.getFullYear()}`
}

export function formatDateTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${formatDate(unixSeconds)}, ${hours}:${minutes}`
}
