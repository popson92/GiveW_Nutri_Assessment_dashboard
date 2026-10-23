import { useMemo } from 'react'
import SectionHeader from '../components/SectionHeader'
import ChartCard from '../components/ChartCard'
import EChart from '../components/EChart'
import InsightPanel from '../components/InsightPanel'
import KpiCard from '../components/KpiCard'
import { useFilters, filterByState } from '../hooks/useData'
import { fmtNum, fmtPct, COLORS } from '../utils/format'
import type { Facility } from '../types'

interface Props {
  data: { facilities: Facility[] }
}

export default function Sampling({ data }: Props) {
  const { stateFilter } = useFilters()
  const facs = filterByState(data.facilities, stateFilter)

  const certainty = useMemo(() => facs.filter(f => f.sampling_status === 'certainty'), [facs])
  const posGap = useMemo(() => certainty.filter(f => f.sampling_stratum === 'positive_gap_top30')
    .sort((a, b) => (b.imam_dhis2_diff || 0) - (a.imam_dhis2_diff || 0)), [certainty])
  const negGap = useMemo(() => certainty.filter(f => f.sampling_stratum === 'negative_gap_top30')
    .sort((a, b) => (a.imam_dhis2_diff || 0) - (b.imam_dhis2_diff || 0)), [certainty])

  const posGapChart = useMemo(() => {
    const items = posGap.slice(0, 30)
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 180, right: 30, top: 10, bottom: 30 },
      xAxis: { type: 'value' as const, name: 'IMAM − DHIS2', axisLabel: { fontSize: 10 } },
      yAxis: {
        type: 'category' as const,
        data: items.map(f => f.facility_name.slice(0, 25)).reverse(),
        axisLabel: { fontSize: 9 },
      },
      series: [{
        type: 'bar' as const,
        data: items.map(f => f.imam_dhis2_diff || 0).reverse(),
        itemStyle: { color: COLORS.accent, borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 14,
      }],
    }
  }, [posGap])

  const negGapChart = useMemo(() => {
    const items = negGap.slice(0, 30)
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 180, right: 30, top: 10, bottom: 30 },
      xAxis: { type: 'value' as const, name: 'IMAM − DHIS2', axisLabel: { fontSize: 10 } },
      yAxis: {
        type: 'category' as const,
        data: items.map(f => f.facility_name.slice(0, 25)).reverse(),
        axisLabel: { fontSize: 9 },
      },
      series: [{
        type: 'bar' as const,
        data: items.map(f => f.imam_dhis2_diff || 0).reverse(),
        itemStyle: { color: COLORS.blue, borderRadius: [3, 0, 0, 3] },
        barMaxWidth: 14,
      }],
    }
  }, [negGap])

  const lgaDistChart = useMemo(() => {
    const lgaCounts: Record<string, number> = {}
    for (const f of certainty) {
      lgaCounts[f.lga_normalized] = (lgaCounts[f.lga_normalized] || 0) + 1
    }
    const sorted = Object.entries(lgaCounts).sort((a, b) => b[1] - a[1])
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 130, right: 30, top: 10, bottom: 30 },
      xAxis: { type: 'value' as const, axisLabel: { fontSize: 10 } },
      yAxis: {
        type: 'category' as const,
        data: sorted.map(s => s[0]).reverse(),
        axisLabel: { fontSize: 10 },
      },
      series: [{
        type: 'bar' as const,
        data: sorted.map(s => s[1]).reverse(),
        itemStyle: { color: COLORS.primary, borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 16,
      }],
    }
  }, [certainty])

  const insights = useMemo(() => {
    const ins: string[] = []
    ins.push(`${certainty.length} facilities are selected in the certainty stratum: ${posGap.length} with the largest positive IMAM–DHIS2 gaps and ${negGap.length} with the largest negative gaps.`)
    if (posGap.length > 0) {
      ins.push(`Top positive-gap facility: ${posGap[0].facility_name} (gap: +${fmtNum(posGap[0].imam_dhis2_diff)}, ${fmtPct(posGap[0].imam_dhis2_gap_pct)}).`)
    }
    if (negGap.length > 0) {
      ins.push(`Top negative-gap facility: ${negGap[0].facility_name} (gap: ${fmtNum(negGap[0].imam_dhis2_diff)}).`)
    }
    const lgasRepresented = new Set(certainty.map(f => f.lga_normalized)).size
    ins.push(`The certainty stratum covers facilities from ${lgasRepresented} LGAs. Each selected facility appears only once even if qualifying under multiple criteria.`)
    return ins
  }, [certainty, posGap, negGap])

  return (
    <div>
      <SectionHeader
        title="Facility Prioritisation and Sampling Intelligence"
        description="The GiveWell S3 Sampling Protocol v5 uses geographic, discrepancy, and extreme-case sampling. The certainty stratum comprises the 30 largest positive-gap and 30 largest negative-gap facilities for mandatory field verification."
        badge={stateFilter}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Certainty Stratum" value={fmtNum(certainty.length)} sub="selected for verification" color="blue" />
        <KpiCard label="Positive Gap (Top 30)" value={fmtNum(posGap.length)} sub="IMAM > DHIS2" />
        <KpiCard label="Negative Gap (Top 30)" value={fmtNum(negGap.length)} sub="DHIS2 > IMAM" />
        <KpiCard label="Total IMAM Facilities" value={fmtNum(facs.length)} sub="in sampling universe" />
      </div>

      <InsightPanel insights={insights} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <ChartCard title="Top 30 Positive Gap Facilities" subtitle="Facilities where IMAM reports substantially more than DHIS2" source="IMAM Frame v5">
          <EChart option={posGapChart} height={500} />
        </ChartCard>
        <ChartCard title="Top 30 Negative Gap Facilities" subtitle="Facilities where DHIS2 reports substantially more than IMAM" source="IMAM Frame v5">
          <EChart option={negGapChart} height={500} />
        </ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard title="Certainty Sample — LGA Distribution" subtitle="Number of certainty-selected facilities per LGA" source="Sampling Protocol v5">
          <EChart option={lgaDistChart} height={400} />
        </ChartCard>
      </div>

      <div className="mt-4 card">
        <div className="card-header">
          <h3 className="text-sm font-semibold">Certainty Stratum — Full Facility List</h3>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="data-table">
            <thead className="sticky top-0">
              <tr>
                <th>#</th><th>Facility</th><th>LGA</th><th>State</th><th>Stratum</th>
                <th className="text-right">IMAM Adm.</th><th className="text-right">DHIS2 Adm.</th>
                <th className="text-right">Gap</th><th className="text-right">Gap %</th>
                <th>Classification</th>
              </tr>
            </thead>
            <tbody>
              {certainty
                .sort((a, b) => Math.abs(b.imam_dhis2_diff || 0) - Math.abs(a.imam_dhis2_diff || 0))
                .map((f, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className="font-medium max-w-[200px] truncate">{f.facility_name}</td>
                    <td>{f.lga_normalized}</td>
                    <td>{f.state}</td>
                    <td>
                      <span className={`badge ${f.sampling_stratum === 'positive_gap_top30' ? 'badge-amber' : 'badge-blue'}`}>
                        {f.sampling_stratum === 'positive_gap_top30' ? 'Positive' : 'Negative'}
                      </span>
                    </td>
                    <td className="text-right">{fmtNum(f.imam_admissions)}</td>
                    <td className="text-right">{fmtNum(f.dhis2_sam_admitted)}</td>
                    <td className="text-right font-medium">
                      <span className={(f.imam_dhis2_diff || 0) > 0 ? 'text-amber-600' : 'text-blue-600'}>
                        {fmtNum(f.imam_dhis2_diff)}
                      </span>
                    </td>
                    <td className="text-right">{fmtPct(f.imam_dhis2_gap_pct)}</td>
                    <td><span className="badge badge-gray">{f.opportunity_class}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
