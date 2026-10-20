import { blunderSeverity } from '@/lib/analysis'
import { getStrings } from '@/lib/i18n/strings'
import { Badge } from './Badge'

export function BlunderSeverityBadge({ winDrop }: { winDrop: number }) {
  const s = getStrings()
  const severity = blunderSeverity(winDrop)
  return (
    <abbr title={s.blunderBadge.titles[severity]} className="no-underline">
      <Badge tone={severity === 'blunder' ? 'rose' : 'amber'} shape="tag">
        {s.blunderBadge.labels[severity]}
      </Badge>
    </abbr>
  )
}
