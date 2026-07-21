import type { SanPiece } from '@/lib/san'

// Chess piece SVGs from Wikimedia Commons' "SVG chess pieces" set
// (Chess_{k,q,r,b,n}{l,d}t45.svg — light/dark pieces, transparent
// background), originally by en:User:Cburnett, dual-licensed CC BY-SA 3.0 /
// GFDL / BSD / GPL: https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces
//
// The "dark" pieces are recolored from their original solid black to a mid
// gray — literal black-on-black would be invisible against this app's dark
// background, the same issue the white/black side badge (KnightIcon) hit
// earlier. White highlight details are left as-is either way.
const DARK_GRAY = '#9ca3af'

export function PieceGlyph({
  piece,
  color,
  className,
}: {
  piece: SanPiece
  color: 'white' | 'black'
  className?: string
}) {
  return (
    <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
      {color === 'white' ? WHITE_PATHS[piece] : DARK_PATHS[piece]}
    </svg>
  )
}

const WHITE_PATHS: Record<SanPiece, React.ReactNode> = {
  K: (
    <g
      fill="none"
      fillRule="evenodd"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    >
      <path strokeLinejoin="miter" d="M22.5 11.63V6M20 8h5" />
      <path
        fill="#fff"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
      />
      <path
        fill="#fff"
        d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7"
      />
      <path d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0" />
    </g>
  ),
  Q: (
    <g fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M9,26C17.5,24.5 30,24.5 36,26L38.5,13.5L31,25L30.7,10.9L25.5,24.5L22.5,10L19.5,24.5L14.3,10.9L14,25L6.5,13.5L9,26z" />
      <path d="M9,26C9,28 10.5,28 11.5,30C12.5,31.5 12.5,31 12,33.5C10.5,34.5 11,36 11,36C9.5,37.5 11,38.5 11,38.5C17.5,39.5 27.5,39.5 34,38.5C34,38.5 35.5,37.5 34,36C34,36 34.5,34.5 33,33.5C32.5,31 32.5,31.5 33.5,30C34.5,28 36,28 36,26C27.5,24.5 17.5,24.5 9,26z" />
      <path fill="none" d="M11.5,30C15,29 30,29 33.5,30" />
      <path fill="none" d="M12,33.5C18,32.5 27,32.5 33,33.5" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="14" cy="9" r="2" />
      <circle cx="22.5" cy="8" r="2" />
      <circle cx="31" cy="9" r="2" />
      <circle cx="39" cy="12" r="2" />
    </g>
  ),
  R: (
    <g
      fill="#fff"
      stroke="#000"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(0,0.3)"
    >
      <path strokeLinecap="butt" d="M9,39L36,39L36,36L9,36L9,39z" />
      <path strokeLinecap="butt" d="M12,36L12,32L33,32L33,36L12,36z" />
      <path
        strokeLinecap="butt"
        d="M11,14L11,9L15,9L15,11L20,11L20,9L25,9L25,11L30,11L30,9L34,9L34,14"
      />
      <path d="M34,14L31,17L14,17L11,14" />
      <path strokeLinecap="butt" strokeLinejoin="miter" d="M31,17L31,29.5L14,29.5L14,17" />
      <path d="M31,29.5L32.5,32L12.5,32L14,29.5" />
      <path fill="none" stroke="#000" strokeLinejoin="miter" d="M11,14L34,14" />
    </g>
  ),
  B: (
    <g
      fill="none"
      fillRule="evenodd"
      stroke="#000"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(0,0.6)"
    >
      <g fill="#fff" stroke="#000" strokeLinecap="butt">
        <path d="M9,36C12.39,35.03 19.11,36.43 22.5,34C25.89,36.43 32.61,35.03 36,36C36,36 37.65,36.54 39,38C38.32,38.97 37.35,38.99 36,38.5C32.61,37.53 25.89,38.96 22.5,37.5C19.11,38.96 12.39,37.53 9,38.5C7.65,38.99 6.68,38.97 6,38C7.35,36.54 9,36 9,36z" />
        <path d="M15,32C17.5,34.5 27.5,34.5 30,32C30.5,30.5 30,30 30,30C30,27.5 27.5,26 27.5,26C33,24.5 33.5,14.5 22.5,10.5C11.5,14.5 12,24.5 17.5,26C17.5,26 15,27.5 15,30C15,30 14.5,30.5 15,32z" />
        <path d="M25 8 A 2.5 2.5 0 1 1  20,8 A 2.5 2.5 0 1 1  25 8z" />
      </g>
      <path
        fill="none"
        stroke="#000"
        strokeLinejoin="miter"
        d="M17.5,26L27.5,26M15,30L30,30M22.5,15.5L22.5,20.5M20,18L25,18"
      />
    </g>
  ),
  N: (
    <g transform="translate(0,0.3)">
      <path
        fill="#fff"
        stroke="#000"
        strokeWidth="1.5"
        d="M22,10C32.5,11 38.5,18 38,39L15,39C15,30 25,32.5 23,18"
      />
      <path
        fill="#fff"
        stroke="#000"
        strokeWidth="1.5"
        d="M24,18C24.38,20.91 18.45,25.37 16,27C13,29 13.18,31.34 11,31C9.958,30.06 12.41,27.96 11,28C10,28 11.19,29.23 10,30C9,30 5.997,31 6,26C6,24 12,14 12,14C12,14 13.89,12.1 14,10.5C13.27,9.506 13.5,8.5 13.5,7.5C14.5,6.5 16.5,10 16.5,10L18.5,10C18.5,10 19.28,8.008 21,7C22,7 22,10 22,10"
      />
      <path
        fill="#000"
        stroke="#000"
        strokeWidth="1.5"
        d="M9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5z"
      />
      <path
        fill="#000"
        stroke="#000"
        strokeWidth="1.5"
        transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
        d="M15 15.5 A 0.5 1.5 0 1 1  14,15.5 A 0.5 1.5 0 1 1  15 15.5z"
      />
    </g>
  ),
}

const DARK_PATHS: Record<SanPiece, React.ReactNode> = {
  K: (
    <g
      fill={DARK_GRAY}
      stroke={DARK_GRAY}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    >
      <path fill="none" strokeLinejoin="miter" d="M22.5 11.63V6M20 8h5" />
      <path
        strokeLinecap="butt"
        strokeLinejoin="miter"
        d="M22.5,25C22.5,25 27,17.5 25.5,14.5C25.5,14.5 24.5,12 22.5,12C20.5,12 19.5,14.5 19.5,14.5C18,17.5 22.5,25 22.5,25"
      />
      <path d="M12.5,37C18,40.5 27,40.5 32.5,37L32.5,30C32.5,30 41.5,25.5 38.5,19.5C34.5,13 25,16 22.5,23.5L22.5,27L22.5,23.5C20,16 10.5,13 6.5,19.5C3.5,25.5 12.5,30 12.5,30L12.5,37" />
      <path
        fill="none"
        stroke="#fff"
        d="M32,29.5C32,29.5 40.5,25.5 38.03,19.85C34.15,14 25,18 22.5,24.5L22.5,26.6L22.5,24.5C20,18 10.85,14 6.97,19.85C4.5,25.5 13,29.5 13,29.5"
      />
      <path
        fill="none"
        stroke="#fff"
        d="M12.5,30C18,27 27,27 32.5,30M12.5,33.5C18,30.5 27,30.5 32.5,33.5M12.5,37C18,34 27,34 32.5,37"
      />
    </g>
  ),
  Q: (
    <g
      fill={DARK_GRAY}
      stroke={DARK_GRAY}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        strokeLinecap="butt"
        d="M9,26C17.5,24.5 30,24.5 36,26L38.5,13.5L31,25L30.7,10.9L25.5,24.5L22.5,10L19.5,24.5L14.3,10.9L14,25L6.5,13.5L9,26z"
      />
      <path d="M9,26C9,28 10.5,28 11.5,30C12.5,31.5 12.5,31 12,33.5C10.5,34.5 11,36 11,36C9.5,37.5 11,38.5 11,38.5C17.5,39.5 27.5,39.5 34,38.5C34,38.5 35.5,37.5 34,36C34,36 34.5,34.5 33,33.5C32.5,31 32.5,31.5 33.5,30C34.5,28 36,28 36,26C27.5,24.5 17.5,24.5 9,26z" />
      <path d="M11.5,30C15,29 30,29 33.5,30" />
      <path d="M12,33.5C18,32.5 27,32.5 33,33.5" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="14" cy="9" r="2" />
      <circle cx="22.5" cy="8" r="2" />
      <circle cx="31" cy="9" r="2" />
      <circle cx="39" cy="12" r="2" />
      <path fill="none" stroke={DARK_GRAY} strokeLinecap="butt" d="M11,38.5A35,35 1 0 0 34,38.5" />
      <g fill="none" stroke="#fff">
        <path d="M11,29A35,35 1 0 1 34,29" />
        <path d="M12.5,31.5L32.5,31.5" />
        <path d="M11.5,34.5A35,35 1 0 0 33.5,34.5" />
        <path d="M10.5,37.5A35,35 1 0 0 34.5,37.5" />
      </g>
    </g>
  ),
  R: (
    <g
      fill={DARK_GRAY}
      stroke={DARK_GRAY}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(0,0.3)"
    >
      <path strokeLinecap="butt" d="M9,39L36,39L36,36L9,36L9,39z" />
      <path strokeLinecap="butt" d="M12.5,32L14,29.5L31,29.5L32.5,32L12.5,32z" />
      <path strokeLinecap="butt" d="M12,36L12,32L33,32L33,36L12,36z" />
      <path
        strokeLinecap="butt"
        strokeLinejoin="miter"
        d="M14,29.5L14,16.5L31,16.5L31,29.5L14,29.5z"
      />
      <path strokeLinecap="butt" d="M14,16.5L11,14L34,14L31,16.5L14,16.5z" />
      <path
        strokeLinecap="butt"
        d="M11,14L11,9L15,9L15,11L20,11L20,9L25,9L25,11L30,11L30,9L34,9L34,14L11,14z"
      />
      <path fill="none" stroke="#fff" strokeWidth="1" strokeLinejoin="miter" d="M12,35.5L33,35.5" />
      <path fill="none" stroke="#fff" strokeWidth="1" strokeLinejoin="miter" d="M13,31.5L32,31.5" />
      <path fill="none" stroke="#fff" strokeWidth="1" strokeLinejoin="miter" d="M14,29.5L31,29.5" />
      <path fill="none" stroke="#fff" strokeWidth="1" strokeLinejoin="miter" d="M14,16.5L31,16.5" />
      <path fill="none" stroke="#fff" strokeWidth="1" strokeLinejoin="miter" d="M11,14L34,14" />
    </g>
  ),
  B: (
    <g
      fill="none"
      fillRule="evenodd"
      stroke={DARK_GRAY}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(0,0.6)"
    >
      <g fill={DARK_GRAY} stroke={DARK_GRAY} strokeLinecap="butt">
        <path d="M9,36C12.39,35.03 19.11,36.43 22.5,34C25.89,36.43 32.61,35.03 36,36C36,36 37.65,36.54 39,38C38.32,38.97 37.35,38.99 36,38.5C32.61,37.53 25.89,38.96 22.5,37.5C19.11,38.96 12.39,37.53 9,38.5C7.65,38.99 6.68,38.97 6,38C7.35,36.54 9,36 9,36z" />
        <path d="M15,32C17.5,34.5 27.5,34.5 30,32C30.5,30.5 30,30 30,30C30,27.5 27.5,26 27.5,26C33,24.5 33.5,14.5 22.5,10.5C11.5,14.5 12,24.5 17.5,26C17.5,26 15,27.5 15,30C15,30 14.5,30.5 15,32z" />
        <path d="M25 8 A 2.5 2.5 0 1 1  20,8 A 2.5 2.5 0 1 1  25 8z" />
      </g>
      <path
        fill="none"
        stroke="#fff"
        strokeLinejoin="miter"
        d="M17.5,26L27.5,26M15,30L30,30M22.5,15.5L22.5,20.5M20,18L25,18"
      />
    </g>
  ),
  N: (
    <g transform="translate(0,0.3)">
      <path
        fill={DARK_GRAY}
        stroke={DARK_GRAY}
        strokeWidth="1.5"
        d="M22,10C32.5,11 38.5,18 38,39L15,39C15,30 25,32.5 23,18"
      />
      <path
        fill={DARK_GRAY}
        stroke={DARK_GRAY}
        strokeWidth="1.5"
        d="M24,18C24.38,20.91 18.45,25.37 16,27C13,29 13.18,31.34 11,31C9.958,30.06 12.41,27.96 11,28C10,28 11.19,29.23 10,30C9,30 5.997,31 6,26C6,24 12,14 12,14C12,14 13.89,12.1 14,10.5C13.27,9.506 13.5,8.5 13.5,7.5C14.5,6.5 16.5,10 16.5,10L18.5,10C18.5,10 19.28,8.008 21,7C22,7 22,10 22,10"
      />
      <path
        fill="#fff"
        stroke="#fff"
        strokeWidth="1.5"
        d="M9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5z"
      />
      <path
        fill="#fff"
        stroke="#fff"
        strokeWidth="1.5"
        transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
        d="M15 15.5 A 0.5 1.5 0 1 1  14,15.5 A 0.5 1.5 0 1 1  15 15.5z"
      />
      <path
        fill="#fff"
        stroke="none"
        d="M24.55,10.4L24.1,11.85L24.6,12C27.75,13 30.25,14.49 32.5,18.75C34.75,23.01 35.75,29.06 35.25,39L35.2,39.5L37.45,39.5L37.5,39C38,28.94 36.62,22.15 34.25,17.66C31.88,13.17 28.46,11.02 25.06,10.5L24.55,10.4z"
      />
    </g>
  ),
}
