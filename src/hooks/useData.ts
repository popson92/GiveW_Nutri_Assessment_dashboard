import { useState, useEffect, createContext, useContext } from 'react'
import type { Facility, Dhis2Only, LgaSummary, StateSummary, MonthlyTrend, StateFilter } from '../types'

interface DashboardData {
  facilities: Facility[]
  dhis2Only: Dhis2Only[]
  lgaSummary: LgaSummary[]
  stateSummary: StateSummary[]
  monthlyTrends: MonthlyTrend[]
  geojson: GeoJSON.FeatureCollection | null
  loading: boolean
  error: string | null
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}`)
  return res.json()
}

export function useDataLoader(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    facilities: [],
    dhis2Only: [],
    lgaSummary: [],
    stateSummary: [],
    monthlyTrends: [],
    geojson: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    Promise.all([
      fetchJson<Facility[]>('/data/facilities.json'),
      fetchJson<Dhis2Only[]>('/data/dhis2_only.json'),
      fetchJson<LgaSummary[]>('/data/lga_summary.json'),
      fetchJson<StateSummary[]>('/data/state_summary.json'),
      fetchJson<MonthlyTrend[]>('/data/monthly_trends.json'),
      fetchJson<GeoJSON.FeatureCollection>('/geo/kano_kaduna_lga.geojson'),
    ])
      .then(([facilities, dhis2Only, lgaSummary, stateSummary, monthlyTrends, geojson]) => {
        setData({
          facilities,
          dhis2Only,
          lgaSummary,
          stateSummary,
          monthlyTrends,
          geojson,
          loading: false,
          error: null,
        })
      })
      .catch((err) => {
        setData((prev) => ({ ...prev, loading: false, error: err.message }))
      })
  }, [])

  return data
}

interface FilterContextValue {
  stateFilter: StateFilter
  setStateFilter: (s: StateFilter) => void
  lgaFilter: string | null
  setLgaFilter: (s: string | null) => void
}

export const FilterContext = createContext<FilterContextValue>({
  stateFilter: 'Combined',
  setStateFilter: () => {},
  lgaFilter: null,
  setLgaFilter: () => {},
})

export function useFilters() {
  return useContext(FilterContext)
}

export function filterByState<T extends { state: string }>(items: T[], stateFilter: StateFilter): T[] {
  if (stateFilter === 'Combined') return items
  return items.filter((i) => i.state === stateFilter)
}

export function getStateSummary(summaries: StateSummary[], stateFilter: StateFilter): StateSummary | undefined {
  return summaries.find((s) => s.state === stateFilter)
}
