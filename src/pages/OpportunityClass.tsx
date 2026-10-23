import { useMemo } from 'react'
import SectionHeader from '../components/SectionHeader'
import ChartCard from '../components/ChartCard'
import EChart from '../components/EChart'
import InsightPanel from '../components/InsightPanel'
import KpiCard from '../components/KpiCard'
import { useFilters, filterByState } from '../hooks/useData'
import { fmtNum, fmtPct, COLORS, OPPORTUNITY_COLORS } from '../utils/format'
import type { Facility } from '../types'

interface Props {
  data: { facilities: Facility[] }
}

const CLASS_DESCRIPTIONS: Record<string, string> = {
  'Functioning': 'Cure rate ≥75%, default rate ≤15%, reconciliation gap ≤30%. Meeting SPHERE standards with acceptable reporting consistency.',
  'Moderate': 'Both quality concerns and reconciliation issues present. Requires attention across multiple dimensions.',
  'Needs Reconciliation': 'Treatment outcomes meet standards but IMAM–DHIS2 gap exceeds 30%. Reporting systems need alignment.',
  'Quality Concern': 'Cure rate below 75% or default rate above 15%. Treatment quality warrants investigation regardless of reconciliation status.',
  'Insufficient Data': 'Not enough discharge data to calculate outcome rates. Cannot classify programme performance.',
}

export default function OpportunityClass({ data }: Props) {
  const { stateFilter } = useFilters()
  const facs = filterByState(data.facilities, stateFilter)

  const classCounts = useMemo(() => {
    const counts: Record<string, { count: number; admissions: number }> = {}
    for (const f of facs) {
      if (!counts[f.opportunity_class]) counts[f.opportunity_class] = { count: 0, admissions: 0 }
      counts[f.opportunity_class].count++
      counts[f.opportunity_class].admissions += f.imam_admissions
    }
    return counts
  }, [facs])

  const classOrder = ['Functioning', 'Moderate', 'Needs Reconciliation', 'Quality Concern', 'Insufficient Data']

  const barChart = useMemo(() => ({
    tooltip: { trigger: 'axis' as const },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 50, right: 30, top: 10, bottom: 40 },
    xAxis: { type: 'category' as const, data: classOrder, axisLabel: { fontSize: 10, rotate: 15 } },
    yAxis: { type: 'value' as const, axisLabel: { fontSize: 10 } },
    series: [
      {
        name: 'Facilities',
        type: 'bar' as const,
        data: classOrder.map(c => ({
          value: classCounts[c]?.count || 0,
          itemStyle: { color: OPPORTUNITY_COLORS[c] || COLORS.gray },
        })),
        barMaxWidth: 50,
      },
    ],
  }), [classCounts])

  const admissionsChart = useMemo(() => ({
    tooltip: { trigger: 'item' as const },
    series: [{
      type: 'pie' as const,
      radius: ['40%', '70%'],
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, fontSize: 10, formatter: '{b}\n{c} ({d}%)' },
      data: classOrder
        .filter(c => classCounts[c])
        .map(c => ({
          name: c,
          value: classCounts[c].admissions,
          itemStyle: { color: OPPORTUNITY_COLORS[c] || COLORS.gray },
        })),
    }],
  }), [classCounts])

  const stateCompChart = useMemo(() => {
    if (stateFilter !== 'Combined') return null
    const states = ['Kaduna', 'Kano']
    const series = classOrder.map(cls => ({
      name: cls,
      type: 'bar' as const,
      stack: 'total',
      data: states.map(st => facs.filter(f => f.state === st && f.opportunity_class === cls).length),
      itemStyle: { color: OPPORTUNITY_COLORS[cls] || COLORS.gray },
      barMaxWidth: 60,
    }))
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 0, textStyle: { fontSize: 10 } },
      grid: { left: 50, right: 30, top: 10, bottom: 60 },
      xAxis: { type: 'category' as const, data: states, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value' as const, name: 'Facilities', axisLabel: { fontSize: 10 } },
      series,
    }
  }, [stateFilter, facs])

  const insights = useMemo(() => {
    const ins: string[] = []
    const func = classCounts['Functioning']
    const qc = classCounts['Quality Concern']
    if (func) ins.push(`${func.count} facilities (${(func.count / facs.length * 100).toFixed(0)}%) are classified as Functioning — meeting both treatment quality and reconciliation standards.`)
    if (qc) ins.push(`${qc.count} facilities show Quality Concerns (cure <75% or default >15%). These warrant treatment protocol review.`)
    const recon = classCounts['Needs Reconciliation']
    if (recon) ins.push(`${recon.count} facilities need reconciliation — good treatment outcomes but IMAM–DHIS2 gap >30%, suggesting reporting system misalignment.`)
    return ins
  }, [classCounts, facs])

  return (
    <div>
      <SectionHeader
        title="Opportunity Classification"
        description="Facilities classified by treatment quality (SPHERE benchmarks) and reporting consistency (IMAM–DHIS2 reconciliation gap). Classifications combine both dimensions to prioritise different types of intervention."
        badge={stateFilter}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {classOrder.map(cls => (
          <KpiCard
            key={cls}
            label={cls}
            value={fmtNum(classCounts[cls]?.count || 0)}
            sub={`${fmtNum(classCounts[cls]?.admissions || 0)} adm.`}
            color={cls === 'Functioning' ? 'green' : cls === 'Quality Concern' ? 'red' : cls === 'Moderate' ? 'amber' : 'default'}
          />
        ))}
      </div>

      <InsightPanel insights={insights} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <ChartCard title="Facilities by Classification" source="Derived from IMAM–DHIS2 reconciliation and treatment outcomes">
          <EChart option={barChart} height={350} />
        </ChartCard>
        <ChartCard title="Admissions by Classification" source="IMAM Sampling Frame v5">
          <EChart option={admissionsChart} height={350} />
        </ChartCard>
      </div>

      {stateCompChart && (
        <div className="mt-4">
          <ChartCard title="Classification by State" subtitle="Kaduna vs Kano facility classification" source="IMAM Frame v5">
            <EChart option={stateCompChart} height={350} />
          </ChartCard>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {classOrder.map(cls => (
          <div key={cls} className="card">
            <div className="card-header flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: OPPORTUNITY_COLORS[cls] || COLORS.gray }}
              />
              <div>
                <h3 className="text-sm font-semibold">{cls}</h3>
                <p className="text-xs text-gray-500">{CLASS_DESCRIPTIONS[cls]}</p>
              </div>
              <span className="ml-auto badge badge-gray">{classCounts[cls]?.count || 0} facilities</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
