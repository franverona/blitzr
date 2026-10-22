import type { GameEndVariant } from '@/lib/gameEnd'

// Percent offset of a square's top-left corner, used to position the
// game-end badges.
function squarePercent(square: string, orientation: 'white' | 'black') {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0) // 0-7, a-h
  const rank = Number(square[1]) // 1-8
  const col = orientation === 'white' ? file : 7 - file
  const row = orientation === 'white' ? 8 - rank : rank - 1
  return { left: col * 12.5, top: row * 12.5 }
}

const GAME_END_BADGE_COLORS = {
  loss: 'bg-rose-600',
  flag: 'bg-rose-600',
  win: 'bg-emerald-600',
  draw: 'bg-zinc-500',
}

// Glyphs traced from chess.com's game-end badges.
function WinnerIcon() {
  return (
    <svg viewBox="0 0 18 19" width="85%" height="85%">
      <path
        fill="#fff"
        transform="matrix(0.25173118,0,0,0.25173118,2.8497971,2.8741344)"
        d="m 24.4334,39.6517 c 15.9034,0 22.8584,-4.7017 22.8584,-4.7017 l 0.975,-23.6167 c 0,-2.16663 -1.495,-2.79497 -3.25,-1.4083 L 34.1834,17.53 26.6868,2.66667 C 26.0151,0.911667 25.1484,0.5 24.5201,0.5 23.8918,0.5 22.9384,0.955 22.3534,2.66667 L 14.6834,17.53 3.85008,9.925 C 2.09508,8.53833 0.513416,9.16667 0.600083,11.3333 L 1.57508,34.95 c 0,0 6.955,4.55 22.85832,4.7017 z"
      />
    </svg>
  )
}

function MateIcon() {
  return (
    <svg viewBox="0 0 18 19" width="85%" height="85%">
      <path
        fill="#fff"
        d="m 8.91922,5.86598 c 0.27141,0 0.5622,0.28866 0.96931,0.70103 0.19387,0.20619 0.40707,0.41237 0.65917,0.63918 0,0.12371 -0.0194,0.26804 -0.0194,0.41237 H 8.70598 C 8.47334,7.30928 8.33764,6.95876 8.33764,6.60825 c 0,-0.37114 0.15509,-0.74227 0.58158,-0.74227 z m 0,6.26802 c -0.42649,0 -0.58158,-0.3711 -0.58158,-0.7422 0,-0.3506 0.1357,-0.7011 0.36834,-1.0104 h 1.82232 c 0,0.1444 0.0194,0.2887 0.0194,0.4124 -0.2521,0.2268 -0.4653,0.433 -0.65917,0.6392 -0.40711,0.4124 -0.6979,0.701 -0.96931,0.701 z M 11.3748,4.52577 C 10.6769,3.7835 9.95961,3 8.79645,3 7.14863,3 5.96607,4.23711 5.96607,5.92784 c 0,0.82474 0.17448,1.50515 0.32957,1.91752 L 5.73344,7.96907 V 7.02062 H 5.40388 4.27948 3.96931 V 8.05155 H 3.31018 3 V 8.40206 9.5979 9.9485 h 0.31018 0.65913 v 1.0309 h 0.31017 1.1244 0.32956 v -0.9485 l 0.54281,0.1237 c -0.1357,0.4124 -0.31018,1.0928 -0.31018,1.9176 0,1.6907 1.18256,2.9278 2.83038,2.9278 1.16316,0 1.88045,-0.7835 2.57835,-1.5258 0.3683,-0.3711 0.7367,-0.7629 1.1632,-1.0515 0.1357,0.4536 0.3683,0.7422 0.6979,0.9072 0.3683,0.2062 0.8142,0.2062 1.3182,0.2062 H 14.6704 15 V 13.1856 L 14.9935,4.81443 V 4.46392 H 14.664 14.5477 c -0.5041,0 -0.95,0 -1.3183,0.20618 C 12.8998,4.83505 12.6672,5.12371 12.5315,5.57732 12.105,5.28866 11.7367,4.89691 11.3683,4.52577 Z"
      />
    </svg>
  )
}

function DrawIcon() {
  return (
    <svg viewBox="0 0 18 19" width="85%" height="85%">
      <path d="M2.92,7V5.84c.81,0,1.75-.28,1.8-1.22H6.14v5.5H4.34V7Zm8.87-2.39L7,13.88H5l4.8-9.26ZM9.85,13.88c-.08-1.54,1.38-2.19,2.57-2.89.33-.17.78-.4.78-.78a.66.66,0,0,0-.68-.7c-.69,0-.94.58-.92,1.16H10a2.17,2.17,0,0,1,.64-1.79,2.74,2.74,0,0,1,1.91-.62C14.1,8.26,15,8.78,15,10c0,1.82-2.66,2.18-2.66,2.5h2.73v1.38Z" />
      {/* White copy shifted up ~0.5px for an embossed look. */}
      <path
        fill="#fff"
        d="M2.92,6.51V5.34c.81,0,1.75-.28,1.8-1.22H6.14v5.5H4.34V6.51Zm8.87-2.39L7,13.38H5l4.8-9.26ZM9.85,13.38c-.08-1.54,1.38-2.19,2.57-2.89.33-.17.78-.4.78-.78a.66.66,0,0,0-.68-.7c-.69,0-.94.58-.92,1.16H10a2.17,2.17,0,0,1,.64-1.79,2.74,2.74,0,0,1,1.91-.62C14.1,7.76,15,8.28,15,9.5c0,1.82-2.66,2.18-2.66,2.5h2.73v1.38Z"
      />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 18 19" width="70%" height="70%">
      <path fill="#fff" d="M4 2.5h1.6v14H4zM6.4 3.2h8.1l-2 3.3 2 3.3H6.4z" />
    </svg>
  )
}

const GAME_END_BADGE_ICONS = { loss: MateIcon, flag: FlagIcon, win: WinnerIcon, draw: DrawIcon }

export function GameEndBadge({
  square,
  label,
  variant,
  boardOrientation,
}: {
  square: string
  label: string
  variant: GameEndVariant
  boardOrientation: 'white' | 'black'
}) {
  const { left, top } = squarePercent(square, boardOrientation)
  const Icon = GAME_END_BADGE_ICONS[variant]
  return (
    <div
      role="img"
      aria-label={label}
      className={`pointer-events-none absolute z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${GAME_END_BADGE_COLORS[variant]}`}
      style={{
        // Straddles the square's top-right corner. Positioned against the
        // outer wrapper, not the clipped board, so back-rank badges aren't cut off.
        left: `${left + 12.5}%`,
        top: `${top}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <Icon />
    </div>
  )
}
