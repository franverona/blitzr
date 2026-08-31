// Plain <img>, not next/image — avatar URLs are on Chess.com's CDN and
// vary per user, not worth allowlisting a remote pattern for a purely
// decorative image.
export function PlayerAvatar({
  username,
  avatarUrl,
}: {
  username: string
  avatarUrl: string | null
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-sm object-cover"
      />
    )
  }

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-zinc-700 text-sm font-medium text-zinc-300">
      {username.charAt(0).toUpperCase()}
    </span>
  )
}
