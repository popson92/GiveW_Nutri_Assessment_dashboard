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
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryLighter: '#93c5fd',
  accent: '#f97316',
  accentLight: '#fdba74',
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
  kaduna: '#2563eb',
  kano: '#0d9488',
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
