import type { Game, MyResult, OpeningFamily, OpeningLine } from './types'

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
 * Groups games by 3-char ECO code (family), with each family's distinct
 * named lines nested underneath. Games with no ECO code (very short games)
 * are bucketed under a null-coded "Unknown" family.
 */
export function buildOpeningFamilies(games: Game[]): OpeningFamily[] {
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

    const label = game.ecoName ? ecoFamilyLabel(game.ecoName) : 'Unknown opening'
    family.labelCounts.set(label, (family.labelCounts.get(label) ?? 0) + 1)

    const lineKey = game.ecoName ?? 'Unknown'
    if (!family.lines.has(lineKey)) {
      family.lines.set(lineKey, { ecoUrl: game.ecoUrl, acc: emptyScore() })
    }
    addResult(family.lines.get(lineKey)!.acc, game.myResult)
  }

  const result: OpeningFamily[] = []
  for (const [ecoCode, family] of families) {
    let bestLabel = 'Unknown opening'
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
