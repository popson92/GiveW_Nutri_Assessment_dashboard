import { useMemo } from 'react'
import SectionHeader from '../components/SectionHeader'
import ChartCard from '../components/ChartCard'
import EChart from '../components/EChart'
import InsightPanel from '../components/InsightPanel'
import KpiCard from '../components/KpiCard'
import { useFilters, filterByState, getStateSummary } from '../hooks/useData'
import { fmtNum, COLORS } from '../utils/format'
import type { Facility, Dhis2Only, LgaSummary } from '../types'

interface Props {
  data: {
    facilities: Facility[]
    dhis2Only: Dhis2Only[]
    lgaSummary: LgaSummary[]
    stateSummary: any[]
  }
}

export default function Footprint({ data }: Props) {
  const { stateFilter } = useFilters()
  const facs = filterByState(data.facilities, stateFilter)
  const dhis2Only = filterByState(data.dhis2Only, stateFilter)
  const lgas = filterByState(data.lgaSummary, stateFilter)
  const summary = getStateSummary(data.stateSummary, stateFilter)

  const matchedCount = useMemo(() => facs.filter(f => f.match_status === 'matched').length, [facs])
  const unmatchedCount = useMemo(() => facs.filter(f => f.match_status !== 'matched').length, [facs])

  const lgaStackedChart = useMemo(() => {
    const lgaMap: Record<string, { imam: number; dhis2Only: number; name: string }> = {}
    for (const l of lgas) {
      lgaMap[l.lga_normalized] = {
        name: l.lga_normalized,
        imam: l.imam_admissions,
        dhis2Only: l.dhis2_only_admissions || 0,
      }
    }
    const sorted = Object.values(lgaMap)
      .sort((a, b) => (b.imam + b.dhis2Only) - (a.imam + a.dhis2Only))
      .slice(0, 20)

    return {
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      grid: { left: 130, right: 30, top: 10, bottom: 40 },
      xAxis: { type: 'value' as const, axisLabel: { fontSize: 10 } },
      yAxis: {
        type: 'category' as const,
        data: sorted.map(l => l.name).reverse(),
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          name: 'IMAM Frame Admissions',
          type: 'bar' as const,
          stack: 'total',
          data: sorted.map(l => l.imam).reverse(),
          itemStyle: { color: COLORS.primary },
          barMaxWidth: 16,
        },
        {
          name: 'DHIS2-Only Admissions',
          type: 'bar' as const,
          stack: 'total',
          data: sorted.map(l => l.dhis2Only).reverse(),
          itemStyle: { color: COLORS.accent },
          barMaxWidth: 16,
        },
      ],
    }
  }, [lgas])

  const categoryPie = useMemo(() => {
    const categories = [
      { name: 'Matched IMAM–DHIS2', value: matchedCount, color: COLORS.primary },
      { name: 'IMAM Only (Unmatched)', value: unmatchedCount, color: COLORS.amber },
      { name: 'DHIS2-Only', value: dhis2Only.length, color: COLORS.accent },
    ]
    return {
      tooltip: { trigger: 'item' as const },
      series: [{
        type: 'pie' as const,
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, fontSize: 10, formatter: '{b}\n{c} ({d}%)' },
        data: categories.map(c => ({ name: c.name, value: c.value, itemStyle: { color: c.color } })),
      }],
    }
  }, [matchedCount, unmatchedCount, dhis2Only])

  const insights = useMemo(() => {
    const ins: string[] = []
    ins.push(`The IMAM frame comprises ${fmtNum(facs.length)} designated SAM treatment facilities. ${matchedCount} have confirmed DHIS2 matches, while ${unmatchedCount} remain unmatched.`)
    if (dhis2Only.length > 0) {
      const totalD2Adm = dhis2Only.reduce((s, d) => s + (d.sam_admitted || 0), 0)
      ins.push(`${fmtNum(dhis2Only.length)} additional facilities report SAM admissions in DHIS2 but are not in the IMAM frame, accounting for ${fmtNum(totalD2Adm)} admissions. These may represent recently added sites, facilities providing SAM treatment without official designation, or DHIS2 reporting artefacts.`)
    }
    return ins
  }, [facs, matchedCount, unmatchedCount, dhis2Only])

  return (
    <div>
      <SectionHeader
        title="Treatment Footprint and Potential Service Gaps"
        description="Comparison of facilities in the designated IMAM frame with additional DHIS2-only reporting sites. DHIS2-only facilities report SAM activity but are not part of the designated treatment programme frame."
        badge={stateFilter}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="IMAM Frame Facilities" value={fmtNum(facs.length)} sub="designated SAM sites" />
        <KpiCard label="Matched (IMAM+DHIS2)" value={fmtNum(matchedCount)} sub="confirmed matches" color="green" />
        <KpiCard label="IMAM Unmatched" value={fmtNum(unmatchedCount)} sub="no DHIS2 match found" color="amber" />
        <KpiCard label="DHIS2-Only Facilities" value={fmtNum(dhis2Only.length)} sub={`${fmtNum(dhis2Only.reduce((s, d) => s + (d.sam_admitted || 0), 0))} admissions`} color="amber" />
      </div>

      <InsightPanel insights={insights} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <ChartCard title="Facility Reporting Categories" subtitle="Distribution by matching status" source="IMAM Frame v5, DHIS2">
          <EChart option={categoryPie} height={350} />
        </ChartCard>
        <ChartCard title="LGA Admissions by Source" subtitle="IMAM frame vs DHIS2-only admissions (mutually exclusive)" source="IMAM Frame v5, DHIS2-only list">
          <EChart option={lgaStackedChart} height={450} />
        </ChartCard>
      </div>

      <div className="mt-4 card">
        <div className="card-header">
          <h3 className="text-sm font-semibold">DHIS2-Only Facilities</h3>
          <p className="text-xs text-gray-500">Facilities reporting SAM activity in DHIS2 but absent from the IMAM designated frame</p>
        </div>
        <div className="overflow-x-auto max-h-[400px]">
          <table className="data-table">
            <thead className="sticky top-0">
              <tr>
                <th>Facility</th><th>LGA</th><th>State</th>
                <th className="text-right">SAM Admitted</th><th className="text-right">SAM Treated</th>
                <th className="text-right">Months</th>
              </tr>
            </thead>
            <tbody>
              {[...dhis2Only]
                .sort((a, b) => (b.sam_admitted || 0) - (a.sam_admitted || 0))
                .slice(0, 50)
                .map((d, i) => (
                  <tr key={i}>
                    <td className="font-medium max-w-[250px] truncate">{d.facility}</td>
                    <td>{d.lga}</td>
                    <td>{d.state}</td>
                    <td className="text-right">{fmtNum(d.sam_admitted)}</td>
                    <td className="text-right">{fmtNum(d.sam_treated)}</td>
                    <td className="text-right">{d.months_reporting ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
