import { useMemo } from 'react'
import { Building2, Users, GitCompare, AlertTriangle, HeartPulse, Package, Map as MapIcon, Target } from 'lucide-react'
import KpiCard from '../components/KpiCard'
import SectionHeader from '../components/SectionHeader'
import ChartCard from '../components/ChartCard'
import InsightPanel from '../components/InsightPanel'
import EChart from '../components/EChart'
import { useFilters, filterByState, getStateSummary } from '../hooks/useData'
import { fmtNum, fmtPct, COLORS, STATE_COLORS, OPPORTUNITY_COLORS, SPHERE } from '../utils/format'
import type { Facility, StateSummary, LgaSummary } from '../types'

interface Props {
  data: {
    facilities: Facility[]
    stateSummary: StateSummary[]
    lgaSummary: LgaSummary[]
    monthlyTrends: any[]
    dhis2Only: any[]
  }
}

export default function Overview({ data }: Props) {
  const { stateFilter } = useFilters()
  const summary = getStateSummary(data.stateSummary, stateFilter)
  const facs = filterByState(data.facilities, stateFilter)
  const lgas = filterByState(data.lgaSummary, stateFilter)
  const dhis2Only = filterByState(data.dhis2Only, stateFilter)

  const insights = useMemo(() => {
    if (!summary) return []
    const ins: string[] = []
    ins.push(
      `${fmtNum(summary.imam_facilities)} IMAM-designated facilities report ${fmtNum(summary.imam_admissions)} SAM admissions across ${summary.lgas} LGAs in the assessment period (Sep 2024–Aug 2026).`
    )
    if (summary.imam_dhis2_gap_pct != null) {
      ins.push(
        `The IMAM–DHIS2 reconciliation gap stands at ${fmtPct(summary.imam_dhis2_gap_pct)}, representing ${fmtNum(summary.imam_dhis2_diff)} more admissions reported in IMAM than matched DHIS2 records.`
      )
    }
    if (summary.dhis2_only_facilities > 0) {
      ins.push(
        `${summary.dhis2_only_facilities} additional facilities report SAM activity in DHIS2 but are not in the designated IMAM frame, accounting for ${fmtNum(summary.dhis2_only_admissions)} admissions.`
      )
    }
    if (summary.cure_rate != null) {
      const meetsSphereCure = summary.cure_rate >= SPHERE.cureMin
      ins.push(
        `Pooled cure rate is ${fmtPct(summary.cure_rate)} (${meetsSphereCure ? 'meets' : 'below'} SPHERE ≥75% threshold), with a default rate of ${fmtPct(summary.default_rate)}.`
      )
    }
    return ins
  }, [summary])

  const stateComparisonChart = useMemo(() => {
    if (stateFilter !== 'Combined') return null
    const kd = data.stateSummary.find(s => s.state === 'Kaduna')
    const kn = data.stateSummary.find(s => s.state === 'Kano')
    if (!kd || !kn) return null

    return {
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'category' as const,
        data: ['IMAM Facilities', 'IMAM Admissions', 'DHIS2 Matched', 'DHIS2-Only Facs', 'DHIS2-Only Adm'],
        axisLabel: { fontSize: 10, rotate: 15 },
      },
      yAxis: { type: 'value' as const, axisLabel: { fontSize: 10 } },
      series: [
        {
          name: 'Kaduna',
          type: 'bar' as const,
          data: [kd.imam_facilities, kd.imam_admissions, kd.dhis2_admissions_matched || 0, kd.dhis2_only_facilities, kd.dhis2_only_admissions],
          itemStyle: { color: COLORS.kaduna },
          barMaxWidth: 40,
        },
        {
          name: 'Kano',
          type: 'bar' as const,
          data: [kn.imam_facilities, kn.imam_admissions, kn.dhis2_admissions_matched || 0, kn.dhis2_only_facilities, kn.dhis2_only_admissions],
          itemStyle: { color: COLORS.kano },
          barMaxWidth: 40,
        },
      ],
    }
  }, [stateFilter, data.stateSummary])

  const outcomeChart = useMemo(() => {
    const items = stateFilter === 'Combined'
      ? data.stateSummary.filter(s => s.state !== 'Combined')
      : data.stateSummary.filter(s => s.state === stateFilter)

    return {
      tooltip: { trigger: 'axis' as const, formatter: (params: any) => {
        let s = `<b>${params[0]?.name}</b><br/>`
        for (const p of params) {
          s += `${p.marker} ${p.seriesName}: ${p.value != null ? p.value + '%' : '—'}<br/>`
        }
        return s
      }},
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'category' as const,
        data: items.map(s => s.state),
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value' as const, max: 100,
        axisLabel: { fontSize: 10, formatter: '{value}%' },
      },
      series: [
        {
          name: 'Cure Rate',
          type: 'bar' as const,
          data: items.map(s => s.cure_rate),
          itemStyle: { color: COLORS.primary },
          barMaxWidth: 50,
          markLine: { silent: true, data: [{ yAxis: SPHERE.cureMin, label: { formatter: 'SPHERE ≥75%', fontSize: 9 }, lineStyle: { color: '#22c55e', type: 'dashed' as const } }] },
        },
        {
          name: 'Default Rate',
          type: 'bar' as const,
          data: items.map(s => s.default_rate),
          itemStyle: { color: COLORS.amber },
          barMaxWidth: 50,
          markLine: { silent: true, data: [{ yAxis: SPHERE.defaultMax, label: { formatter: 'SPHERE <15%', fontSize: 9 }, lineStyle: { color: '#f59e0b', type: 'dashed' as const } }] },
        },
        {
          name: 'Case Fatality Rate',
          type: 'bar' as const,
          data: items.map(s => s.death_rate),
          itemStyle: { color: COLORS.red },
          barMaxWidth: 50,
        },
      ],
    }
  }, [stateFilter, data.stateSummary])

  const opportunityChart = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const f of facs) {
      counts[f.opportunity_class] = (counts[f.opportunity_class] || 0) + 1
    }
    const labels = Object.keys(counts)
    return {
      tooltip: { trigger: 'item' as const },
      series: [{
        type: 'pie' as const,
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, fontSize: 10, formatter: '{b}\n{c} ({d}%)' },
        data: labels.map(l => ({
          name: l,
          value: counts[l],
          itemStyle: { color: OPPORTUNITY_COLORS[l] || COLORS.gray },
        })),
      }],
    }
  }, [facs])

  const topLgaChart = useMemo(() => {
    const sorted = [...lgas].sort((a, b) => b.imam_admissions - a.imam_admissions).slice(0, 15)
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 120, right: 30, top: 10, bottom: 30 },
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

  if (!summary) return <div className="text-gray-500">No data available</div>

  return (
    <div>
      <SectionHeader
        title="Executive Overview"
        description="Comprehensive summary of SAM treatment reporting across Kaduna and Kano states. All indicators are derived from IMAM programme data, DHIS2 health information system records, and LMD supply data for the period September 2024 to August 2026."
        badge={stateFilter}
      />

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <KpiCard
          label="IMAM Facilities"
          value={fmtNum(summary.imam_facilities)}
          sub={`across ${summary.lgas} LGAs`}
          icon={<Building2 size={18} />}
        />
        <KpiCard
          label="IMAM Admissions"
          value={fmtNum(summary.imam_admissions)}
          sub="24-month period"
          icon={<Users size={18} />}
        />
        <KpiCard
          label="DHIS2 Matched Adm."
          value={fmtNum(summary.dhis2_admissions_matched)}
          sub={`${summary.matched_facilities} matched facilities`}
          icon={<GitCompare size={18} />}
        />
        <KpiCard
          label="DHIS2-Only Facilities"
          value={fmtNum(summary.dhis2_only_facilities)}
          sub={`${fmtNum(summary.dhis2_only_admissions)} admissions`}
          icon={<AlertTriangle size={18} />}
          color="amber"
        />
        <KpiCard
          label="Reconciliation Gap"
          value={summary.imam_dhis2_gap_pct != null ? fmtPct(summary.imam_dhis2_gap_pct) : '—'}
          sub={summary.imam_dhis2_diff != null ? `${fmtNum(summary.imam_dhis2_diff)} admissions` : 'Data unavailable'}
          icon={<GitCompare size={18} />}
          color={summary.imam_dhis2_gap_pct != null && Math.abs(summary.imam_dhis2_gap_pct) > 20 ? 'red' : 'default'}
        />
      </div>

      {/* KPI Row 2 - Outcomes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard
          label="Cure Rate"
          value={summary.cure_rate != null ? fmtPct(summary.cure_rate) : '—'}
          sub={summary.cure_rate != null ? (summary.cure_rate >= SPHERE.cureMin ? 'Meets SPHERE ≥75%' : 'Below SPHERE ≥75%') : ''}
          icon={<HeartPulse size={18} />}
          color={summary.cure_rate != null ? (summary.cure_rate >= SPHERE.cureMin ? 'green' : 'red') : 'default'}
        />
        <KpiCard
          label="Default Rate"
          value={summary.default_rate != null ? fmtPct(summary.default_rate) : '—'}
          sub={summary.default_rate != null ? (summary.default_rate <= SPHERE.defaultMax ? 'Meets SPHERE <15%' : 'Exceeds SPHERE <15%') : ''}
          color={summary.default_rate != null ? (summary.default_rate <= SPHERE.defaultMax ? 'green' : 'amber') : 'default'}
        />
        <KpiCard
          label="Case Fatality Rate"
          value={summary.death_rate != null ? fmtPct(summary.death_rate) : '—'}
          sub={summary.death_rate != null ? (summary.death_rate <= SPHERE.deathMax ? 'Meets SPHERE <10%' : 'Exceeds SPHERE <10%') : ''}
          color={summary.death_rate != null ? (summary.death_rate <= SPHERE.deathMax ? 'green' : 'red') : 'default'}
        />
        <KpiCard
          label="RUTF Utilised"
          value={summary.rutf_utilized_sachets > 0 ? fmtNum(summary.rutf_utilized_sachets) : '—'}
          sub={summary.rutf_utilized_sachets > 0 ? `${fmtNum(summary.rutf_implied_sachets)} implied` : 'sachets'}
          icon={<Package size={18} />}
        />
      </div>

      <InsightPanel insights={insights} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {stateComparisonChart && (
          <ChartCard
            title="Kaduna vs Kano Comparison"
            subtitle="IMAM and DHIS2 indicators by state"
            source="IMAM Sampling Frame v5, DHIS2 Sep 2024–Aug 2026"
          >
            <EChart option={stateComparisonChart} height={300} />
          </ChartCard>
        )}

        <ChartCard
          title="Treatment Outcomes"
          subtitle="Pooled rates against SPHERE benchmarks"
          source="IMAM Sampling Frame v5"
        >
          <EChart option={outcomeChart} height={300} />
        </ChartCard>

        <ChartCard
          title="Opportunity Classification"
          subtitle="Facility distribution by operational category"
          source="Derived from IMAM–DHIS2 reconciliation and treatment outcomes"
        >
          <EChart option={opportunityChart} height={300} />
        </ChartCard>

        <ChartCard
          title="Top LGAs by IMAM Admissions"
          subtitle="Highest-volume local government areas"
          source="IMAM Sampling Frame v5"
        >
          <EChart option={topLgaChart} height={380} />
        </ChartCard>
      </div>

      {/* Data transparency footer */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg text-xs text-gray-500 space-y-1">
        <p><strong>Data Sources:</strong> IMAM programme data (State IMAM Reports 2024–2026), DHIS2 health information system (Sep 2024–Aug 2026), LMD RUTF distribution records.</p>
        <p><strong>Period:</strong> September 2024 to August 2026 (24 months). Kaduna: 166 IMAM facilities across 23 LGAs. Kano: 484 IMAM facilities across 44 LGAs.</p>
        <p><strong>Note:</strong> Treatment outcomes use pooled exit counts (cured + defaulted + died + non-recovered + transferred out) as denominator. RUTF planning assumption: 150 sachets per child.</p>
      </div>
    </div>
  )
}
