import { useMemo } from 'react'
import SectionHeader from '../components/SectionHeader'
import ChartCard from '../components/ChartCard'
import EChart from '../components/EChart'
import InsightPanel from '../components/InsightPanel'
import KpiCard from '../components/KpiCard'
import { useFilters, filterByState, getStateSummary } from '../hooks/useData'
import { fmtNum, COLORS } from '../utils/format'
import type { Facility, LgaSummary } from '../types'

interface Props {
  data: {
    facilities: Facility[]
    lgaSummary: LgaSummary[]
    stateSummary: any[]
  }
}

export default function RutfAnalysis({ data }: Props) {
  const { stateFilter } = useFilters()
  const facs = filterByState(data.facilities, stateFilter)
  const lgas = filterByState(data.lgaSummary, stateFilter)
  const summary = getStateSummary(data.stateSummary, stateFilter)

  const facsWithRutf = useMemo(() => facs.filter(f => f.rutf_utilized_sachets > 0), [facs])
  const lgasWithRutf = useMemo(() => lgas.filter(l => l.rutf_utilized > 0), [lgas])

  const threeWayChart = useMemo(() => {
    const sorted = [...lgasWithRutf].sort((a, b) => b.rutf_utilized - a.rutf_utilized).slice(0, 15)
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      grid: { left: 130, right: 30, top: 10, bottom: 40 },
      xAxis: { type: 'value' as const, name: 'Sachets', axisLabel: { fontSize: 10 } },
      yAxis: {
        type: 'category' as const,
        data: sorted.map(l => l.lga_normalized).reverse(),
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          name: 'IMAM RUTF Utilised',
          type: 'bar' as const,
          data: sorted.map(l => l.rutf_utilized).reverse(),
          itemStyle: { color: COLORS.primary },
          barMaxWidth: 12,
        },
        {
          name: 'LMD RUTF Distributed',
          type: 'bar' as const,
          data: sorted.map(l => l.lmd_rutf).reverse(),
          itemStyle: { color: COLORS.teal },
          barMaxWidth: 12,
        },
        {
          name: 'Admissions-Implied (150/child)',
          type: 'bar' as const,
          data: sorted.map(l => l.rutf_implied).reverse(),
          itemStyle: { color: COLORS.accent },
          barMaxWidth: 12,
        },
      ],
    }
  }, [lgasWithRutf])

  const ratioScatter = useMemo(() => ({
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: any) => {
        const d = p.data
        return `<strong>${d[3]}</strong><br/>RUTF Utilised: ${fmtNum(d[0])}<br/>Admissions-Implied: ${fmtNum(d[1])}<br/>Ratio: ${(d[0] / Math.max(d[1], 1)).toFixed(2)}`
      },
    },
    grid: { left: 70, right: 30, top: 30, bottom: 50 },
    xAxis: { type: 'value' as const, name: 'RUTF Utilised (sachets)', nameLocation: 'middle' as const, nameGap: 30, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value' as const, name: 'Admissions-Implied (sachets)', nameLocation: 'middle' as const, nameGap: 50, axisLabel: { fontSize: 10 } },
    series: [
      {
        type: 'scatter' as const,
        symbolSize: 8,
        data: facsWithRutf.map(f => [f.rutf_utilized_sachets, f.rutf_implied_sachets, f.lga_normalized, f.facility_name]),
        itemStyle: { color: COLORS.teal, opacity: 0.6 },
      },
      {
        type: 'line' as const,
        data: [[0, 0], [Math.max(...facsWithRutf.map(f => f.rutf_utilized_sachets), 1000), Math.max(...facsWithRutf.map(f => f.rutf_utilized_sachets), 1000)]],
        lineStyle: { color: '#9ca3af', type: 'dashed' as const, width: 1 },
        symbol: 'none',
        tooltip: { show: false },
      },
    ],
  }), [facsWithRutf])

  const insights = useMemo(() => {
    const ins: string[] = []
    if (summary) {
      ins.push(`Total RUTF utilised: ${fmtNum(summary.rutf_utilized_sachets)} sachets. Admissions-implied requirement: ${fmtNum(summary.rutf_implied_sachets)} sachets (at 150 sachets per child).`)
      if (summary.rutf_utilized_sachets > 0 && summary.rutf_implied_sachets > 0) {
        const ratio = summary.rutf_utilized_sachets / summary.rutf_implied_sachets
        ins.push(`RUTF utilisation-to-implied ratio: ${ratio.toFixed(2)}. ${ratio > 1.5 ? 'Substantially more RUTF utilised than admissions would imply — may indicate under-reporting of admissions or carry-over stock use.' : ratio < 0.7 ? 'Less RUTF utilised than admissions would imply — may indicate supply shortages or over-reporting of admissions.' : 'Broadly consistent with the 150 sachets per child assumption.'}`)
      }
      if (summary.lmd_rutf_sachets > 0) {
        ins.push(`LMD records show ${fmtNum(summary.lmd_rutf_sachets)} sachets distributed. Note: LMD data may cover a shorter period and represent dispatch rather than facility receipt.`)
      } else {
        ins.push('LMD RUTF distribution data is limited or not available for the full reporting period.')
      }
    }
    return ins
  }, [summary])

  return (
    <div>
      <SectionHeader
        title="RUTF Supply and Treatment Alignment"
        description="Three-way comparison of IMAM-reported RUTF utilisation, LMD distribution records, and admissions-implied requirements (150 sachets per child). Where LMD data covers fewer months, comparisons are flagged."
        badge={stateFilter}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="RUTF Utilised" value={summary ? fmtNum(summary.rutf_utilized_sachets) : '—'} sub="sachets (IMAM)" />
        <KpiCard label="RUTF Received" value={summary ? fmtNum(summary.rutf_received_sachets) : '—'} sub="sachets (IMAM)" />
        <KpiCard label="LMD Distributed" value={summary && summary.lmd_rutf_sachets > 0 ? fmtNum(summary.lmd_rutf_sachets) : '—'} sub={summary && summary.lmd_rutf_sachets > 0 ? 'sachets' : 'Data limited'} />
        <KpiCard label="Implied Requirement" value={summary ? fmtNum(summary.rutf_implied_sachets) : '—'} sub="150 sachets × admissions" />
      </div>

      <InsightPanel insights={insights} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <ChartCard title="Three-Way RUTF Comparison by LGA" subtitle="IMAM utilised vs LMD distributed vs admissions-implied" source="IMAM Frame v5, LMD records">
          <EChart option={threeWayChart} height={450} />
        </ChartCard>
        <ChartCard title="RUTF Utilised vs Admissions-Implied" subtitle="Facility-level scatter. Dashed line = 1:1 ratio." source="IMAM Sampling Frame v5">
          <EChart option={ratioScatter} height={450} />
        </ChartCard>
      </div>

      <div className="mt-4 card">
        <div className="card-header">
          <h3 className="text-sm font-semibold">Facility RUTF Detail</h3>
        </div>
        <div className="overflow-x-auto max-h-[400px]">
          <table className="data-table">
            <thead className="sticky top-0">
              <tr>
                <th>Facility</th><th>LGA</th><th>State</th>
                <th className="text-right">RUTF Utilised</th><th className="text-right">RUTF Received</th>
                <th className="text-right">LMD</th><th className="text-right">Implied</th><th className="text-right">Ratio</th>
              </tr>
            </thead>
            <tbody>
              {facsWithRutf
                .sort((a, b) => b.rutf_utilized_sachets - a.rutf_utilized_sachets)
                .slice(0, 50)
                .map((f, i) => {
                  const ratio = f.rutf_implied_sachets > 0 ? (f.rutf_utilized_sachets / f.rutf_implied_sachets).toFixed(2) : '—'
                  return (
                    <tr key={i}>
                      <td className="font-medium max-w-[200px] truncate">{f.facility_name}</td>
                      <td>{f.lga_normalized}</td>
                      <td>{f.state}</td>
                      <td className="text-right">{fmtNum(f.rutf_utilized_sachets)}</td>
                      <td className="text-right">{fmtNum(f.rutf_received_sachets)}</td>
                      <td className="text-right">{f.lmd_rutf_sachets > 0 ? fmtNum(f.lmd_rutf_sachets) : '—'}</td>
                      <td className="text-right">{fmtNum(f.rutf_implied_sachets)}</td>
                      <td className="text-right">{ratio}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
