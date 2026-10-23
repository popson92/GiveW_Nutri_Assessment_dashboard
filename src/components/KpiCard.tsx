import { type ReactNode } from 'react'
import clsx from 'clsx'

interface Props {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  color?: 'green' | 'red' | 'amber' | 'blue' | 'default'
}

const colorMap = {
  default: 'text-primary-700',
  green: 'text-green-700',
  red: 'text-red-600',
  amber: 'text-amber-600',
  blue: 'text-blue-700',
}

export default function KpiCard({ label, value, sub, icon, color = 'default' }: Props) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="kpi-label">{label}</p>
          <p className={clsx('kpi-value', colorMap[color])}>{value}</p>
          {sub && <p className="kpi-sub">{sub}</p>}
        </div>
        {icon && <div className="text-gray-400 ml-2 flex-shrink-0">{icon}</div>}
      </div>
    </div>
  )
}
