import { useMemo } from 'react'
import SectionHeader from '../components/SectionHeader'
import ChartCard from '../components/ChartCard'
import EChart from '../components/EChart'
import InsightPanel from '../components/InsightPanel'
import KpiCard from '../components/KpiCard'
import { useFilters, filterByState, getStateSummary } from '../hooks/useData'
import { fmtNum, fmtPct, COLORS } from '../utils/format'
import type { Facility, LgaSummary, MonthlyTrend } from '../types'

interface Props {
  data: {
    facilities: Facility[]
    lgaSummary: LgaSummary[]
    stateSummary: any[]
    monthlyTrends: MonthlyTrend[]
  }
}

export default function RutfAnalysis({ data }: Props) {
  const { stateFilter } = useFilters()
  const facs = filterByState(data.facilities, stateFilter)
  const lgas = filterByState(data.lgaSummary, stateFilter)
  const summary = getStateSummary(data.stateSummary, stateFilter)
  const trends = filterByState(data.monthlyTrends, stateFilter)

  const facsWithRutf = useMemo(() => facs.filter(f => f.rutf_utilized_sachets > 0), [facs])
  const lgasWithRutf = useMemo(() => lgas.filter(l => l.rutf_utilized > 0), [lgas])

  const hasRutfData = useMemo(() => {
    if (stateFilter === 'Kano') return false
    if (stateFilter === 'Combined') return true
    return true
  }, [stateFilter])

  const hasLmdData = useMemo(() => {
    if (stateFilter === 'Kano') return false
    return true
  }, [stateFilter])

  // ── Chart A: Monthly RUTF Trends ──
  const monthlyChart = useMemo(() => {
    if (!hasRutfData && stateFilter === 'Kano') return null

    const sorted = [...trends].sort((a, b) => a.period.localeCompare(b.period))
    const kadunaTrends = stateFilter === 'Combined'
      ? data.monthlyTrends.filter(t => t.state === 'Kaduna').sort((a, b) => a.period.localeCompare(b.period))
      : sorted

    const sourceData = stateFilter === 'Kano' ? sorted : kadunaTrends
    const periods = sourceData.map(t => t.period)

    if (stateFilter === 'Combined') {
      const kanoTrends = data.monthlyTrends.filter(t => t.state === 'Kano').sort((a, b) => a.period.localeCompare(b.period))
      const allPeriods = [...new Set([...kadunaTrends.map(t => t.period), ...kanoTrends.map(t => t.period)])].sort()
      const kdMap = Object.fromEntries(kadunaTrends.map(t => [t.period, t]))
      const knMap = Object.fromEntries(kanoTrends.map(t => [t.period, t]))

      return {
        tooltip: {
          trigger: 'axis' as const,
          formatter: (params: any) => {
            if (!params?.length) return ''
            let html = `<strong>${params[0].axisValue}</strong>`
            for (const p of params) {
              if (p.value != null) html += `<br/>${p.marker} ${p.seriesName}: ${fmtNum(p.value)}`
            }
            return html
          },
        },
        legend: { top: 0, textStyle: { fontSize: 11 } },
        grid: { left: 70, right: 30, top: 50, bottom: 40 },
        xAxis: { type: 'category' as const, data: allPeriods, axisLabel: { fontSize: 10, rotate: 30 } },
        yAxis: {
          type: 'value' as const,
          name: 'RUTF sachets',
          nameTextStyle: { fontSize: 10 },
          axisLabel: { fontSize: 10, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}` },
        },
        series: [
          {
            name: 'Estimated need (adm × 150)',
            type: 'line' as const,
            data: allPeriods.map(p => {
              const kd = kdMap[p]?.sam_admissions || 0
              const kn = knMap[p]?.sam_admissions || 0
              return (kd + kn) * 150 || null
            }),
            lineStyle: { color: COLORS.primary, width: 2 },
            itemStyle: { color: COLORS.primary },
            symbol: 'circle' as const,
            symbolSize: 4,
            connectNulls: false,
          },
          {
            name: 'IMAM RUTF utilised',
            type: 'line' as const,
            data: allPeriods.map(p => {
              const kd = kdMap[p]?.rutf_utilized || 0
              return kd > 0 ? kd : null
            }),
            lineStyle: { color: COLORS.accent, width: 2 },
            itemStyle: { color: COLORS.accent },
            symbol: 'circle' as const,
            symbolSize: 4,
            connectNulls: false,
          },
          {
            name: 'IMAM RUTF received',
            type: 'line' as const,
            data: allPeriods.map(p => {
              const kd = kdMap[p]?.rutf_received || 0
              return kd > 0 ? kd : null
            }),
            lineStyle: { color: COLORS.amber, width: 2, type: 'dashed' as const },
            itemStyle: { color: COLORS.amber },
            symbol: 'diamond' as const,
            symbolSize: 4,
            connectNulls: false,
          },
          {
            name: 'LMD RUTF distributed',
            type: 'bar' as const,
            data: allPeriods.map(p => {
              const kd = kdMap[p]?.lmd_rutf || 0
              return kd > 0 ? kd : null
            }),
            itemStyle: { color: '#22c55e', opacity: 0.5 },
            barMaxWidth: 20,
          },
        ],
      }
    }

    return {
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: any) => {
          if (!params?.length) return ''
          let html = `<strong>${params[0].axisValue}</strong>`
          for (const p of params) {
            if (p.value != null) html += `<br/>${p.marker} ${p.seriesName}: ${fmtNum(p.value)}`
          }
          return html
        },
      },
      legend: { top: 0, textStyle: { fontSize: 11 } },
      grid: { left: 70, right: 30, top: 50, bottom: 40 },
      xAxis: { type: 'category' as const, data: periods, axisLabel: { fontSize: 10, rotate: 30 } },
      yAxis: {
        type: 'value' as const,
        name: 'RUTF sachets',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 10, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}` },
      },
      series: [
        {
          name: 'Estimated need (adm × 150)',
          type: 'line' as const,
          data: sourceData.map(t => t.sam_admissions > 0 ? t.sam_admissions * 150 : null),
          lineStyle: { color: COLORS.primary, width: 2 },
          itemStyle: { color: COLORS.primary },
          symbol: 'circle' as const,
          symbolSize: 4,
          connectNulls: false,
        },
        {
          name: 'IMAM RUTF utilised',
          type: 'line' as const,
          data: sourceData.map(t => t.rutf_utilized > 0 ? t.rutf_utilized : null),
          lineStyle: { color: COLORS.accent, width: 2 },
          itemStyle: { color: COLORS.accent },
          symbol: 'circle' as const,
          symbolSize: 4,
          connectNulls: false,
        },
        {
          name: 'IMAM RUTF received',
          type: 'line' as const,
          data: sourceData.map(t => t.rutf_received > 0 ? t.rutf_received : null),
          lineStyle: { color: COLORS.amber, width: 2, type: 'dashed' as const },
          itemStyle: { color: COLORS.amber },
          symbol: 'diamond' as const,
          symbolSize: 4,
          connectNulls: false,
        },
        {
          name: 'LMD RUTF distributed',
          type: 'bar' as const,
          data: sourceData.map(t => t.lmd_rutf > 0 ? t.lmd_rutf : null),
          itemStyle: { color: '#22c55e', opacity: 0.5 },
          barMaxWidth: 20,
        },
      ],
    }
  }, [trends, data.monthlyTrends, stateFilter, hasRutfData])

  // ── Chart B: Three-Way RUTF Comparison by LGA (dot chart) ──
  const lgaDotChart = useMemo(() => {
    if (!hasRutfData) return null

    const sorted = [...lgasWithRutf]
      .sort((a, b) => b.rutf_implied - a.rutf_implied)
    const names = sorted.map(l => l.lga_normalized).reverse()
    const needData = sorted.map(l => l.rutf_implied).reverse()
    const imamData = sorted.map(l => l.rutf_utilized).reverse()
    const lmdData = sorted.map(l => l.lmd_rutf).reverse()

    return {
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: any) => {
          if (!params?.length) return ''
          const lga = names[params[0].dataIndex]
          let html = `<strong>${lga}</strong>`
          for (const p of params) {
            if (p.value != null && p.value > 0) {
              html += `<br/>${p.marker} ${p.seriesName}: ${fmtNum(p.value)}`
            }
          }
          return html
        },
      },
      legend: { top: 0, textStyle: { fontSize: 11 }, data: ['Estimated need', 'IMAM utilised', 'LMD distributed'] },
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
          name: 'Estimated need',
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
  }, [lgasWithRutf, hasRutfData])

  // ── Chart C: Facility RUTF Quadrant Scatter ──
  const quadrantData = useMemo(() => {
    const eligible = facs.filter(f =>
      f.rutf_utilized_sachets > 0 && f.lmd_rutf_sachets > 0 && f.rutf_implied_sachets > 0
    )
    const excluded = facs.length - eligible.length

    const points = eligible.map(f => {
      const xRatio = f.rutf_utilized_sachets / f.rutf_implied_sachets
      const yRatio = f.lmd_rutf_sachets / f.rutf_implied_sachets
      let quadrant: string
      let color: string
      if (xRatio >= 1 && yRatio >= 1) {
        quadrant = 'Both ≥ need'
        color = '#22c55e'
      } else if (xRatio < 1 && yRatio >= 1) {
        quadrant = 'LMD ≥ need, IMAM < need'
        color = COLORS.amber
      } else if (xRatio >= 1 && yRatio < 1) {
        quadrant = 'IMAM ≥ need, LMD < need'
        color = COLORS.primary
      } else {
        quadrant = 'Both < need'
        color = COLORS.red
      }
      return {
        value: [xRatio, yRatio],
        facility: f.facility_name,
        state: f.state,
        lga: f.lga_normalized,
        admissions: f.imam_admissions,
        rutfUtilised: f.rutf_utilized_sachets,
        lmdDistributed: f.lmd_rutf_sachets,
        implied: f.rutf_implied_sachets,
        quadrant,
        itemStyle: { color },
      }
    })

    return { points, eligible: eligible.length, excluded }
  }, [facs])

  const quadrantChart = useMemo(() => {
    if (quadrantData.eligible === 0) return null

    const maxX = Math.max(...quadrantData.points.map(p => p.value[0] as number), 2)
    const maxY = Math.max(...quadrantData.points.map(p => p.value[1] as number), 2)

    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: (params: any) => {
          const d = params.data
          return `<strong>${d.facility}</strong><br/>
            ${d.state} — ${d.lga}<br/>
            Admissions: ${fmtNum(d.admissions)}<br/>
            RUTF utilised: ${fmtNum(d.rutfUtilised)}<br/>
            LMD distributed: ${fmtNum(d.lmdDistributed)}<br/>
            Implied need: ${fmtNum(d.implied)}<br/>
            Utilisation ratio: ${(d.value[0] as number).toFixed(2)}<br/>
            Distribution ratio: ${(d.value[1] as number).toFixed(2)}<br/>
            <em>${d.quadrant}</em>`
        },
      },
      grid: { left: 60, right: 30, top: 30, bottom: 50 },
      xAxis: {
        type: 'value' as const,
        name: 'IMAM utilised / estimated need',
        nameLocation: 'middle' as const,
        nameGap: 30,
        max: Math.min(maxX * 1.1, 5),
        axisLabel: { fontSize: 10 },
      },
      yAxis: {
        type: 'value' as const,
        name: 'LMD distributed / estimated need',
        nameLocation: 'middle' as const,
        nameGap: 40,
        max: Math.min(maxY * 1.1, 5),
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          type: 'scatter' as const,
          symbolSize: 8,
          data: quadrantData.points,
        },
        {
          type: 'line' as const,
          data: [[1, 0], [1, Math.min(maxY * 1.1, 5)]],
          lineStyle: { color: '#9ca3af', type: 'dashed' as const, width: 1 },
          symbol: 'none' as const,
          tooltip: { show: false },
          silent: true,
        },
        {
          type: 'line' as const,
          data: [[0, 1], [Math.min(maxX * 1.1, 5), 1]],
          lineStyle: { color: '#9ca3af', type: 'dashed' as const, width: 1 },
          symbol: 'none' as const,
          tooltip: { show: false },
          silent: true,
        },
      ],
    }
  }, [quadrantData])

  // ── Existing: Three-Way bar chart by LGA ──
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

  // ── Existing: Ratio scatter ──
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

  // ── Insights ──
  const insights = useMemo(() => {
    const ins: string[] = []
    if (summary) {
      if (summary.rutf_utilized_sachets > 0) {
        ins.push(`Total RUTF utilised: ${fmtNum(summary.rutf_utilized_sachets)} sachets. Admissions-implied requirement: ${fmtNum(summary.rutf_implied_sachets)} sachets (at 150 sachets per child).`)
        const ratio = summary.rutf_utilized_sachets / summary.rutf_implied_sachets
        ins.push(`RUTF utilisation-to-implied ratio: ${ratio.toFixed(2)}. ${ratio > 1.5 ? 'Substantially more RUTF utilised than admissions would imply — may indicate under-reporting of admissions or carry-over stock use.' : ratio < 0.7 ? 'Less RUTF utilised than admissions would imply — may indicate supply shortages or over-reporting of admissions.' : 'Broadly consistent with the 150 sachets per child assumption.'}`)
      }
      if (summary.lmd_rutf_sachets > 0) {
        ins.push(`LMD records show ${fmtNum(summary.lmd_rutf_sachets)} sachets distributed. LMD data may cover a shorter period and represent dispatch rather than facility receipt.`)
      }
    }
    if (stateFilter === 'Kano') {
      ins.push('Kano RUTF utilisation and LMD distribution data is not available. Admissions-implied estimates are shown based on primary data admissions.')
    }
    if (quadrantData.excluded > 0 && quadrantData.eligible > 0) {
      ins.push(`Facility quadrant analysis: ${quadrantData.eligible} facilities plotted, ${quadrantData.excluded} excluded (missing RUTF utilisation, LMD distribution, or zero admissions).`)
    }
    return ins
  }, [summary, stateFilter, quadrantData])

  const dataAvailNote = stateFilter === 'Kano'
    ? 'Kano has admissions data from primary sources but no RUTF utilisation or LMD distribution records.'
    : stateFilter === 'Kaduna'
      ? 'Kaduna: 24 months of RUTF utilisation, receipt, and LMD distribution data (Sep 2024 – Aug 2026).'
      : 'Kaduna: 24 months RUTF data. Kano: admissions data only (no RUTF utilisation/LMD).'

  return (
    <div>
      <SectionHeader
        title="RUTF Supply and Treatment Alignment"
        description="Three-way comparison of IMAM-reported RUTF utilisation, LMD distribution records, and admissions-implied requirements (150 sachets per child). Where LMD data covers fewer months, comparisons are flagged."
        badge={stateFilter}
      />

      {/* 1. Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
        <KpiCard label="RUTF Utilised" value={summary && summary.rutf_utilized_sachets > 0 ? fmtNum(summary.rutf_utilized_sachets) : '—'} sub={summary && summary.rutf_utilized_sachets > 0 ? 'sachets (IMAM)' : 'Not available'} />
        <KpiCard label="RUTF Received" value={summary && summary.rutf_received_sachets > 0 ? fmtNum(summary.rutf_received_sachets) : '—'} sub={summary && summary.rutf_received_sachets > 0 ? 'sachets (IMAM)' : 'Not available'} />
        <KpiCard label="LMD Distributed" value={summary && summary.lmd_rutf_sachets > 0 ? fmtNum(summary.lmd_rutf_sachets) : '—'} sub={summary && summary.lmd_rutf_sachets > 0 ? 'sachets' : 'Not available'} />
        <KpiCard label="Implied Requirement" value={summary ? fmtNum(summary.rutf_implied_sachets) : '—'} sub="150 sachets × admissions" />
      </div>
      <p className="text-[11px] text-slate-500 mb-4 italic">{dataAvailNote}</p>

      <InsightPanel insights={insights} />

      {/* 2. Chart A: Monthly RUTF Trends — full width */}
      <div className="mt-6">
        <ChartCard
          title="Monthly RUTF Requirements, Utilisation, and Receipts"
          subtitle="Estimated need (admissions × 150), IMAM RUTF utilised, IMAM RUTF received, and LMD RUTF distributed by month (where available)."
          source="IMAM programme data, DHIS2"
        >
          {monthlyChart ? (
            <EChart option={monthlyChart} height={400} />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
              RUTF utilisation data is not available for Kano. Only admissions-implied estimates can be shown.
            </div>
          )}
        </ChartCard>
      </div>

      {/* 3 & 4. Chart B (LGA dots) + Chart C (quadrant scatter) — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <ChartCard
          title="Three-Way RUTF Comparison by LGA"
          subtitle="Estimated need, IMAM utilised, and LMD distributed — overlapping reporting months"
          source="IMAM Frame v5, LMD records"
        >
          {lgaDotChart ? (
            <EChart option={lgaDotChart} height={Math.max(450, lgasWithRutf.length * 28)} />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
              RUTF comparison data is not available for {stateFilter === 'Kano' ? 'Kano' : 'the selected state'}.
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Facility RUTF Supply and Utilisation Quadrants"
          subtitle={quadrantData.eligible > 0
            ? `${quadrantData.eligible} facilities plotted (${quadrantData.excluded} excluded — missing data). X: utilisation ratio, Y: distribution ratio. Dashed lines = 1.0 (estimated need).`
            : 'Facility-level RUTF quadrant analysis'}
          source="IMAM Frame v5, LMD records"
        >
          {quadrantChart ? (
            <EChart option={quadrantChart} height={450} />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
              {stateFilter === 'Kano'
                ? 'Quadrant analysis requires both RUTF utilisation and LMD distribution data, which are not available for Kano.'
                : `No facilities have both RUTF utilisation and LMD distribution data. ${quadrantData.excluded} facilities excluded.`}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Quadrant legend */}
      {quadrantChart && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600 px-1">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} /> Both ≥ need</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: COLORS.amber }} /> LMD ≥ need, IMAM &lt; need</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: COLORS.primary }} /> IMAM ≥ need, LMD &lt; need</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: COLORS.red }} /> Both &lt; need</span>
        </div>
      )}

      {/* 5. Existing complementary analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {lgasWithRutf.length > 0 && (
          <ChartCard title="Three-Way RUTF Comparison by LGA (Bar)" subtitle="IMAM utilised vs LMD distributed vs admissions-implied" source="IMAM Frame v5, LMD records">
            <EChart option={threeWayChart} height={450} />
          </ChartCard>
        )}
        {facsWithRutf.length > 0 && (
          <ChartCard title="RUTF Utilised vs Admissions-Implied" subtitle="Facility-level scatter. Dashed line = 1:1 ratio." source="IMAM Sampling Frame v5">
            <EChart option={ratioScatter} height={450} />
          </ChartCard>
        )}
      </div>

      {/* Facility RUTF detail table */}
      <div className="mt-4 card">
        <div className="card-header">
          <h3 className="text-sm font-semibold">Facility RUTF Detail — All Facilities</h3>
          <p className="text-xs text-gray-500">Ranked by RUTF utilised, highest to lowest. {stateFilter === 'Kano' ? 'Kano RUTF data is not available — showing admissions only.' : ''}</p>
        </div>
        <div className="overflow-x-auto max-h-[600px]">
          <table className="data-table">
            <thead className="sticky top-0">
              <tr>
                <th>#</th>
                <th>Facility</th><th>LGA</th><th>State</th>
                <th className="text-right">Admissions</th>
                <th className="text-right">RUTF Utilised</th><th className="text-right">RUTF Received</th>
                <th className="text-right">LMD</th><th className="text-right">Implied</th><th className="text-right">Ratio</th>
              </tr>
            </thead>
            <tbody>
              {[...facs]
                .sort((a, b) => b.rutf_utilized_sachets - a.rutf_utilized_sachets)
                .map((f, i) => {
                  const ratio = f.rutf_implied_sachets > 0 && f.rutf_utilized_sachets > 0 ? (f.rutf_utilized_sachets / f.rutf_implied_sachets).toFixed(2) : '—'
                  return (
                    <tr key={i}>
                      <td className="text-slate-400 text-xs">{i + 1}</td>
                      <td className="font-medium max-w-[200px] truncate">{f.facility_name}</td>
                      <td>{f.lga_normalized}</td>
                      <td>{f.state}</td>
                      <td className="text-right">{fmtNum(f.imam_admissions)}</td>
                      <td className="text-right">{f.rutf_utilized_sachets > 0 ? fmtNum(f.rutf_utilized_sachets) : '—'}</td>
                      <td className="text-right">{f.rutf_received_sachets > 0 ? fmtNum(f.rutf_received_sachets) : '—'}</td>
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

      {/* Data notes */}
      <div className="mt-4 p-3 bg-gray-100 rounded-lg text-[11px] text-gray-500 space-y-1">
        <p><strong>Data quality notes:</strong> RUTF planning assumption: 150 sachets per child. LMD data may cover a shorter reporting period and represent dispatch rather than facility receipt.</p>
        <p>Ratios below 1.0 do not conclusively indicate inadequate supply — inventory changes, distribution timing, treatment duration, and reporting completeness affect observed values.</p>
        {stateFilter !== 'Kaduna' && <p>Kano RUTF utilisation and LMD distribution data is not currently available from the Kano primary data source.</p>}
      </div>
    </div>
  )
}
