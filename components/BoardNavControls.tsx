'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { findBlunders } from '@/lib/analysis'
import { whiteToMove } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { BOARD_ANIMATION_DURATION_MS, PLAY_SPEEDS } from '@/lib/theme'
import { useSettings } from './SettingsProvider'
import { navButtonClass } from './styles'
import { useBoardContext } from './BoardContext'

export function BoardNavControls() {
  const {
    ply,
    setPly,
    lastPly,
    movesSan,
    positions,
    evals,
    myColor,
    exploring,
    explorePath,
    explorePly,
    setExplorePly,
    exitExploring,
    setBoardOrientation,
  } = useBoardContext()
  const s = getStrings()
  const { playSpeed } = useSettings()
  const [isPlaying, setIsPlaying] = useState(false)
  // Moving a piece mid-play enters explore mode, where Play is disabled and can't be paused.
  if (exploring && isPlaying) setIsPlaying(false)

  // Refs let the interval/keydown callbacks read fresh values without
  // re-subscribing, and keep setPly out of setIsPlaying's updater (React warns
  // about updating another component's state during render).
  const plyRef = useRef(ply)
  const isPlayingRef = useRef(isPlaying)
  useEffect(() => {
    plyRef.current = ply
    isPlayingRef.current = isPlaying
  })

  // While exploring, nav steps through the explore path instead.
  const displayPly = exploring ? explorePly : ply
  const displayLastPly = exploring ? explorePath.length : lastPly

  const goToStart = useCallback(() => {
    setIsPlaying(false)
    if (exploring) setExplorePly(0)
    else setPly(0)
  }, [setPly, exploring, setExplorePly])
  const goToPrevious = useCallback(() => {
    setIsPlaying(false)
    if (exploring) setExplorePly((p) => Math.max(0, p - 1))
    else setPly((p) => Math.max(0, p - 1))
  }, [setPly, exploring, setExplorePly])
  const goToNext = useCallback(() => {
    setIsPlaying(false)
    if (exploring) setExplorePly((p) => Math.min(explorePath.length, p + 1))
    else setPly((p) => Math.min(lastPly, p + 1))
  }, [setPly, lastPly, exploring, setExplorePly, explorePath.length])
  const goToEnd = useCallback(() => {
    setIsPlaying(false)
    if (exploring) setExplorePly(explorePath.length)
    else setPly(lastPly)
  }, [setPly, lastPly, exploring, setExplorePly, explorePath.length])
  // Auto-play stops on blunders, so it only applies to the recorded game.
  const togglePlaying = useCallback(() => {
    if (exploring) return
    if (isPlayingRef.current) {
      setIsPlaying(false)
      return
    }
    if (plyRef.current >= lastPly) setPly(0)
    setIsPlaying(true)
  }, [lastPly, setPly, exploring])

  // ←/→ step, Home/↑/0 and End/↓ jump, Space plays/pauses, F flips, Esc
  // leaves explore mode.
  const lastNavAtRef = useRef(0)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Browser/OS shortcuts win: Cmd+0 resets zoom, Cmd/Alt+← is Back.
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLElement) {
        if (e.target.isContentEditable || e.target.closest('input, select, textarea')) return
        // Dialogs block shortcuts unless they opt in with data-board-shortcuts.
        const dialog = e.target.closest('dialog')
        if (dialog && !dialog.hasAttribute('data-board-shortcuts')) return
      }
      // A focused button already handles Space natively; avoid toggling twice.
      if (e.key === ' ' && e.target instanceof HTMLElement && e.target.tagName === 'BUTTON') {
        return
      }
      if (e.key === ' ') {
        e.preventDefault()
        togglePlaying()
        return
      }
      if (e.key === '0' || e.key === 'Home' || e.key === 'ArrowUp') {
        e.preventDefault()
        goToStart()
        return
      }
      if (e.key === 'End' || e.key === 'ArrowDown') {
        e.preventDefault()
        goToEnd()
        return
      }
      if (e.key === 'Escape') {
        if (exploring) exitExploring()
        return
      }
      if (e.key.toLowerCase() === 'f') {
        setBoardOrientation((o) => (o === 'white' ? 'black' : 'white'))
        return
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      // Throttle to the animation duration so a held key doesn't cut slides
      // off mid-flight.
      const now = Date.now()
      if (now - lastNavAtRef.current < BOARD_ANIMATION_DURATION_MS) return
      lastNavAtRef.current = now
      if (e.key === 'ArrowLeft') goToPrevious()
      else goToNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    goToPrevious,
    goToNext,
    goToStart,
    goToEnd,
    togglePlaying,
    setBoardOrientation,
    exploring,
    exitExploring,
  ])

  // Auto-play stops on the user's own blunders.
  const blunderPlies = useMemo(
    () =>
      evals
        ? new Set(
            findBlunders(evals, movesSan, positions[0])
              .filter((b) => whiteToMove(b.ply, positions[0]) === (myColor === 'white'))
              .map((b) => b.ply),
          )
        : null,
    [evals, movesSan, positions, myColor],
  )

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      const next = Math.min(plyRef.current + 1, lastPly)
      setPly(next)
      if (next === lastPly || blunderPlies?.has(next)) setIsPlaying(false)
    }, PLAY_SPEEDS[playSpeed])
    return () => clearInterval(interval)
  }, [isPlaying, lastPly, blunderPlies, setPly, playSpeed])

  return (
    <div className="flex items-center gap-2">
      <NavButton onClick={goToStart} disabled={displayPly === 0} label={s.board.navLabels.start}>
        <NavIcon d="M7 5v14M18 6l-6 6 6 6" />
      </NavButton>
      <NavButton
        onClick={goToPrevious}
        disabled={displayPly === 0}
        label={s.board.navLabels.previous}
      >
        <NavIcon d="M15 6l-6 6 6 6" />
      </NavButton>
      <NavButton
        onClick={togglePlaying}
        disabled={lastPly === 0 || exploring}
        label={isPlaying ? s.board.navLabels.pause : s.board.navLabels.play}
        active={isPlaying}
      >
        {isPlaying ? (
          <NavIcon d="M9 5v14M15 5v14" />
        ) : (
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </NavButton>
      <NavButton
        onClick={goToNext}
        disabled={displayPly === displayLastPly}
        label={s.board.navLabels.next}
      >
        <NavIcon d="M9 6l6 6-6 6" />
      </NavButton>
      <NavButton
        onClick={goToEnd}
        disabled={displayPly === displayLastPly}
        label={s.board.navLabels.end}
      >
        <NavIcon d="M17 5v14M6 6l6 6-6 6" />
      </NavButton>
    </div>
  )
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  )
}

function NavButton({
  onClick,
  disabled,
  label,
  active = false,
  children,
}: {
  onClick: () => void
  disabled: boolean
  label: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`min-w-14 ${navButtonClass(active)}`}
    >
      {children}
    </button>
  )
}
