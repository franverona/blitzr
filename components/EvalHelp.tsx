// Shared "how to read this" glossary for eval/blunder notation — used by
// GameAnalysisPanel's analysis dialog and the /blunders page, so the
// explanation only needs to be written (and kept accurate) once.
export function EvalHelp() {
  return (
    <details className="text-xs text-zinc-500">
      <summary className="cursor-pointer select-none hover:text-zinc-300">How to read this</summary>
      <div className="mt-1.5 flex flex-col gap-1.5 border-l border-zinc-800 pl-3">
        <p>
          <span className="font-medium text-zinc-400">22… a6</span> — move 22, played by Black. A
          plain number (<span className="font-medium text-zinc-400">22.</span>) is White&rsquo;s
          move; the ellipsis (<span className="font-medium text-zinc-400">22…</span>) marks
          Black&rsquo;s reply to it.
        </p>
        <p>
          <span className="font-medium text-zinc-400">+1.4 / -0.8</span> — how far ahead White
          (positive) or Black (negative) is, in a &ldquo;pawns of advantage&rdquo; unit. It blends
          material and position into one number, so +1.4 doesn&rsquo;t mean a literal extra pawn —
          just an edge worth about that much.
        </p>
        <p>
          <span className="font-medium text-zinc-400">M7 / -M3</span> — a forced checkmate in that
          many moves, found no matter how the other side responds. Once mate is found, the pawn
          number stops applying entirely.
        </p>
        <p>
          <span className="font-medium text-zinc-400">Blunder</span> — a move that made the position
          at least 2 pawns worse than the best available move, for whoever just played it. This is
          relative to the best move, not to whether that side was already ahead or behind — a losing
          position can still get worse, and that still counts.
        </p>
        <p>
          <span className="font-medium text-zinc-400">Swing</span> — how many pawns worse a move
          made the position for whoever played it. &ldquo;Avg swing&rdquo; averages that across a
          group of blunders — a way to see whether a category tends to be near-misses or outright
          disasters.
        </p>
        <p>
          <span className="font-medium text-zinc-400">Better was …</span> — what Stockfish would
          have played instead, from the position right before the blunder. The same suggestion is
          drawn as a yellow arrow on the board at whichever position you&rsquo;re currently viewing.
        </p>
      </div>
    </details>
  )
}
