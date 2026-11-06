import { getLocale } from './i18n/locale'
import type { Locale } from './i18n/locale'
import type { Game, MyResult, OpeningFamily, OpeningLine } from './types'

/** Display label for games with no ECO code. */
export function unknownOpeningLabel(locale: Locale = getLocale()): string {
  return locale === 'es' ? 'Apertura desconocida' : 'Unknown opening'
}

interface ScoreAcc {
  games: number
  wins: number
  draws: number
  losses: number
}

function emptyScore(): ScoreAcc {
  return { games: 0, wins: 0, draws: 0, losses: 0 }
}

function addResult(acc: ScoreAcc, result: MyResult): void {
  acc.games++
  if (result === 'win') acc.wins++
  else if (result === 'draw') acc.draws++
  else acc.losses++
}

function score(acc: ScoreAcc): number {
  return acc.games === 0 ? 0 : (acc.wins + acc.draws * 0.5) / acc.games
}

/** The part of an eco name before the move list, e.g. "Sicilian Defense". */
export function ecoFamilyLabel(ecoName: string): string {
  return ecoName.split(':')[0].trim()
}

/**
 * One family label per ECO code: the most common `ecoFamilyLabel()` among `games` with that code.
 * Chess.com and Lichess name the same opening differently ("Closed Sicilian Defense Grand Prix
 * Attack" vs "Sicilian Defense: Closed Variation…"), so labelling by code keeps them one group.
 */
export function openingFamilyLabels(games: Game[]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>()
  for (const game of games) {
    if (!game.ecoCode || !game.ecoName) continue
    const label = ecoFamilyLabel(game.ecoName)
    const byLabel = counts.get(game.ecoCode) ?? new Map<string, number>()
    byLabel.set(label, (byLabel.get(label) ?? 0) + 1)
    counts.set(game.ecoCode, byLabel)
  }
  const labels = new Map<string, string>()
  for (const [code, byLabel] of counts) {
    const [best] = [...byLabel].reduce((a, b) => (b[1] > a[1] ? b : a))
    labels.set(code, best)
  }
  return labels
}

/** A game's family label: its ECO code's in `labels`, else its own name's. */
export function openingFamilyLabel(
  game: Game,
  labels: Map<string, string>,
  locale: Locale = getLocale(),
): string {
  const byCode = game.ecoCode ? labels.get(game.ecoCode) : undefined
  return byCode ?? (game.ecoName ? ecoFamilyLabel(game.ecoName) : unknownOpeningLabel(locale))
}

/** Groups games by 3-char ECO family, with named lines nested underneath. */
export function buildOpeningFamilies(games: Game[], locale: Locale = getLocale()): OpeningFamily[] {
  const families = new Map<
    string,
    {
      overall: ScoreAcc
      white: ScoreAcc
      black: ScoreAcc
      labelCounts: Map<string, number>
      lines: Map<string, { ecoUrl: string | null; acc: ScoreAcc }>
    }
  >()

  for (const game of games) {
    const code = game.ecoCode ?? 'Unknown'
    if (!families.has(code)) {
      families.set(code, {
        overall: emptyScore(),
        white: emptyScore(),
        black: emptyScore(),
        labelCounts: new Map(),
        lines: new Map(),
      })
    }
    const family = families.get(code)!
    addResult(family.overall, game.myResult)
    addResult(game.myColor === 'white' ? family.white : family.black, game.myResult)

    const label = game.ecoName ? ecoFamilyLabel(game.ecoName) : unknownOpeningLabel(locale)
    family.labelCounts.set(label, (family.labelCounts.get(label) ?? 0) + 1)

    const lineKey = game.ecoName ?? 'Unknown'
    if (!family.lines.has(lineKey)) {
      family.lines.set(lineKey, { ecoUrl: game.ecoUrl, acc: emptyScore() })
    }
    addResult(family.lines.get(lineKey)!.acc, game.myResult)
  }

  const result: OpeningFamily[] = []
  for (const [ecoCode, family] of families) {
    let bestLabel = unknownOpeningLabel(locale)
    let bestCount = -1
    for (const [label, count] of family.labelCounts) {
      if (count > bestCount) {
        bestLabel = label
        bestCount = count
      }
    }

    const lines: OpeningLine[] = Array.from(family.lines.entries())
      .map(([ecoName, { ecoUrl, acc }]) => ({
        ecoName,
        ecoUrl,
        games: acc.games,
        wins: acc.wins,
        draws: acc.draws,
        losses: acc.losses,
      }))
      .sort((a, b) => b.games - a.games)

    result.push({
      ecoCode: ecoCode === 'Unknown' ? null : ecoCode,
      label: bestLabel,
      games: family.overall.games,
      wins: family.overall.wins,
      draws: family.overall.draws,
      losses: family.overall.losses,
      whiteGames: family.white.games,
      whiteScore: score(family.white),
      blackGames: family.black.games,
      blackScore: score(family.black),
      lines,
    })
  }

  return result.sort((a, b) => b.games - a.games)
}
