import { useMemo, useState, useEffect, useRef } from 'react'
import SectionHeader from '../components/SectionHeader'
import ChartCard from '../components/ChartCard'
import EChart from '../components/EChart'
import { useFilters, filterByState } from '../hooks/useData'
import { fmtNum, fmtPct, COLORS } from '../utils/format'
import type { Facility, LgaSummary } from '../types'

interface Props {
  data: {
    facilities: Facility[]
    lgaSummary: LgaSummary[]
    geojson: GeoJSON.FeatureCollection | null
  }
}

type MapMetric = 'imam_admissions' | 'imam_facilities' | 'cure_rate' | 'default_rate' | 'imam_dhis2_gap_pct' | 'dhis2_only_admissions'

const METRIC_LABELS: Record<MapMetric, string> = {
  imam_admissions: 'IMAM Admissions',
  imam_facilities: 'IMAM Facilities',
  cure_rate: 'Cure Rate (%)',
  default_rate: 'Default Rate (%)',
  imam_dhis2_gap_pct: 'Reconciliation Gap (%)',
  dhis2_only_admissions: 'DHIS2-Only Admissions',
}

export default function Geographic({ data }: Props) {
  const { stateFilter } = useFilters()
  const lgas = filterByState(data.lgaSummary, stateFilter)
  const [metric, setMetric] = useState<MapMetric>('imam_admissions')
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!mapRef.current || !data.geojson) return

    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return
      const map = L.map(mapRef.current, {
        center: [10.8, 8.0],
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 14,
      }).addTo(map)

      mapInstanceRef.current = map
      setMapReady(true)
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        setMapReady(false)
      }
    }
  }, [data.geojson])

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !data.geojson) return
    const mapInstance = mapInstanceRef.current
    import('leaflet').then((L) => {
      mapInstance.eachLayer((layer: any) => {
        if (layer.feature) mapInstance.removeLayer(layer)
      })

      const lgaLookup: Record<string, LgaSummary> = {}
      for (const l of lgas) {
        lgaLookup[l.lga_normalized.toUpperCase()] = l
      }

      const values = lgas.map(l => {
        const v = l[metric]
        return typeof v === 'number' ? v : 0
      }).filter(v => v !== 0)
      const maxVal = Math.max(...values, 1)
      const minVal = Math.min(...values, 0)

      const stateNames = stateFilter === 'Combined'
        ? ['Kaduna', 'Kano']
        : [stateFilter]

      const filteredFeatures = data.geojson!.features.filter(f =>
        stateNames.includes(f.properties?.NAME_1)
      )

      L.geoJSON(
        { type: 'FeatureCollection', features: filteredFeatures } as any,
        {
          style: (feature) => {
            const name = feature?.properties?.NAME_2?.toUpperCase() || ''
            const lgaData = lgaLookup[name]
            let val = 0
            if (lgaData) {
              const raw = lgaData[metric]
              val = typeof raw === 'number' ? raw : 0
            }

            let intensity = 0
            if (maxVal !== minVal) {
              intensity = (val - minVal) / (maxVal - minVal)
            }

            const isRate = metric.includes('rate') || metric.includes('pct')
            const r = isRate ? Math.round(255 * intensity) : Math.round(39 + (54 - 39) * (1 - intensity))
            const g = isRate ? Math.round(255 * (1 - intensity * 0.7)) : Math.round(110 + (163 - 110) * (1 - intensity))
            const b = isRate ? Math.round(255 * (1 - intensity * 0.8)) : Math.round(81 + (166 - 81) * (1 - intensity))
            const color = lgaData ? `rgb(${r},${g},${b})` : '#e5e7eb'

            return {
              fillColor: color,
              weight: 1,
              opacity: 1,
              color: '#fff',
              fillOpacity: 0.8,
            }
          },
          onEachFeature: (feature, layer) => {
            const name = feature.properties?.NAME_2 || ''
            const state = feature.properties?.NAME_1 || ''
            const lgaData = lgaLookup[name.toUpperCase()]
            const val = lgaData ? lgaData[metric] : null

            layer.bindTooltip(
              `<div style="font-size:12px"><strong>${name}</strong> (${state})<br/>${METRIC_LABELS[metric]}: ${val != null ? (metric.includes('rate') || metric.includes('pct') ? fmtPct(val as number) : fmtNum(val as number)) : 'No data'}</div>`,
              { sticky: true }
            )
          },
        }
      ).addTo(mapInstance)

      if (filteredFeatures.length > 0) {
        const bounds = L.geoJSON({ type: 'FeatureCollection', features: filteredFeatures } as any).getBounds()
        mapInstance.fitBounds(bounds, { padding: [20, 20] })
      }
    })
  }, [mapReady, lgas, metric, stateFilter, data.geojson])

  const lgaBarChart = useMemo(() => {
    const sorted = [...lgas]
      .sort((a, b) => (b[metric] as number || 0) - (a[metric] as number || 0))
      .slice(0, 20)
    const isRate = metric.includes('rate') || metric.includes('pct')
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 130, right: 30, top: 10, bottom: 30 },
      xAxis: {
        type: 'value' as const,
        axisLabel: { fontSize: 10, formatter: isRate ? '{value}%' : undefined },
      },
      yAxis: {
        type: 'category' as const,
        data: sorted.map(l => l.lga_normalized).reverse(),
        axisLabel: { fontSize: 10 },
      },
      series: [{
        type: 'bar' as const,
        data: sorted.map(l => {
          const v = l[metric]
          return typeof v === 'number' ? Math.round(v * 10) / 10 : 0
        }).reverse(),
        itemStyle: {
          color: (params: any) => {
            if (isRate && metric === 'cure_rate') return params.value >= 75 ? COLORS.primary : COLORS.red
            if (isRate && metric === 'default_rate') return params.value <= 15 ? COLORS.primary : COLORS.amber
            return COLORS.primary
          },
          borderRadius: [0, 3, 3, 0],
        },
        barMaxWidth: 16,
      }],
    }
  }, [lgas, metric])

  return (
    <div>
      <SectionHeader
        title="Geographic Intelligence"
        description="Interactive geographic analysis of SAM treatment indicators across Kaduna and Kano LGAs. Select a metric to visualize spatial patterns."
        badge={stateFilter}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.entries(METRIC_LABELS) as [MapMetric, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              metric === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="LGA Choropleth Map" subtitle={METRIC_LABELS[metric]} source="GADM boundaries, IMAM Sampling Frame v5">
          <div ref={mapRef} style={{ height: 450 }} className="rounded-lg bg-gray-100" />
        </ChartCard>

        <ChartCard title={`LGA Ranking — ${METRIC_LABELS[metric]}`} subtitle="Top 20 LGAs" source="IMAM Sampling Frame v5">
          <EChart option={lgaBarChart} height={450} />
        </ChartCard>
      </div>

      <div className="mt-4 card">
        <div className="card-header">
          <h3 className="text-sm font-semibold">LGA Summary Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>State</th><th>LGA</th><th className="text-right">Facilities</th>
                <th className="text-right">IMAM Adm.</th><th className="text-right">DHIS2 Matched</th>
                <th className="text-right">Gap %</th><th className="text-right">Cure Rate</th>
                <th className="text-right">Default Rate</th><th className="text-right">DHIS2-Only</th>
              </tr>
            </thead>
            <tbody>
              {lgas.slice(0, 30).map((l, i) => (
                <tr key={i}>
                  <td>{l.state}</td>
                  <td className="font-medium">{l.lga_normalized}</td>
                  <td className="text-right">{l.imam_facilities}</td>
                  <td className="text-right">{fmtNum(l.imam_admissions)}</td>
                  <td className="text-right">{fmtNum(l.dhis2_sam_admitted)}</td>
                  <td className="text-right">{fmtPct(l.imam_dhis2_gap_pct)}</td>
                  <td className="text-right">
                    <span className={l.cure_rate != null && l.cure_rate >= 75 ? 'text-green-600' : 'text-red-600'}>
                      {fmtPct(l.cure_rate)}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className={l.default_rate != null && l.default_rate <= 15 ? 'text-green-600' : 'text-amber-600'}>
                      {fmtPct(l.default_rate)}
                    </span>
                  </td>
                  <td className="text-right">{l.dhis2_only_facilities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
