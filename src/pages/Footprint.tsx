import { useMemo, useState, useCallback } from 'react'
import { Building2, Users, GitCompare, HeartPulse, Package, Download, Search } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import ChartCard from '../components/ChartCard'
import EChart from '../components/EChart'
import InsightPanel from '../components/InsightPanel'
import KpiCard from '../components/KpiCard'
import { useFilters, filterByState, getStateSummary } from '../hooks/useData'
import { fmtNum, fmtPct, COLORS, SPHERE, OPPORTUNITY_COLORS } from '../utils/format'
import type { Facility, Dhis2Only, LgaSummary, StateSummary } from '../types'

type Category = 'All' | 'IMAM Only' | 'Both' | 'DHIS2 Only'
type SortField = 'facility_name' | 'lga' | 'state' | 'category' | 'imam_admissions' | 'dhis2_admitted'
type SortDir = 'asc' | 'desc'

interface FacRow {
  facility_name: string
  lga: string
  lga_display: string
  state: string
  category: 'IMAM Only' | 'Both' | 'DHIS2 Only'
  imam_admissions: number
  dhis2_admitted: number
}

interface Props {
  data: {
    facilities: Facility[]
    dhis2Only: Dhis2Only[]
    lgaSummary: LgaSummary[]
    stateSummary: StateSummary[]
    monthlyTrends: any[]
    facilityProfile: any
  }
}

function normalizeLga(raw: string): string {
  if (!raw) return ''
  let n = raw.replace(/^kn\s+/i, '').replace(/^kd\s+/i, '')
  return n.split(/[\s-]+/).map(w => {
    if (w.length <= 2) return w.toLowerCase()
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  }).join(' ').replace(/\s+/g, ' ').trim()
}

export default function Footprint({ data }: Props) {
  const { stateFilter } = useFilters()
  const summary = getStateSummary(data.stateSummary, stateFilter)
  const facs = filterByState(data.facilities, stateFilter)
  const dhis2Only = filterByState(data.dhis2Only, stateFilter)
  const lgas = filterByState(data.lgaSummary, stateFilter)

  const [categoryFilter, setCategoryFilter] = useState<Category>('All')
  const [lgaFilter, setLgaFilter] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('imam_admissions')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // ── Canonical facility registry from facilityProfile ──
  const allFacRows = useMemo(() => {
    const rows: FacRow[] = []
    const states = stateFilter === 'Combined' ? ['Kaduna', 'Kano'] : [stateFilter]
    for (const st of states) {
      const profile = data.facilityProfile?.[st]
      if (!profile) continue
      for (const f of (profile.imam_only || []))
        rows.push({ facility_name: f.facility_name, lga: normalizeLga(f.lga), lga_display: normalizeLga(f.lga), state: st, category: 'IMAM Only', imam_admissions: f.imam_admissions || 0, dhis2_admitted: 0 })
      for (const f of (profile.both_list || []))
        rows.push({ facility_name: f.facility_name, lga: normalizeLga(f.lga), lga_display: normalizeLga(f.lga), state: st, category: 'Both', imam_admissions: f.imam_admissions || 0, dhis2_admitted: f.dhis2_admitted || 0 })
      for (const f of (profile.dhis2_only_list || []))
        rows.push({ facility_name: f.facility_name, lga: normalizeLga(f.lga || f.facility_lga || ''), lga_display: normalizeLga(f.lga || f.facility_lga || ''), state: st, category: 'DHIS2 Only', imam_admissions: 0, dhis2_admitted: f.sam_admitted || 0 })
    }
    return rows
  }, [stateFilter, data.facilityProfile])

  // ── Venn / classification counts ──
  const vennData = useMemo(() => {
    if (stateFilter === 'Combined') {
      const kd = data.facilityProfile?.Kaduna
      const kn = data.facilityProfile?.Kano
      return {
        imamOnly: (kd?.imam_only?.length || 0) + (kn?.imam_only?.length || 0),
        both: (kd?.both || 0) + (kn?.both || 0),
        dhis2Only: (kd?.dhis2_only || 0) + (kn?.dhis2_only || 0),
      }
    }
    const profile = data.facilityProfile?.[stateFilter]
    return {
      imamOnly: profile?.imam_only?.length || 0,
      both: profile?.both || 0,
      dhis2Only: profile?.dhis2_only || 0,
    }
  }, [stateFilter, data.facilityProfile])

  const totalFacilities = vennData.imamOnly + vennData.both + vennData.dhis2Only
  const totalImam = vennData.imamOnly + vennData.both
  const totalDhis2 = vennData.both + vennData.dhis2Only

  // ── LGA list for dropdown ──
  const lgaOptions = useMemo(() => {
    const set = new Set<string>()
    for (const r of allFacRows) if (r.lga) set.add(r.lga)
    return ['All', ...Array.from(set).sort()]
  }, [allFacRows])

  // ── LGA-level facility composition from canonical registry ──
  const lgaComposition = useMemo(() => {
    const map: Record<string, { lga: string; state: string; imamOnly: number; both: number; dhis2Only: number }> = {}
    for (const r of allFacRows) {
      const key = `${r.state}|${r.lga}`
      if (!map[key]) map[key] = { lga: r.lga, state: r.state, imamOnly: 0, both: 0, dhis2Only: 0 }
      if (r.category === 'IMAM Only') map[key].imamOnly++
      else if (r.category === 'Both') map[key].both++
      else map[key].dhis2Only++
    }
    return Object.values(map).sort((a, b) => {
      const ta = a.imamOnly + a.both + a.dhis2Only
      const tb = b.imamOnly + b.both + b.dhis2Only
      return tb - ta
    })
  }, [allFacRows])

  // ── Filtered & sorted facility rows ──
  const filteredRows = useMemo(() => {
    let rows = allFacRows
    if (categoryFilter !== 'All') rows = rows.filter(r => r.category === categoryFilter)
    if (lgaFilter !== 'All') rows = rows.filter(r => r.lga === lgaFilter)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(r => r.facility_name.toLowerCase().includes(q) || r.lga.toLowerCase().includes(q))
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = a[sortField]
      const bv = b[sortField]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [allFacRows, categoryFilter, lgaFilter, search, sortField, sortDir])

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }, [sortField])

  const handleLgaClick = useCallback((lga: string) => {
    setLgaFilter(lga)
  }, [])

  // ── CSV download ──
  const downloadCsv = useCallback(() => {
    const headers = ['#', 'Facility', 'LGA', 'State', 'Category', 'IMAM Admissions', 'DHIS2 Admitted']
    const csvRows = [headers.join(',')]
    filteredRows.forEach((r, i) => {
      csvRows.push([
        i + 1,
        `"${r.facility_name.replace(/"/g, '""')}"`,
        `"${r.lga}"`,
        r.state,
        r.category,
        r.imam_admissions || '',
        r.dhis2_admitted || '',
      ].join(','))
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `facility_profile_${stateFilter.toLowerCase()}_${lgaFilter === 'All' ? 'all' : lgaFilter.toLowerCase().replace(/\s+/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredRows, stateFilter, lgaFilter])

  // ── Top LGAs by IMAM admissions ──
  const topLgaChart = useMemo(() => {
    const sorted = [...lgas].sort((a, b) => b.imam_admissions - a.imam_admissions).slice(0, 15)
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 130, right: 30, top: 10, bottom: 30 },
      xAxis: { type: 'value' as const, axisLabel: { fontSize: 10 } },
      yAxis: {
        type: 'category' as const,
        data: sorted.map(l => l.lga_normalized).reverse(),
        axisLabel: { fontSize: 10 },
      },
      series: [{
        type: 'bar' as const,
        data: sorted.map(l => l.imam_admissions).reverse(),
        itemStyle: { color: COLORS.primary, borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 18,
      }],
    }
  }, [lgas])

  // ── LGA heatmap (LGAs × classifications) ──
  const lgaHeatmap = useMemo(() => {
    const items = lgaComposition.slice(0, 40)
    const lgaNames = items.map(l => l.lga || '(unknown)')
    const cats = ['IMAM Only', 'Both (Matched)', 'DHIS2 Only']
    const heatData: [number, number, number][] = []
    let maxVal = 1
    for (let y = 0; y < lgaNames.length; y++) {
      const vals = [items[y].imamOnly, items[y].both, items[y].dhis2Only]
      for (let x = 0; x < 3; x++) {
        heatData.push([x, y, vals[x]])
        if (vals[x] > maxVal) maxVal = vals[x]
      }
    }
    return {
      tooltip: {
        formatter: (p: any) => {
          const [x, y, v] = p.data
          return `<strong>${lgaNames[y]}</strong><br/>${cats[x]}: ${v} facilities`
        },
      },
      grid: { left: 130, right: 80, top: 10, bottom: 30 },
      xAxis: { type: 'category' as const, data: cats, axisLabel: { fontSize: 10 }, splitArea: { show: true } },
      yAxis: { type: 'category' as const, data: lgaNames, axisLabel: { fontSize: 9 }, splitArea: { show: true } },
      visualMap: {
        min: 0,
        max: maxVal,
        calculable: true,
        orient: 'vertical' as const,
        right: 10,
        top: 'center' as const,
        inRange: { color: ['#f0f9ff', '#bae6fd', '#38bdf8', '#0369a1', '#0c4a6e'] },
        textStyle: { fontSize: 10 },
      },
      series: [{
        type: 'heatmap' as const,
        data: heatData,
        label: { show: true, fontSize: 9, color: '#334155' },
        emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.2)' } },
      }],
    }
  }, [lgaComposition])

  // ── Charts ──

  // Venn donut
  const vennChart = useMemo(() => ({
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie' as const,
      radius: ['42%', '72%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
      label: { show: true, fontSize: 11, formatter: '{b}\n{c} ({d}%)' },
      emphasis: { label: { fontSize: 13, fontWeight: 'bold' as const } },
      data: [
        { name: 'IMAM Only', value: vennData.imamOnly, itemStyle: { color: COLORS.accent } },
        { name: 'Both (Matched)', value: vennData.both, itemStyle: { color: COLORS.primary } },
        { name: 'DHIS2 Only', value: vennData.dhis2Only, itemStyle: { color: COLORS.teal } },
      ],
    }],
  }), [vennData])

  // State comparison chart (Combined only)
  const stateCompChart = useMemo(() => {
    if (stateFilter !== 'Combined') return null
    const kd = data.facilityProfile?.Kaduna
    const kn = data.facilityProfile?.Kano
    if (!kd || !kn) return null
    const kdImamOnly = kd.imam_only?.length || 0
    const kdBoth = kd.both || 0
    const kdD2Only = kd.dhis2_only || 0
    const knImamOnly = kn.imam_only?.length || 0
    const knBoth = kn.both || 0
    const knD2Only = kn.dhis2_only || 0
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      grid: { left: 80, right: 30, top: 20, bottom: 40 },
      xAxis: {
        type: 'category' as const,
        data: ['Kaduna', 'Kano'],
        axisLabel: { fontSize: 12 },
      },
      yAxis: { type: 'value' as const, name: 'Facilities', axisLabel: { fontSize: 10 } },
      series: [
        { name: 'IMAM Only', type: 'bar' as const, stack: 'total', data: [kdImamOnly, knImamOnly], itemStyle: { color: COLORS.accent }, barMaxWidth: 60 },
        { name: 'Both (Matched)', type: 'bar' as const, stack: 'total', data: [kdBoth, knBoth], itemStyle: { color: COLORS.primary }, barMaxWidth: 60 },
        { name: 'DHIS2 Only', type: 'bar' as const, stack: 'total', data: [kdD2Only, knD2Only], itemStyle: { color: COLORS.teal }, barMaxWidth: 60 },
      ],
    }
  }, [stateFilter, data.facilityProfile])

  // Treatment outcomes chart (single state or both states)
  const outcomeChart = useMemo(() => {
    const items = stateFilter === 'Combined'
      ? data.stateSummary.filter(s => s.state !== 'Combined')
      : data.stateSummary.filter(s => s.state === stateFilter)
    return {
      tooltip: { trigger: 'axis' as const, formatter: (params: any) => {
        let s = `<b>${params[0]?.name}</b><br/>`
        for (const p of params) s += `${p.marker} ${p.seriesName}: ${p.value != null ? p.value + '%' : '—'}<br/>`
        return s
      }},
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category' as const, data: items.map(s => s.state), axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value' as const, max: 100, axisLabel: { fontSize: 10, formatter: '{value}%' } },
      series: [
        { name: 'Cure Rate', type: 'bar' as const, data: items.map(s => s.cure_rate), itemStyle: { color: COLORS.primary }, barMaxWidth: 50,
          markLine: { silent: true, data: [{ yAxis: SPHERE.cureMin, label: { formatter: 'SPHERE ≥75%', fontSize: 9 }, lineStyle: { color: '#22c55e', type: 'dashed' as const } }] } },
        { name: 'Default Rate', type: 'bar' as const, data: items.map(s => s.default_rate), itemStyle: { color: COLORS.amber }, barMaxWidth: 50,
          markLine: { silent: true, data: [{ yAxis: SPHERE.defaultMax, label: { formatter: 'SPHERE <15%', fontSize: 9 }, lineStyle: { color: '#f59e0b', type: 'dashed' as const } }] } },
        { name: 'Case Fatality', type: 'bar' as const, data: items.map(s => s.death_rate), itemStyle: { color: COLORS.red }, barMaxWidth: 50 },
      ],
    }
  }, [stateFilter, data.stateSummary])

  // Opportunity classification donut
  const opportunityChart = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const f of facs) counts[f.opportunity_class] = (counts[f.opportunity_class] || 0) + 1
    const labels = Object.keys(counts)
    return {
      tooltip: { trigger: 'item' as const },
      series: [{
        type: 'pie' as const,
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, fontSize: 10, formatter: '{b}\n{c} ({d}%)' },
        data: labels.map(l => ({ name: l, value: counts[l], itemStyle: { color: OPPORTUNITY_COLORS[l] || COLORS.gray } })),
      }],
    }
  }, [facs])

  // LGA composition stacked bar chart
  const lgaCompChart = useMemo(() => {
    const items = lgaComposition.slice(0, 30)
    const names = items.map(l => l.lga || '(unknown)').reverse()
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { top: 0, textStyle: { fontSize: 11 }, data: ['IMAM Only', 'Both (Matched)', 'DHIS2 Only'] },
      grid: { left: 140, right: 30, top: 35, bottom: 10 },
      xAxis: { type: 'value' as const, name: 'Facilities', axisLabel: { fontSize: 10 } },
      yAxis: {
        type: 'category' as const,
        data: names,
        axisLabel: { fontSize: 10 },
        axisTick: { show: false },
        triggerEvent: true,
      },
      series: [
        { name: 'IMAM Only', type: 'bar' as const, stack: 'total', data: items.map(l => l.imamOnly).reverse(), itemStyle: { color: COLORS.accent }, barMaxWidth: 14 },
        { name: 'Both (Matched)', type: 'bar' as const, stack: 'total', data: items.map(l => l.both).reverse(), itemStyle: { color: COLORS.primary }, barMaxWidth: 14 },
        { name: 'DHIS2 Only', type: 'bar' as const, stack: 'total', data: items.map(l => l.dhis2Only).reverse(), itemStyle: { color: COLORS.teal }, barMaxWidth: 14 },
      ],
    }
  }, [lgaComposition])

  // ── Insights ──
  const insights = useMemo(() => {
    const ins: string[] = []
    if (summary) {
      ins.push(`${fmtNum(totalFacilities)} unique facilities across ${summary.lgas} LGAs. ${fmtNum(totalImam)} are on the IMAM frame, ${fmtNum(totalDhis2)} report through DHIS2, and ${fmtNum(vennData.both)} appear in both systems.`)
      ins.push(`IMAM admissions: ${fmtNum(summary.imam_admissions)}. Cure rate: ${summary.cure_rate != null ? fmtPct(summary.cure_rate) : '—'} (SPHERE ≥75%). Default rate: ${summary.default_rate != null ? fmtPct(summary.default_rate) : '—'} (SPHERE <15%).`)
    }
    if (stateFilter === 'Kano' || stateFilter === 'Combined') {
      const kanoImam = data.facilityProfile?.Kano?.imam_only?.length || 0
      const kanoBoth = data.facilityProfile?.Kano?.both || 0
      ins.push(`Kano IMAM source: 97 CMAM facilities list. ${kanoBoth} matched to DHIS2, ${kanoImam} IMAM-only.`)
    }
    if (summary?.imam_dhis2_gap_pct != null) {
      ins.push(`Reconciliation gap: ${fmtPct(summary.imam_dhis2_gap_pct)} (${fmtNum(summary.imam_dhis2_diff)} more admissions in IMAM than matched DHIS2 records).`)
    }
    return ins
  }, [summary, vennData, totalFacilities, totalImam, totalDhis2, stateFilter, data.facilityProfile])

  const categoryBadgeColor = (cat: string) => {
    if (cat === 'IMAM Only') return 'bg-amber-100 text-amber-700'
    if (cat === 'Both') return 'bg-blue-100 text-blue-700'
    if (cat === 'DHIS2 Only') return 'bg-teal-100 text-teal-700'
    return 'bg-gray-100 text-gray-700'
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return '↕'
    return sortDir === 'asc' ? '↑' : '↓'
  }

  if (!summary) return <div className="text-gray-500">No data available</div>

  return (
    <div>
      <SectionHeader
        title="Health Facility Profile"
        description="Unified overview of SAM treatment reporting across Kaduna and Kano states. Facility classification based on IMAM programme data and DHIS2 health information system records for September 2024 to August 2026."
        badge={stateFilter}
      />

      {/* ── Executive KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
        <KpiCard label="Total Facilities" value={fmtNum(totalFacilities)} sub={`${fmtNum(totalImam)} IMAM, ${fmtNum(totalDhis2)} DHIS2`} icon={<Building2 size={18} />} />
        <KpiCard label="IMAM Admissions" value={fmtNum(summary.imam_admissions)} sub="24-month period" icon={<Users size={18} />} />
        <KpiCard
          label="Cure Rate"
          value={summary.cure_rate != null ? fmtPct(summary.cure_rate) : '—'}
          sub={summary.cure_rate != null ? (summary.cure_rate >= SPHERE.cureMin ? 'Meets SPHERE ≥75%' : 'Below SPHERE ≥75%') : ''}
          icon={<HeartPulse size={18} />}
          color={summary.cure_rate != null ? (summary.cure_rate >= SPHERE.cureMin ? 'green' : 'red') : 'default'}
        />
        <KpiCard
          label="RUTF Utilised"
          value={summary.rutf_utilized_sachets > 0 ? fmtNum(summary.rutf_utilized_sachets) : '—'}
          sub={summary.rutf_utilized_sachets > 0 ? `${fmtNum(summary.rutf_implied_sachets)} implied` : 'sachets'}
          icon={<Package size={18} />}
        />
        <KpiCard
          label="Reconciliation Gap"
          value={summary.imam_dhis2_gap_pct != null ? fmtPct(summary.imam_dhis2_gap_pct) : '—'}
          sub={summary.imam_dhis2_diff != null ? `${fmtNum(summary.imam_dhis2_diff)} admissions` : ''}
          icon={<GitCompare size={18} />}
          color={summary.imam_dhis2_gap_pct != null && Math.abs(summary.imam_dhis2_gap_pct) > 20 ? 'red' : 'default'}
        />
      </div>

      {/* ── Facility Classification KPIs ── */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard label="IMAM Only" value={fmtNum(vennData.imamOnly)} sub="no DHIS2 match" color="amber" />
        <KpiCard label="Both (Matched)" value={fmtNum(vennData.both)} sub="IMAM + DHIS2" />
        <KpiCard label="DHIS2 Only" value={fmtNum(vennData.dhis2Only)} sub={`${fmtNum(dhis2Only.reduce((s, d) => s + (d.sam_admitted || 0), 0))} admissions`} color="amber" />
      </div>

      <InsightPanel insights={insights} />

      {/* ── Charts Row 1: Donut + State comparison / Outcomes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <ChartCard title="Facility Reporting Overlap" subtitle="IMAM frame vs DHIS2 classification" source="IMAM Frame v5, DHIS2">
          <EChart option={vennChart} height={320} />
        </ChartCard>

        {stateCompChart ? (
          <ChartCard title="Kaduna vs Kano" subtitle="Facility classification by state" source="IMAM Frame v5, DHIS2, CMAM List">
            <EChart option={stateCompChart} height={320} />
          </ChartCard>
        ) : (
          <ChartCard title="Treatment Outcomes" subtitle="Cure, default, and case fatality rates vs SPHERE" source="IMAM Frame v5">
            <EChart option={outcomeChart} height={320} />
          </ChartCard>
        )}

        <ChartCard title="Opportunity Classification" subtitle="Facility operational categories" source="IMAM–DHIS2 reconciliation">
          <EChart option={opportunityChart} height={320} />
        </ChartCard>
      </div>

      {/* Combined also gets outcomes */}
      {stateFilter === 'Combined' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <ChartCard title="Treatment Outcomes by State" subtitle="Cure, default, and case fatality rates vs SPHERE benchmarks" source="IMAM Frame v5">
            <EChart option={outcomeChart} height={300} />
          </ChartCard>
        </div>
      )}

      {/* ── LGA Facility Composition ── */}
      <div className="mt-4">
        <ChartCard
          title="LGA Facility Composition"
          subtitle={`Facilities by classification per LGA — click an LGA label to filter the table below`}
          source="Facility Profile Registry"
        >
          <EChart
            option={lgaCompChart}
            height={Math.max(400, lgaComposition.slice(0, 30).length * 22)}
            onEvents={{
              click: (params: any) => {
                if (params.componentType === 'yAxis' && params.value) {
                  handleLgaClick(params.value)
                }
              }
            }}
          />
        </ChartCard>
      </div>

      {/* ── LGA Heatmap + Top LGAs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <ChartCard
          title="LGA × Classification Heatmap"
          subtitle="Facility counts by LGA and classification — darker = more facilities"
          source="Facility Profile Registry"
        >
          <EChart option={lgaHeatmap} height={Math.max(400, lgaComposition.slice(0, 40).length * 18)} />
        </ChartCard>
        <ChartCard
          title="Top LGAs by IMAM Admissions"
          subtitle="Highest-volume local government areas"
          source="IMAM Frame v5"
        >
          <EChart option={topLgaChart} height={380} />
        </ChartCard>
      </div>

      {/* ── Facility Table ── */}
      <div className="mt-4 card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">
                Facility List — {categoryFilter === 'All' ? 'All Categories' : categoryFilter}
                {lgaFilter !== 'All' && ` — ${lgaFilter}`}
              </h3>
              <p className="text-xs text-gray-500">{fmtNum(filteredRows.length)} of {fmtNum(allFacRows.length)} facilities</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search facility..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400 w-44"
                />
              </div>
              {/* LGA dropdown */}
              <select
                value={lgaFilter}
                onChange={e => setLgaFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
              >
                {lgaOptions.map(l => <option key={l} value={l}>{l === 'All' ? 'All LGAs' : l}</option>)}
              </select>
              {/* CSV download */}
              <button
                onClick={downloadCsv}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                title="Download CSV"
              >
                <Download size={13} /> CSV
              </button>
            </div>
          </div>
          {/* Category filter */}
          <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1 mt-3">
            {(['All', 'IMAM Only', 'Both', 'DHIS2 Only'] as Category[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  categoryFilter === cat
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {cat} {cat === 'All' ? `(${totalFacilities})` : cat === 'IMAM Only' ? `(${vennData.imamOnly})` : cat === 'Both' ? `(${vennData.both})` : `(${vennData.dhis2Only})`}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto max-h-[600px]">
          <table className="data-table">
            <thead className="sticky top-0">
              <tr>
                <th>#</th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('facility_name')}>Facility {sortIcon('facility_name')}</th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('lga')}>LGA {sortIcon('lga')}</th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('state')}>State {sortIcon('state')}</th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('category')}>Category {sortIcon('category')}</th>
                <th className="text-right cursor-pointer select-none" onClick={() => toggleSort('imam_admissions')}>IMAM Adm. {sortIcon('imam_admissions')}</th>
                <th className="text-right cursor-pointer select-none" onClick={() => toggleSort('dhis2_admitted')}>DHIS2 Adm. {sortIcon('dhis2_admitted')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((f, i) => (
                <tr key={i}>
                  <td className="text-slate-400 text-xs">{i + 1}</td>
                  <td className="font-medium max-w-[250px] truncate">{f.facility_name}</td>
                  <td>
                    <button className="text-primary-600 hover:underline text-left" onClick={() => handleLgaClick(f.lga)}>
                      {f.lga_display}
                    </button>
                  </td>
                  <td>{f.state}</td>
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${categoryBadgeColor(f.category)}`}>
                      {f.category}
                    </span>
                  </td>
                  <td className="text-right">{f.imam_admissions > 0 ? fmtNum(f.imam_admissions) : '—'}</td>
                  <td className="text-right">{f.dhis2_admitted > 0 ? fmtNum(f.dhis2_admitted) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data transparency */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg text-xs text-gray-500 space-y-1">
        <p><strong>Data Sources:</strong> IMAM programme data (State IMAM Reports 2024–2026), DHIS2 health information system (Sep 2024–Aug 2026), LMD RUTF distribution records, Kano CMAM Facilities List.</p>
        <p><strong>Period:</strong> September 2024 to August 2026 (24 months). Kaduna: {fmtNum(12 + 154)} IMAM facilities across 23 LGAs. Kano: 97 CMAM facilities across 44 LGAs.</p>
        <p><strong>Classification:</strong> Total = IMAM Only + Both (Matched) + DHIS2 Only. IMAM = IMAM Only + Both. DHIS2 = Both + DHIS2 Only. RUTF assumption: 150 sachets per child.</p>
      </div>
    </div>
  )
}
