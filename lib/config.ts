export function getChesscomUsername(): string {
  const username = process.env.CHESSCOM_USERNAME?.trim()
  if (!username) {
    throw new Error('CHESSCOM_USERNAME is not set. Copy .env.example to .env.local and fill it in.')
  }
  return username
}

export function hasChesscomUsername(): boolean {
  return Boolean(process.env.CHESSCOM_USERNAME?.trim())
}
