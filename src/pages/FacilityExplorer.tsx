import { useMemo, useState } from 'react'
import { Download, Search as SearchIcon, X } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import { useFilters, filterByState } from '../hooks/useData'
import { fmtNum, fmtPct, OPPORTUNITY_COLORS } from '../utils/format'
import type { Facility } from '../types'

interface Props {
  data: { facilities: Facility[] }
}

export default function FacilityExplorer({ data }: Props) {
  const { stateFilter } = useFilters()
  const allFacs = filterByState(data.facilities, stateFilter)

  const [search, setSearch] = useState('')
  const [lgaFilter, setLocalLgaFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [matchFilter, setMatchFilter] = useState('')
  const [samplingFilter, setSamplingFilter] = useState('')
  const [sortCol, setSortCol] = useState<string>('imam_admissions')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Facility | null>(null)
  const pageSize = 50

  const lgas = useMemo(() => [...new Set(allFacs.map(f => f.lga_normalized))].sort(), [allFacs])
  const classes = useMemo(() => [...new Set(allFacs.map(f => f.opportunity_class))].sort(), [allFacs])

  const filtered = useMemo(() => {
    let result = allFacs
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(f =>
        f.facility_name.toLowerCase().includes(q) ||
        f.lga_normalized.toLowerCase().includes(q) ||
        f.ward.toLowerCase().includes(q)
      )
    }
    if (lgaFilter) result = result.filter(f => f.lga_normalized === lgaFilter)
    if (classFilter) result = result.filter(f => f.opportunity_class === classFilter)
    if (matchFilter) result = result.filter(f => f.match_status === matchFilter)
    if (samplingFilter) result = result.filter(f => f.sampling_status === samplingFilter)

    result.sort((a, b) => {
      const av = (a as any)[sortCol]
      const bv = (b as any)[sortCol]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [allFacs, search, lgaFilter, classFilter, matchFilter, samplingFilter, sortCol, sortDir])

  const paged = useMemo(() => filtered.slice(page * pageSize, (page + 1) * pageSize), [filtered, page])
  const totalPages = Math.ceil(filtered.length / pageSize)

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const exportCsv = () => {
    const headers = ['State', 'LGA', 'Ward', 'Facility', 'IMAM Admissions', 'DHIS2 Admitted', 'Gap', 'Gap %', 'Cure Rate', 'Default Rate', 'CFR', 'RUTF Utilised', 'Match Status', 'Classification', 'Sampling']
    const rows = filtered.map(f => [
      f.state, f.lga_normalized, f.ward, f.facility_name,
      f.imam_admissions, f.dhis2_sam_admitted, f.imam_dhis2_diff ?? '', f.imam_dhis2_gap_pct ?? '',
      f.cure_rate ?? '', f.default_rate ?? '', f.death_rate ?? '', f.rutf_utilized_sachets,
      f.match_status, f.opportunity_class, f.sampling_status,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sam_facilities_${stateFilter.toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetFilters = () => {
    setSearch(''); setLocalLgaFilter(''); setClassFilter(''); setMatchFilter(''); setSamplingFilter(''); setPage(0)
  }

  const SortIcon = ({ col }: { col: string }) => (
    <span className="ml-1 text-gray-400">{sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
  )

  return (
    <div>
      <SectionHeader
        title="Facility Explorer"
        description="Searchable, filterable database of all IMAM-designated facilities. Click a row to view facility details."
        badge={`${stateFilter} — ${filtered.length} facilities`}
      />

      {/* Filters */}
      <div className="card mb-4">
        <div className="p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500 block mb-1">Search</label>
            <div className="relative">
              <SearchIcon size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
                placeholder="Facility, LGA, or ward..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">LGA</label>
            <select value={lgaFilter} onChange={e => { setLocalLgaFilter(e.target.value); setPage(0) }}
              className="text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white">
              <option value="">All LGAs</option>
              {lgas.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Classification</label>
            <select value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(0) }}
              className="text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white">
              <option value="">All</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Match Status</label>
            <select value={matchFilter} onChange={e => { setMatchFilter(e.target.value); setPage(0) }}
              className="text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white">
              <option value="">All</option>
              <option value="matched">Matched</option>
              <option value="unmatched">Unmatched</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Sampling</label>
            <select value={samplingFilter} onChange={e => { setSamplingFilter(e.target.value); setPage(0) }}
              className="text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white">
              <option value="">All</option>
              <option value="certainty">Certainty</option>
              <option value="not_selected">Not Selected</option>
            </select>
          </div>
          <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-2 flex items-center gap-1">
            <X size={12} /> Reset
          </button>
          <button onClick={exportCsv} className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {[
                { key: 'state', label: 'State' },
                { key: 'lga_normalized', label: 'LGA' },
                { key: 'facility_name', label: 'Facility' },
                { key: 'imam_admissions', label: 'IMAM Adm.' },
                { key: 'dhis2_sam_admitted', label: 'DHIS2 Adm.' },
                { key: 'imam_dhis2_diff', label: 'Gap' },
                { key: 'imam_dhis2_gap_pct', label: 'Gap %' },
                { key: 'cure_rate', label: 'Cure %' },
                { key: 'default_rate', label: 'Default %' },
                { key: 'opportunity_class', label: 'Class' },
                { key: 'sampling_status', label: 'Sampling' },
              ].map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)}
                  className={`cursor-pointer select-none ${['imam_admissions', 'dhis2_sam_admitted', 'imam_dhis2_diff', 'imam_dhis2_gap_pct', 'cure_rate', 'default_rate'].includes(col.key) ? 'text-right' : ''}`}>
                  {col.label}<SortIcon col={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((f, i) => (
              <tr key={i} onClick={() => setSelected(f)} className="cursor-pointer">
                <td>{f.state}</td>
                <td>{f.lga_normalized}</td>
                <td className="font-medium max-w-[200px] truncate">{f.facility_name}</td>
                <td className="text-right">{fmtNum(f.imam_admissions)}</td>
                <td className="text-right">{fmtNum(f.dhis2_sam_admitted)}</td>
                <td className="text-right">
                  <span className={(f.imam_dhis2_diff || 0) > 0 ? 'text-amber-600' : (f.imam_dhis2_diff || 0) < 0 ? 'text-blue-600' : ''}>
                    {f.imam_dhis2_diff != null ? fmtNum(f.imam_dhis2_diff) : '—'}
                  </span>
                </td>
                <td className="text-right">{fmtPct(f.imam_dhis2_gap_pct)}</td>
                <td className="text-right">
                  <span className={f.cure_rate != null && f.cure_rate >= 75 ? 'text-green-600' : 'text-red-600'}>
                    {fmtPct(f.cure_rate)}
                  </span>
                </td>
                <td className="text-right">{fmtPct(f.default_rate)}</td>
                <td>
                  <span className="badge" style={{ backgroundColor: (OPPORTUNITY_COLORS[f.opportunity_class] || '#9ca3af') + '20', color: OPPORTUNITY_COLORS[f.opportunity_class] || '#6b7280' }}>
                    {f.opportunity_class}
                  </span>
                </td>
                <td>
                  {f.sampling_status === 'certainty' ? <span className="badge badge-blue">Certainty</span> : <span className="text-gray-400 text-xs">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
        <span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}</span>
        <div className="flex gap-1">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Prev</button>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next</button>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between rounded-t-xl">
              <h3 className="text-sm font-bold text-gray-900">{selected.facility_name}</h3>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Detail label="State" value={selected.state} />
                <Detail label="LGA" value={selected.lga_normalized} />
                <Detail label="Ward" value={selected.ward || '—'} />
                <Detail label="Type" value={selected.facility_type || '—'} />
                <Detail label="IMAM Source" value={selected.imam_source || '—'} />
                <Detail label="Months Reporting" value={String(selected.months_reporting)} />
              </div>
              <hr className="border-gray-100" />
              <div className="grid grid-cols-2 gap-3">
                <Detail label="IMAM Admissions" value={fmtNum(selected.imam_admissions)} />
                <Detail label="DHIS2 Admissions" value={fmtNum(selected.dhis2_sam_admitted)} />
                <Detail label="Gap" value={selected.imam_dhis2_diff != null ? fmtNum(selected.imam_dhis2_diff) : '—'} />
                <Detail label="Gap %" value={fmtPct(selected.imam_dhis2_gap_pct)} />
              </div>
              <hr className="border-gray-100" />
              <div className="grid grid-cols-3 gap-3">
                <Detail label="Cure Rate" value={fmtPct(selected.cure_rate)} />
                <Detail label="Default Rate" value={fmtPct(selected.default_rate)} />
                <Detail label="CFR" value={fmtPct(selected.death_rate)} />
              </div>
              <hr className="border-gray-100" />
              <div className="grid grid-cols-2 gap-3">
                <Detail label="RUTF Utilised" value={fmtNum(selected.rutf_utilized_sachets)} />
                <Detail label="RUTF Received" value={fmtNum(selected.rutf_received_sachets)} />
                <Detail label="RUTF Implied" value={fmtNum(selected.rutf_implied_sachets)} />
                <Detail label="LMD RUTF" value={selected.lmd_rutf_sachets > 0 ? fmtNum(selected.lmd_rutf_sachets) : '—'} />
              </div>
              <hr className="border-gray-100" />
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Match Status" value={selected.match_status} />
                <Detail label="Classification" value={selected.opportunity_class} />
                <Detail label="Sampling Status" value={selected.sampling_status} />
                <Detail label="Sampling Stratum" value={selected.sampling_stratum || '—'} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}
