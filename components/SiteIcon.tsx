import { getStrings } from '@/lib/i18n/strings'
import type { GameSite } from '@/lib/types'

// Hotlinked like the move sounds, not redistributed. Lichess's is a black outline, so it's
// inverted on dark backgrounds.
const ICONS: Record<GameSite, { src: string; className: string }> = {
  chesscom: { src: 'https://www.chess.com/bundles/web/favicons/favicon-32x32.png', className: '' },
  lichess: {
    src: 'https://lichess1.org/assets/logo/lichess-favicon-32.png',
    className: 'dark:invert',
  },
}

/** The site a game was played on, as its favicon, named by tooltip and alt text unless
 *  `decorative` (beside a visible name, which would read it twice). */
export function SiteIcon({ site, decorative = false }: { site: GameSite; decorative?: boolean }) {
  const name = getStrings().common.site[site]
  const { src, className } = ICONS[site]
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={decorative ? '' : name}
      title={decorative ? undefined : name}
      width={16}
      height={16}
      className={`size-4 ${className}`}
    />
  )
}
