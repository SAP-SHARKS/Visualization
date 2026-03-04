import { memo, lazy, Suspense } from 'react'
import ChartLoading from './ChartLoading'

// Lazy-load renderers to reduce initial bundle size
const FlowchartRenderer = lazy(() => import('./charts/FlowchartRenderer'))
const TimelineRenderer = lazy(() => import('./charts/TimelineRenderer'))
const ComparisonRenderer = lazy(() => import('./charts/ComparisonRenderer'))
const InfographicRenderer = lazy(() => import('./charts/InfographicRenderer'))
const MindmapRenderer = lazy(() => import('./charts/MindmapRenderer'))

function FallbackRenderer({ data }) {
  return (
    <div style={{
      padding: '24px',
      background: 'rgba(14,17,23,0.9)',
      borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.06)',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      color: '#6b7280',
      whiteSpace: 'pre-wrap',
      overflow: 'auto',
      maxHeight: '400px',
    }}>
      <div style={{ color: '#f59e0b', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Unknown chart type: {data?.type}
      </div>
      {JSON.stringify(data, null, 2)}
    </div>
  )
}

function ChartRouter({ data }) {
  if (!data || !data.type) {
    return <FallbackRenderer data={data} />
  }

  const renderChart = () => {
    switch (data.type) {
      case 'flowchart':
        return <FlowchartRenderer data={data} />
      case 'timeline':
        return <TimelineRenderer data={data} />
      case 'comparison':
        return <ComparisonRenderer data={data} />
      case 'infographic':
        return <InfographicRenderer data={data} />
      case 'mindmap':
        return <MindmapRenderer data={data} />
      default:
        return <FallbackRenderer data={data} />
    }
  }

  return (
    <Suspense fallback={<ChartLoading />}>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {renderChart()}
        </div>
      </div>
    </Suspense>
  )
}

export default memo(ChartRouter)
