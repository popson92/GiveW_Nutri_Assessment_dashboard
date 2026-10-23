export function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US')
}

export function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '—'
  return `${n.toFixed(decimals)}%`
}

export function fmtRate(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n.toFixed(1)}%`
}

export function abbreviate(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export const COLORS = {
  primary: '#276e51',
  primaryLight: '#368966',
  primaryLighter: '#85c3a6',
  accent: '#ff7d11',
  accentLight: '#ffc070',
  blue: '#3b82f6',
  blueLight: '#93c5fd',
  teal: '#0d9488',
  tealLight: '#5eead4',
  red: '#ef4444',
  redLight: '#fca5a5',
  amber: '#f59e0b',
  amberLight: '#fde68a',
  gray: '#6b7280',
  grayLight: '#d1d5db',
  kaduna: '#276e51',
  kano: '#3b82f6',
  functioning: '#22c55e',
  moderate: '#f59e0b',
  needsReconciliation: '#f97316',
  qualityConcern: '#ef4444',
  insufficientData: '#9ca3af',
}

export const STATE_COLORS: Record<string, string> = {
  Kaduna: COLORS.kaduna,
  Kano: COLORS.kano,
}

export const OPPORTUNITY_COLORS: Record<string, string> = {
  Functioning: COLORS.functioning,
  Moderate: COLORS.moderate,
  'Needs Reconciliation': COLORS.needsReconciliation,
  'Quality Concern': COLORS.qualityConcern,
  'Insufficient Data': COLORS.insufficientData,
}

export const SPHERE = {
  cureMin: 75,
  defaultMax: 15,
  deathMax: 10,
}
