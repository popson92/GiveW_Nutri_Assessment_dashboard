import { useRef, useEffect } from 'react'
import * as echarts from 'echarts'

interface Props {
  option: echarts.EChartsOption
  height?: number | string
  className?: string
}

export default function EChart({ option, height = 350, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) return
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    }
    chartRef.current.setOption(option, true)

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    const ro = new ResizeObserver(() => chartRef.current?.resize())
    ro.observe(ref.current)

    return () => {
      window.removeEventListener('resize', handleResize)
      ro.disconnect()
    }
  }, [option])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  return <div ref={ref} style={{ height }} className={className} />
}
