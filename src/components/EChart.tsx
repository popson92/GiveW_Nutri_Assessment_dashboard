import { useRef, useEffect } from 'react'
import * as echarts from 'echarts'

interface Props {
  option: echarts.EChartsOption
  height?: number | string
  className?: string
  onEvents?: Record<string, (params: any) => void>
}

export default function EChart({ option, height = 350, className = '', onEvents }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) return
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    }
    chartRef.current.setOption(option, true)

    if (onEvents) {
      for (const [event, handler] of Object.entries(onEvents)) {
        chartRef.current.on(event, handler)
      }
    }

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    const ro = new ResizeObserver(() => chartRef.current?.resize())
    ro.observe(ref.current)

    return () => {
      window.removeEventListener('resize', handleResize)
      ro.disconnect()
      if (onEvents && chartRef.current) {
        for (const event of Object.keys(onEvents)) {
          chartRef.current.off(event)
        }
      }
    }
  }, [option, onEvents])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  return <div ref={ref} style={{ height }} className={className} />
}
