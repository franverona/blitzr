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

// Inclusive day-boundary conversions for a `<input type="date">` value
// ("YYYY-MM-DD") to unix seconds, in local time — the same local-calendar-day
// convention formatDate() already displays games in, so a from/to filter
// lines up with the dates a user actually sees rather than a UTC day that
// can be off by one near midnight.
export function startOfDaySeconds(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00`).getTime() / 1000)
}

export function endOfDaySeconds(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T23:59:59.999`).getTime() / 1000)
}
