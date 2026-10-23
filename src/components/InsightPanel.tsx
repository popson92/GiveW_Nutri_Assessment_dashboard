import { Lightbulb } from 'lucide-react'

interface Props {
  insights: string[]
}

export default function InsightPanel({ insights }: Props) {
  if (insights.length === 0) return null
  return (
    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb size={16} className="text-primary-600" />
        <span className="text-xs font-semibold uppercase tracking-wider text-primary-700">Key Insights</span>
      </div>
      <ul className="space-y-1.5">
        {insights.map((ins, i) => (
          <li key={i} className="text-sm text-primary-900 leading-relaxed flex gap-2">
            <span className="text-primary-400 mt-1 flex-shrink-0">•</span>
            <span>{ins}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
