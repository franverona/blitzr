// Plain <img>, not next/image — avatar URLs are on Chess.com's CDN and
// vary per user, not worth allowlisting a remote pattern for a purely
// decorative image.
export function PlayerAvatar({
  username,
  avatarUrl,
  size = 32,
}: {
  username: string
  avatarUrl: string | null
  /** Pixel size — Tailwind's fixed h-8/w-8 can't flex per caller, so this
   *  goes through inline style instead. Defaults to the original 32px used
   *  everywhere except the compact games-list row. */
  size?: number
}) {
  const style = { width: size, height: size }

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        style={style}
        className="shrink-0 rounded-sm object-cover"
      />
    )
  }

  return (
    <span
      style={style}
      className="flex shrink-0 items-center justify-center rounded-sm bg-zinc-700 text-sm font-medium text-zinc-300"
    >
      {username.charAt(0).toUpperCase()}
    </span>
  )
}
