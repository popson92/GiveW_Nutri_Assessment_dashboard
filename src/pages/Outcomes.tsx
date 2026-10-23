import { useMemo } from 'react'
import SectionHeader from '../components/SectionHeader'
import ChartCard from '../components/ChartCard'
import EChart from '../components/EChart'
import InsightPanel from '../components/InsightPanel'
import KpiCard from '../components/KpiCard'
import { useFilters, filterByState, getStateSummary } from '../hooks/useData'
import { fmtNum, fmtPct, COLORS, SPHERE } from '../utils/format'
import type { Facility, LgaSummary } from '../types'

interface Props {
  data: {
    facilities: Facility[]
    lgaSummary: LgaSummary[]
    stateSummary: any[]
  }
}

export default function Outcomes({ data }: Props) {
  const { stateFilter } = useFilters()
  const facs = filterByState(data.facilities, stateFilter)
  const lgas = filterByState(data.lgaSummary, stateFilter)
  const summary = getStateSummary(data.stateSummary, stateFilter)

  const facsWithOutcomes = useMemo(() => facs.filter(f => f.cure_rate != null), [facs])
  const lgasWithOutcomes = useMemo(() => lgas.filter(l => l.cure_rate != null), [lgas])

  const cureDistChart = useMemo(() => {
    const bins = [
      { label: '<50%', min: 0, max: 50 },
      { label: '50-60%', min: 50, max: 60 },
      { label: '60-70%', min: 60, max: 70 },
      { label: '70-75%', min: 70, max: 75 },
      { label: '75-85%', min: 75, max: 85 },
      { label: '85-100%', min: 85, max: 100 },
      { label: '>100%', min: 100, max: Infinity },
    ]
    const counts = bins.map(b => ({
      label: b.label,
      count: facsWithOutcomes.filter(f => f.cure_rate! >= b.min && f.cure_rate! < b.max).length,
    }))
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category' as const, data: counts.map(c => c.label), axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value' as const, name: 'Facilities', axisLabel: { fontSize: 10 } },
      series: [{
        type: 'bar' as const,
        data: counts.map(c => ({
          value: c.count,
          itemStyle: { color: c.label.startsWith('>100') || c.label.startsWith('85') || c.label.startsWith('75') ? COLORS.primary : COLORS.red },
        })),
        barMaxWidth: 40,
        markLine: { silent: true, data: [] },
      }],
    }
  }, [facsWithOutcomes])

  const lgaHeatmapChart = useMemo(() => {
    const sorted = [...lgasWithOutcomes].sort((a, b) => (b.cure_rate || 0) - (a.cure_rate || 0)).slice(0, 20)
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      grid: { left: 130, right: 30, top: 10, bottom: 40 },
      xAxis: { type: 'value' as const, max: 100, axisLabel: { fontSize: 10, formatter: '{value}%' } },
      yAxis: {
        type: 'category' as const,
        data: sorted.map(l => l.lga_normalized).reverse(),
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          name: 'Cure Rate',
          type: 'bar' as const,
          data: sorted.map(l => l.cure_rate).reverse(),
          itemStyle: { color: COLORS.primary },
          barMaxWidth: 12,
          markLine: { silent: true, data: [{ xAxis: SPHERE.cureMin, label: { formatter: '75%', fontSize: 9 }, lineStyle: { color: '#22c55e', type: 'dashed' as const } }] },
        },
        {
          name: 'Default Rate',
          type: 'bar' as const,
          data: sorted.map(l => l.default_rate).reverse(),
          itemStyle: { color: COLORS.amber },
          barMaxWidth: 12,
        },
        {
          name: 'CFR',
          type: 'bar' as const,
          data: sorted.map(l => l.death_rate).reverse(),
          itemStyle: { color: COLORS.red },
          barMaxWidth: 12,
        },
      ],
    }
  }, [lgasWithOutcomes])

  const volumeVsQualityChart = useMemo(() => ({
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: any) => `<strong>${p.data[3]}</strong><br/>Admissions: ${fmtNum(p.data[0])}<br/>Cure Rate: ${fmtPct(p.data[1])}<br/>Default Rate: ${fmtPct(p.data[2])}`
    },
    grid: { left: 60, right: 30, top: 30, bottom: 50 },
    xAxis: { type: 'value' as const, name: 'IMAM Admissions', nameLocation: 'middle' as const, nameGap: 30, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value' as const, name: 'Cure Rate (%)', nameLocation: 'middle' as const, nameGap: 40, max: 150, axisLabel: { fontSize: 10, formatter: '{value}%' } },
    visualMap: [{
      show: true, min: 0, max: 60, dimension: 2,
      inRange: { color: [COLORS.primary, COLORS.amber, COLORS.red] },
      text: ['High Default', 'Low Default'],
      textStyle: { fontSize: 10 },
      right: 10, top: 10,
    }],
    series: [{
      type: 'scatter' as const,
      symbolSize: 8,
      data: facsWithOutcomes.map(f => [f.imam_admissions, f.cure_rate, f.default_rate, f.facility_name]),
      markLine: {
        silent: true,
        data: [
          { yAxis: SPHERE.cureMin, label: { formatter: 'SPHERE ≥75%', fontSize: 9, position: 'start' as const }, lineStyle: { color: '#22c55e', type: 'dashed' as const } },
        ],
      },
    }],
  }), [facsWithOutcomes])

  const meetsSphere = useMemo(() => {
    const cureOk = facsWithOutcomes.filter(f => f.cure_rate! >= SPHERE.cureMin).length
    const defaultOk = facsWithOutcomes.filter(f => f.default_rate != null && f.default_rate <= SPHERE.defaultMax).length
    const cfrOk = facsWithOutcomes.filter(f => f.death_rate != null && f.death_rate <= SPHERE.deathMax).length
    return { cureOk, defaultOk, cfrOk, total: facsWithOutcomes.length }
  }, [facsWithOutcomes])

  const insights = useMemo(() => {
    const ins: string[] = []
    if (summary?.cure_rate != null) {
      ins.push(`Pooled cure rate: ${fmtPct(summary.cure_rate)}. ${meetsSphere.cureOk} of ${meetsSphere.total} facilities (${(meetsSphere.cureOk / meetsSphere.total * 100).toFixed(0)}%) meet the SPHERE ≥75% cure rate standard.`)
    }
    if (summary?.default_rate != null) {
      ins.push(`Pooled default rate: ${fmtPct(summary.default_rate)}. ${meetsSphere.defaultOk} of ${meetsSphere.total} facilities meet the SPHERE <15% default rate standard.`)
    }
    const outliers = facsWithOutcomes.filter(f => f.cure_rate! > 100)
    if (outliers.length > 0) {
      ins.push(`${outliers.length} facilities show cure rates exceeding 100%, suggesting more cured discharges than new admissions in the period — likely due to carry-over patients from prior periods.`)
    }
    return ins
  }, [summary, meetsSphere, facsWithOutcomes])

  return (
    <div>
      <SectionHeader
        title="SAM Treatment Outcomes"
        description="Analysis of treatment performance using SPHERE humanitarian standards. Rates are calculated using pooled exit counts (cured + defaulted + died + non-recovered + transferred out) as denominator."
        badge={stateFilter}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard
          label="Pooled Cure Rate"
          value={summary?.cure_rate != null ? fmtPct(summary.cure_rate) : '—'}
          sub={`SPHERE: ≥${SPHERE.cureMin}%`}
          color={summary?.cure_rate != null && summary.cure_rate >= SPHERE.cureMin ? 'green' : 'red'}
        />
        <KpiCard
          label="Pooled Default Rate"
          value={summary?.default_rate != null ? fmtPct(summary.default_rate) : '—'}
          sub={`SPHERE: <${SPHERE.defaultMax}%`}
          color={summary?.default_rate != null && summary.default_rate <= SPHERE.defaultMax ? 'green' : 'amber'}
        />
        <KpiCard
          label="Case Fatality Rate"
          value={summary?.death_rate != null ? fmtPct(summary.death_rate) : '—'}
          sub={`SPHERE: <${SPHERE.deathMax}%`}
          color={summary?.death_rate != null && summary.death_rate <= SPHERE.deathMax ? 'green' : 'red'}
        />
        <KpiCard
          label="Facs Meeting Cure Standard"
          value={`${meetsSphere.cureOk}/${meetsSphere.total}`}
          sub={`${(meetsSphere.cureOk / Math.max(meetsSphere.total, 1) * 100).toFixed(0)}% of facilities`}
        />
      </div>

      <InsightPanel insights={insights} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <ChartCard title="Cure Rate Distribution" subtitle="Facility-level cure rates" source="IMAM Sampling Frame v5">
          <EChart option={cureDistChart} height={350} />
        </ChartCard>
        <ChartCard title="Volume vs Quality" subtitle="Admissions vs cure rate, colored by default rate" source="IMAM Sampling Frame v5">
          <EChart option={volumeVsQualityChart} height={350} />
        </ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard title="LGA Treatment Performance" subtitle="Cure, default, and case fatality rates by LGA" source="Pooled from facility-level IMAM data">
          <EChart option={lgaHeatmapChart} height={500} />
        </ChartCard>
      </div>
    </div>
  )
}
