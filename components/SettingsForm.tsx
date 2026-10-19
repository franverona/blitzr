'use client'

import { Chessboard } from 'react-chessboard'
import { BoardCoordinates } from './BoardCoordinates'
import { SESSION_SIZES } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { ANALYSIS_STRENGTHS, type AnalysisStrength } from '@/lib/stockfish/analyze'
import { BOARD_COLOR_PRESETS, REVEAL_ARROW_COLOR } from '@/lib/theme'
import { EvalBar } from './EvalBar'
import { playMoveSound, useSettings } from './SettingsProvider'

// Static preview with an obvious engine move (Ng5) for the hide-hints toggle.
const PREVIEW_FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
const PREVIEW_EVAL = { cp: 30, mate: null, bestMove: null }

export function SettingsForm() {
  const s = getStrings()
  const settings = useSettings()

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Section title={s.settings.sections.appearance}>
          <Toggle
            label={s.settings.darkTheme}
            checked={settings.theme === 'dark'}
            onChange={() => settings.setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
          />
        </Section>

        <Section title={s.settings.sections.board}>
          <div className="flex flex-col gap-2 text-sm">
            <span>{s.settings.boardColors}</span>
            <div className="flex flex-wrap gap-2">
              {BOARD_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => settings.setBoardColorPreset(preset.id)}
                  aria-label={s.settings.presets[preset.id]}
                  title={s.settings.presets[preset.id]}
                  className={`size-8 shrink-0 overflow-hidden rounded-full border-2 ${
                    settings.presetId === preset.id ? 'border-accent' : 'border-transparent'
                  }`}
                >
                  <span
                    className="block h-full w-full"
                    style={{
                      background: `linear-gradient(135deg, ${preset.light} 50%, ${preset.dark} 50%)`,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
          <Toggle
            label={s.settings.showCoordinates}
            checked={settings.showCoordinates}
            onChange={() => settings.setShowCoordinates(!settings.showCoordinates)}
          />
          <div className="flex flex-col gap-1">
            <Toggle
              label={s.settings.moveSounds}
              checked={settings.moveSounds}
              onChange={() => {
                // The preview board never moves, so play a sample sound.
                if (!settings.moveSounds) playMoveSound('move-self')
                settings.setMoveSounds(!settings.moveSounds)
              }}
            />
            <p className="text-xs text-zinc-500">{s.settings.moveSoundsCredit}</p>
          </div>
        </Section>

        <Section title={s.settings.sections.analysis}>
          <div className="flex flex-col gap-2 text-sm">
            <span>{s.settings.analysisStrength}</span>
            <div className="flex overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700">
              {(Object.keys(ANALYSIS_STRENGTHS) as AnalysisStrength[]).map((strength) => (
                <button
                  key={strength}
                  type="button"
                  onClick={() => settings.setAnalysisStrength(strength)}
                  aria-pressed={settings.analysisStrength === strength}
                  title={`${ANALYSIS_STRENGTHS[strength]}ms`}
                  className={`flex-1 px-2 py-1 ${
                    settings.analysisStrength === strength
                      ? 'bg-accent text-white'
                      : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {s.settings.analysisStrengths[strength]}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">{s.settings.analysisStrengthHint}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Toggle
              label={s.settings.hideEngineHints}
              checked={settings.hideEngineHints}
              onChange={() => settings.setHideEngineHints(!settings.hideEngineHints)}
            />
            <p className="text-xs text-zinc-500">{s.settings.hideEngineHintsHint}</p>
          </div>
        </Section>

        <Section title={s.settings.sections.training}>
          <div className="flex flex-col gap-2 text-sm">
            <span>{s.settings.drillSessionSize}</span>
            <div className="flex overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700">
              {SESSION_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => settings.setDrillSessionSize(size)}
                  aria-pressed={settings.drillSessionSize === size}
                  className={`flex-1 px-2 py-1 tabular-nums ${
                    settings.drillSessionSize === size
                      ? 'bg-accent text-white'
                      : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">{s.settings.drillSessionSizeHint}</p>
          </div>
        </Section>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2 lg:sticky lg:top-0">
        <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          {s.settings.preview}
        </span>
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
                  arrows: settings.hideEngineHints
                    ? []
                    : [{ startSquare: 'f3', endSquare: 'g5', color: REVEAL_ARROW_COLOR }],
                }}
              />
            </div>
          </BoardCoordinates>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </div>
    </section>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm">
      {label}
      <span className="relative inline-flex shrink-0 items-center">
        <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <span className="peer-checked:bg-accent h-6 w-11 rounded-full bg-zinc-300 transition-colors dark:bg-zinc-700" />
        <span className="absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  )
}
