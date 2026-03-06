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
      background: 'var(--gradient-surface)',
      borderRadius: '14px',
      border: '1px solid var(--border)',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      color: 'var(--text-dim)',
      whiteSpace: 'pre-wrap',
      overflow: 'auto',
      maxHeight: '400px',
    }}>
      <div style={{ color: 'var(--company)', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
      case 'napkin-image':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <img
              src={data.imageUrl}
              alt={data.title || 'Generated Visual'}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
        )
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
        {data._generationTimeMs != null && (
          <div style={{
            padding: '6px 12px',
            fontSize: '11px',
            color: 'var(--text-dim)',
            fontFamily: "'JetBrains Mono', monospace",
            textAlign: 'right',
            borderTop: '1px solid var(--border)',
          }}>
            Generated in {data._generationTimeMs.toLocaleString()}ms
          </div>
        )}
      </div>
    </Suspense>
  )
}

export default memo(ChartRouter)
