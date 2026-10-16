// Hand-formatted (not Intl) so server and client output match. DD/MM/YYYY, 24h.
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

// `<input type="date">` value -> inclusive day bounds in local time, matching
// formatDate().
export function startOfDaySeconds(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00`).getTime() / 1000)
}

export function endOfDaySeconds(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T23:59:59.999`).getTime() / 1000)
}
