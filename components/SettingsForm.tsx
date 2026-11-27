'use client'

import { useState } from 'react'
import { Chessboard, defaultPieces } from 'react-chessboard'
import { BackupButton } from './BackupButton'
import { BoardCoordinates } from './BoardCoordinates'
import { SESSION_SIZES, type SessionSize } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { ANALYSIS_STRENGTHS, type AnalysisStrength } from '@/lib/stockfish/analyze'
import {
  BOARD_COLOR_PRESETS,
  MOVE_NOTATIONS,
  PIECE_SETS,
  PLAY_SPEEDS,
  type PlaySpeed,
  REVEAL_ARROW_COLOR,
  TRAINING_ORIENTATIONS,
} from '@/lib/theme'
import { EvalBar } from './EvalBar'
import { playMoveSound, useSettings } from './SettingsProvider'
import { Card, SectionLabel } from './Card'
import { piecesFor } from './pieceSets'
import { Tabs } from './Tabs'

// Static preview with an obvious engine move (Ng5) for the hide-hints toggle.
const PREVIEW_FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
const PREVIEW_EVAL = { cp: 30, mate: null, bestMove: null }

const SECTIONS = ['appearance', 'playback', 'analysis', 'training', 'data'] as const
type Section = (typeof SECTIONS)[number]

const ROW_PAD = 'py-4 text-sm first:pt-0 last:pb-0'
const ROW_CLASS = `flex flex-col gap-2 ${ROW_PAD}`
const HINT_CLASS = 'text-xs text-zinc-600 dark:text-zinc-500'

export function SettingsForm({ initialSection }: { initialSection?: string }) {
  const s = getStrings()
  const settings = useSettings()
  const [section, setSection] = useState<Section>(
    SECTIONS.find((id) => id === initialSection) ?? 'appearance',
  )

  function selectSection(id: Section) {
    setSection(id)
    // Next syncs replaceState with its router, so this doesn't re-render the server page.
    window.history.replaceState(null, '', `?tab=${id}`)
  }
  const showPreview = section === 'appearance' || section === 'analysis'

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <Tabs
        tabs={SECTIONS.map((id) => ({ id, label: s.settings.sections[id] }))}
        selected={section}
        onSelect={selectSection}
        label={s.settings.sectionsLabel}
        orientation="vertical"
        panelClassName="flex min-w-0 flex-1 flex-col gap-6 xl:flex-row xl:items-start"
      >
        <Card
          title={s.settings.sections[section]}
          className={`w-full ${showPreview ? 'max-w-lg' : 'max-w-xl'}`}
        >
          <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {section === 'appearance' && (
              <>
                <Toggle
                  label={s.settings.darkTheme}
                  checked={settings.theme === 'dark'}
                  onChange={() => settings.setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
                />
                <div className={ROW_CLASS}>
                  <span>{s.settings.boardColors}</span>
                  <div className="flex flex-wrap gap-2">
                    {BOARD_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => settings.setBoardColorPreset(preset.id)}
                        aria-pressed={settings.presetId === preset.id}
                        className="flex w-14 flex-col items-center gap-1 text-center text-xs"
                      >
                        <span
                          className={`grid size-14 grid-cols-2 overflow-hidden rounded-md border-2 ${
                            settings.presetId === preset.id
                              ? 'border-accent'
                              : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          {[preset.light, preset.dark, preset.dark, preset.light].map(
                            (color, i) => (
                              <span key={i} style={{ backgroundColor: color }} />
                            ),
                          )}
                        </span>
                        {s.settings.presets[preset.id]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={ROW_CLASS}>
                  <span>{s.settings.pieceSet}</span>
                  <div className="flex flex-wrap gap-2">
                    {PIECE_SETS.map((set) => {
                      const pieces = piecesFor(set) ?? defaultPieces
                      const WhiteKnight = pieces.wN
                      const BlackKnight = pieces.bN
                      return (
                        <button
                          key={set}
                          type="button"
                          onClick={() => settings.setPieceSet(set)}
                          aria-pressed={settings.pieceSet === set}
                          className="flex w-14 flex-col items-center gap-1 text-center text-xs"
                        >
                          <span
                            className={`grid size-14 grid-cols-2 items-center overflow-hidden rounded-md border-2 ${
                              settings.pieceSet === set
                                ? 'border-accent'
                                : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <span
                              className="flex h-full items-center"
                              style={{ backgroundColor: settings.dark }}
                            >
                              <WhiteKnight />
                            </span>
                            <span
                              className="flex h-full items-center"
                              style={{ backgroundColor: settings.light }}
                            >
                              <BlackKnight />
                            </span>
                          </span>
                          {set === 'default'
                            ? s.settings.pieceSetDefault
                            : set[0].toUpperCase() + set.slice(1)}
                        </button>
                      )
                    })}
                  </div>
                  <p className={HINT_CLASS}>{s.settings.pieceSetCredit}</p>
                </div>
                <Toggle
                  label={s.settings.showCoordinates}
                  checked={settings.showCoordinates}
                  onChange={() => settings.setShowCoordinates(!settings.showCoordinates)}
                />
                <SettingRow label={s.settings.moveNotation}>
                  <Segmented
                    options={MOVE_NOTATIONS}
                    value={settings.moveNotation}
                    onChange={settings.setMoveNotation}
                    label={(notation) => s.settings.moveNotations[notation]}
                  />
                </SettingRow>
              </>
            )}

            {section === 'playback' && (
              <>
                <Toggle
                  label={s.settings.moveSounds}
                  hint={s.settings.moveSoundsCredit}
                  checked={settings.moveSounds}
                  onChange={() => {
                    // Nothing moves here, so play a sample sound.
                    if (!settings.moveSounds) playMoveSound('move-self')
                    settings.setMoveSounds(!settings.moveSounds)
                  }}
                />
                <SettingRow label={s.settings.playSpeed}>
                  <Segmented
                    options={Object.keys(PLAY_SPEEDS) as PlaySpeed[]}
                    value={settings.playSpeed}
                    onChange={settings.setPlaySpeed}
                    label={(speed) => s.settings.playSpeeds[speed]}
                    title={(speed) => s.settings.playSpeedTitle(PLAY_SPEEDS[speed])}
                  />
                </SettingRow>
              </>
            )}

            {section === 'analysis' && (
              <>
                <SettingRow
                  label={s.settings.analysisStrength}
                  hint={s.settings.analysisStrengthHint}
                  stacked
                >
                  <Segmented
                    options={Object.keys(ANALYSIS_STRENGTHS) as AnalysisStrength[]}
                    value={settings.analysisStrength}
                    onChange={settings.setAnalysisStrength}
                    label={(strength) => s.settings.analysisStrengths[strength]}
                    title={(strength) => `${ANALYSIS_STRENGTHS[strength]}ms`}
                  />
                </SettingRow>
                <Toggle
                  label={s.settings.hideEngineHints}
                  hint={s.settings.hideEngineHintsHint}
                  checked={settings.hideEngineHints}
                  onChange={() => settings.setHideEngineHints(!settings.hideEngineHints)}
                />
              </>
            )}

            {section === 'training' && (
              <>
                <SettingRow label={s.settings.trainingOrientation} stacked>
                  <Segmented
                    options={TRAINING_ORIENTATIONS}
                    value={settings.trainingOrientation}
                    onChange={settings.setTrainingOrientation}
                    label={(orientation) => s.settings.trainingOrientations[orientation]}
                  />
                </SettingRow>
                <SettingRow
                  label={s.settings.drillSessionSize}
                  hint={s.settings.drillSessionSizeHint}
                >
                  <Segmented
                    options={SESSION_SIZES.map(String)}
                    value={String(settings.drillSessionSize)}
                    onChange={(size) => settings.setDrillSessionSize(Number(size) as SessionSize)}
                    label={(size) => size}
                  />
                </SettingRow>
              </>
            )}

            {section === 'data' && (
              <div className={ROW_CLASS}>
                <BackupButton />
                <p className={HINT_CLASS}>{s.settings.backupHint}</p>
                <p className={HINT_CLASS}>{s.settings.backupRestoreHint}</p>
              </div>
            )}
          </div>
        </Card>

        {showPreview && (
          <div className="flex w-full max-w-sm shrink-0 flex-col gap-2">
            <SectionLabel>{s.settings.preview}</SectionLabel>
            <div className="flex items-stretch gap-2">
              {!settings.hideEngineHints && (
                <EvalBar
                  evaluation={PREVIEW_EVAL}
                  boardOrientation="white"
                  className={settings.showCoordinates ? 'mb-7' : ''}
                />
              )}
              <BoardCoordinates show={settings.showCoordinates} className="w-full min-w-0">
                <div className="w-full overflow-hidden rounded">
                  <Chessboard
                    options={{
                      id: 'settings-preview',
                      position: PREVIEW_FEN,
                      allowDragging: false,
                      showNotation: false,
                      darkSquareStyle: { backgroundColor: settings.dark },
                      lightSquareStyle: { backgroundColor: settings.light },
                      pieces: settings.pieces,
                      arrows: settings.hideEngineHints
                        ? []
                        : [{ startSquare: 'f3', endSquare: 'g5', color: REVEAL_ARROW_COLOR }],
                    }}
                  />
                </div>
              </BoardCoordinates>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  )
}

/**
 * Label and optional hint on the left, the control on the right (stacked when narrow).
 * `stacked` always puts the control below, full width: for long labels or wide controls.
 */
function SettingRow({
  label,
  hint,
  stacked = false,
  children,
}: {
  label: string
  hint?: string
  stacked?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={
        stacked ? ROW_CLASS : `${ROW_CLASS} sm:flex-row sm:items-center sm:justify-between sm:gap-6`
      }
    >
      <div className="flex flex-col gap-0.5">
        <span>{label}</span>
        {hint && <p className={HINT_CLASS}>{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className={`flex items-center justify-between gap-6 ${ROW_PAD}`}>
      <span className="flex flex-col gap-0.5">
        {label}
        {hint && <span className={HINT_CLASS}>{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <span className="peer-checked:bg-accent h-6 w-11 rounded-full bg-zinc-300 transition-colors dark:bg-zinc-700" />
        <span className="absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  title,
}: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  label: (option: T) => string
  title?: (option: T) => string
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          title={title?.(option)}
          className={`flex-1 px-3 py-1 whitespace-nowrap ${
            value === option ? 'bg-accent text-white' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'
          }`}
        >
          {label(option)}
        </button>
      ))}
    </div>
  )
}
