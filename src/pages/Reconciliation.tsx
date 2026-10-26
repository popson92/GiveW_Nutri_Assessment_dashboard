import { useMemo } from 'react'
import SectionHeader from '../components/SectionHeader'
import ChartCard from '../components/ChartCard'
import EChart from '../components/EChart'
import InsightPanel from '../components/InsightPanel'
import KpiCard from '../components/KpiCard'
import { useFilters, filterByState, getStateSummary } from '../hooks/useData'
import { fmtNum, fmtPct, COLORS } from '../utils/format'
import type { Facility, StateSummary, LgaSummary } from '../types'

interface Props {
  data: {
    facilities: Facility[]
    stateSummary: StateSummary[]
    lgaSummary: LgaSummary[]
  }
}

export default function Reconciliation({ data }: Props) {
  const { stateFilter } = useFilters()
  const summary = getStateSummary(data.stateSummary, stateFilter)
  const facs = filterByState(data.facilities, stateFilter)
  const lgas = filterByState(data.lgaSummary, stateFilter)

  const matchedFacs = useMemo(() => facs.filter(f => f.imam_dhis2_diff != null), [facs])

  const scatterData = useMemo(() => ({
    tooltip: {
      trigger: 'item' as const,
      formatter: (params: any) => {
        const d = params.data
        return `<strong>${d[3]}</strong><br/>IMAM: ${fmtNum(d[0])}<br/>DHIS2: ${fmtNum(d[1])}<br/>Gap: ${fmtNum(d[0] - d[1])} (${d[0] > 0 ? ((d[0] - d[1]) / d[0] * 100).toFixed(1) : '—'}%)`
      },
    },
    grid: { left: 60, right: 30, top: 30, bottom: 50 },
    xAxis: { type: 'value' as const, name: 'IMAM Admissions', nameLocation: 'middle' as const, nameGap: 30, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value' as const, name: 'DHIS2 Admissions', nameLocation: 'middle' as const, nameGap: 40, axisLabel: { fontSize: 10 } },
    series: [
      {
        type: 'scatter' as const,
        symbolSize: 8,
        data: matchedFacs.map(f => [f.imam_admissions, f.dhis2_sam_admitted, f.lga_normalized, f.facility_name]),
        itemStyle: { color: COLORS.primary, opacity: 0.6 },
      },
      {
        type: 'line' as const,
        data: [[0, 0], [Math.max(...matchedFacs.map(f => f.imam_admissions), 100), Math.max(...matchedFacs.map(f => f.imam_admissions), 100)]],
        lineStyle: { color: '#9ca3af', type: 'dashed' as const, width: 1 },
        symbol: 'none',
        tooltip: { show: false },
      },
    ],
  }), [matchedFacs])

  const gapDistribution = useMemo(() => {
    const gaps = matchedFacs.map(f => f.imam_dhis2_diff!).filter(g => g !== 0)
    const bins = [
      { label: '<-500', min: -Infinity, max: -500 },
      { label: '-500 to -100', min: -500, max: -100 },
      { label: '-100 to 0', min: -100, max: 0 },
      { label: '0 to 100', min: 0, max: 100 },
      { label: '100 to 500', min: 100, max: 500 },
      { label: '500 to 1000', min: 500, max: 1000 },
      { label: '>1000', min: 1000, max: Infinity },
    ]
    const counts = bins.map(b => ({
      label: b.label,
      count: gaps.filter(g => g >= b.min && g < b.max).length,
    }))
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 50, right: 20, top: 10, bottom: 40 },
      xAxis: { type: 'category' as const, data: counts.map(c => c.label), axisLabel: { fontSize: 10, rotate: 20 } },
      yAxis: { type: 'value' as const, name: 'Facilities', axisLabel: { fontSize: 10 } },
      series: [{
        type: 'bar' as const,
        data: counts.map(c => ({
          value: c.count,
          itemStyle: { color: c.label.startsWith('-') || c.label.startsWith('<') ? COLORS.blue : COLORS.accent },
        })),
        barMaxWidth: 40,
      }],
    }
  }, [matchedFacs])

  const lgaReconChart = useMemo(() => {
    const sorted = [...lgas]
      .filter(l => l.imam_admissions > 0)
      .sort((a, b) => b.imam_admissions - a.imam_admissions)
    const names = sorted.map(l => l.lga_normalized).reverse()

    const needData = sorted.map(l => l.rutf_implied).reverse()
    const imamData = sorted.map(l => l.rutf_utilized).reverse()
    const lmdData = sorted.map(l => l.lmd_rutf).reverse()

    return {
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: any) => {
          if (!params || params.length === 0) return ''
          const idx = params[0].dataIndex
          const lga = names[idx]
          let html = `<strong>${lga}</strong>`
          for (const p of params) {
            if (p.value != null && p.value > 0) {
              html += `<br/>${p.marker} ${p.seriesName}: ${fmtNum(p.value)}`
            }
          }
          return html
        },
      },
      legend: {
        top: 0,
        textStyle: { fontSize: 11 },
        data: ['Need (admissions × 150)', 'IMAM utilised', 'LMD distributed'],
      },
      grid: { left: 130, right: 40, top: 35, bottom: 10 },
      xAxis: {
        type: 'value' as const,
        axisLabel: { fontSize: 10, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}` },
      },
      yAxis: {
        type: 'category' as const,
        data: names,
        axisLabel: { fontSize: 10 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          name: 'Need (admissions × 150)',
          type: 'scatter' as const,
          data: needData,
          symbolSize: 10,
          itemStyle: { color: COLORS.primary },
          z: 10,
        },
        {
          name: 'IMAM utilised',
          type: 'scatter' as const,
          data: imamData,
          symbolSize: 10,
          itemStyle: { color: COLORS.accent },
          z: 10,
        },
        {
          name: 'LMD distributed',
          type: 'scatter' as const,
          data: lmdData.map(v => v > 0 ? v : null),
          symbolSize: 10,
          itemStyle: { color: '#22c55e' },
          z: 10,
        },
      ],
    }
  }, [lgas])

  const topPositive = useMemo(() =>
    [...matchedFacs].sort((a, b) => (b.imam_dhis2_diff || 0) - (a.imam_dhis2_diff || 0)).slice(0, 20),
    [matchedFacs]
  )
  const topNegative = useMemo(() =>
    [...matchedFacs].sort((a, b) => (a.imam_dhis2_diff || 0) - (b.imam_dhis2_diff || 0)).slice(0, 20),
    [matchedFacs]
  )

  const insights = useMemo(() => {
    const ins: string[] = []
    if (summary?.imam_dhis2_gap_pct != null) {
      ins.push(`Overall reconciliation gap: ${fmtPct(summary.imam_dhis2_gap_pct)} — IMAM reports ${fmtNum(summary.imam_dhis2_diff)} more admissions than matched DHIS2 records.`)
    }
    const posCount = matchedFacs.filter(f => (f.imam_dhis2_diff || 0) > 0).length
    const negCount = matchedFacs.filter(f => (f.imam_dhis2_diff || 0) < 0).length
    ins.push(`${posCount} facilities show IMAM > DHIS2 (positive gap), ${negCount} show DHIS2 > IMAM (negative gap).`)
    if (topPositive.length > 0) {
      const top3 = topPositive.slice(0, 3).map(f => f.facility_name).join(', ')
      ins.push(`Largest positive gaps: ${top3}. These warrant verification to understand reporting discrepancies.`)
    }
    return ins
  }, [summary, matchedFacs, topPositive])

  return (
    <div>
      <SectionHeader
        title="Admissions Reconciliation"
        description="Facility-level comparison of IMAM programme admissions against matched DHIS2 records. Difference = IMAM admissions − DHIS2 admissions. Positive values indicate IMAM reports more; negative values indicate DHIS2 reports more."
        badge={stateFilter}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Matched Facilities" value={fmtNum(matchedFacs.length)} sub={`of ${facs.length} total`} />
        <KpiCard label="IMAM Total" value={fmtNum(summary?.imam_admissions)} sub="admissions" />
        <KpiCard label="DHIS2 Matched Total" value={fmtNum(summary?.dhis2_admissions_matched)} sub="admissions" />
        <KpiCard
          label="Gap"
          value={summary?.imam_dhis2_gap_pct != null ? fmtPct(summary.imam_dhis2_gap_pct) : '—'}
          sub={summary?.imam_dhis2_diff != null ? `${fmtNum(summary.imam_dhis2_diff)} admissions` : ''}
          color={summary?.imam_dhis2_gap_pct != null && Math.abs(summary.imam_dhis2_gap_pct) > 20 ? 'red' : 'default'}
        />
      </div>

      <InsightPanel insights={insights} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <ChartCard title="IMAM vs DHIS2 Scatter Plot" subtitle="Each dot is a facility. Dashed line = perfect agreement." source="IMAM Frame v5, DHIS2 matched">
          <EChart option={scatterData} height={380} />
        </ChartCard>
        <ChartCard title="Gap Distribution" subtitle="Distribution of IMAM−DHIS2 differences across facilities" source="IMAM Frame v5">
          <EChart option={gapDistribution} height={380} />
        </ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard title="LGA-Level RUTF Insights" subtitle="Need (admissions × 150), IMAM utilised, and LMD distributed — by LGA" source="IMAM Frame v5, LMD records">
          <EChart option={lgaReconChart} height={Math.max(450, lgas.filter(l => l.imam_admissions > 0).length * 28)} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold">Top 20 Positive Gap Facilities</h3>
            <p className="text-xs text-gray-500">IMAM reports more admissions than DHIS2</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Facility</th><th>LGA</th><th className="text-right">IMAM</th><th className="text-right">DHIS2</th><th className="text-right">Gap</th><th className="text-right">Gap %</th></tr>
              </thead>
              <tbody>
                {topPositive.map((f, i) => (
                  <tr key={i}>
                    <td className="font-medium max-w-[200px] truncate">{f.facility_name}</td>
                    <td>{f.lga_normalized}</td>
                    <td className="text-right">{fmtNum(f.imam_admissions)}</td>
                    <td className="text-right">{fmtNum(f.dhis2_sam_admitted)}</td>
                    <td className="text-right text-amber-600 font-medium">+{fmtNum(f.imam_dhis2_diff)}</td>
                    <td className="text-right">{fmtPct(f.imam_dhis2_gap_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold">Top 20 Negative Gap Facilities</h3>
            <p className="text-xs text-gray-500">DHIS2 reports more admissions than IMAM</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Facility</th><th>LGA</th><th className="text-right">IMAM</th><th className="text-right">DHIS2</th><th className="text-right">Gap</th><th className="text-right">Gap %</th></tr>
              </thead>
              <tbody>
                {topNegative.map((f, i) => (
                  <tr key={i}>
                    <td className="font-medium max-w-[200px] truncate">{f.facility_name}</td>
                    <td>{f.lga_normalized}</td>
                    <td className="text-right">{fmtNum(f.imam_admissions)}</td>
                    <td className="text-right">{fmtNum(f.dhis2_sam_admitted)}</td>
                    <td className="text-right text-blue-600 font-medium">{fmtNum(f.imam_dhis2_diff)}</td>
                    <td className="text-right">{fmtPct(f.imam_dhis2_gap_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
