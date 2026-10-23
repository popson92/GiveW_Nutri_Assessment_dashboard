import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  source?: string
}

export default function ChartCard({ title, subtitle, children, className = '', source }: Props) {
  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="card-body">{children}</div>
      {source && (
        <div className="px-5 py-2 border-t border-gray-50 text-[10px] text-gray-400">
          Source: {source}
        </div>
      )}
    </div>
  )
}
