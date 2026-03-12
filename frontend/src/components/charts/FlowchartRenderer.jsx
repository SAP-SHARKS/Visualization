import { useMemo, useCallback, useEffect, memo } from 'react'
import ReactFlow, { Background, Controls, useNodesState, useEdgesState } from 'reactflow'
import dagre from 'dagre'
import 'reactflow/dist/style.css'
import { useTheme } from '../../context/ThemeContext'

const NODE_WIDTH = 260
const NODE_HEIGHT = 90

const nodeColorsDark = {
  start: { bg: 'rgba(61,214,140,0.15)', border: '#3dd68c', text: '#3dd68c' },
  process: { bg: 'rgba(96,165,250,0.15)', border: '#60a5fa', text: '#60a5fa' },
  decision: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#f59e0b' },
  end: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#ef4444' },
}

const nodeColorsLight = {
  start: { bg: 'rgba(16,185,129,0.1)', border: '#10b981', text: '#059669' },
  process: { bg: 'rgba(99,102,241,0.1)', border: '#6366f1', text: '#4f46e5' },
  decision: { bg: 'rgba(245,158,11,0.1)', border: '#f59e0b', text: '#d97706' },
  end: { bg: 'rgba(244,63,94,0.1)', border: '#f43f5e', text: '#e11d48' },
}

function CustomNode({ data }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const nodeColors = isLight ? nodeColorsLight : nodeColorsDark
  const colors = nodeColors[data.nodeType] || nodeColors.process
  const isDecision = data.nodeType === 'decision'

  return (
    <div style={{
      background: colors.bg,
      border: `2px solid ${colors.border}`,
      borderRadius: isDecision ? '4px' : '14px',
      padding: '16px 24px',
      minWidth: `${NODE_WIDTH - 20}px`,
      textAlign: 'center',
      transform: isDecision ? 'rotate(0deg)' : 'none',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        fontSize: '15px',
        fontWeight: 600,
        color: isLight ? '#0f172a' : '#e8eaf0',
        marginBottom: data.description ? '4px' : 0,
      }}>
        {data.label}
      </div>
      {data.description && (
        <div style={{
          fontSize: '13px',
          color: isLight ? '#334155' : '#cbd5e1',
          lineHeight: 1.4,
        }}>
          {data.description}
        </div>
      )}
      <div style={{
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        background: colors.border,
        color: isLight ? '#ffffff' : '#06080c',
        fontSize: '9px',
        fontWeight: 700,
        padding: '2px 6px',
        borderRadius: '4px',
        fontFamily: "'JetBrains Mono', monospace",
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {data.nodeType}
      </div>
    </div>
  )
}

const nodeTypes = { custom: memo(CustomNode) }

function getLayoutedElements(nodes, edges) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 })

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const n = g.node(node.id)
    return {
      ...node,
      position: { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 },
    }
  })

  return { nodes: layoutedNodes, edges }
}

function FlowchartRenderer({ data }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const { initialNodes, initialEdges } = useMemo(() => {
    const rfNodes = (data.nodes || []).map((n) => ({
      id: n.id,
      type: 'custom',
      data: { label: n.label, description: n.description, nodeType: n.nodeType },
      position: { x: 0, y: 0 },
    }))

    const rfEdges = (data.edges || []).map((e, i) => ({
      id: `e-${i}`,
      source: e.from,
      target: e.to,
      label: e.label || '',
      animated: true,
      style: {
        stroke: e.edgeType === 'yes' ? (isLight ? '#10b981' : '#3dd68c') : e.edgeType === 'no' ? (isLight ? '#f43f5e' : '#ef4444') : (isLight ? '#a5b4fc' : '#64748b'),
        strokeWidth: 2,
      },
      labelStyle: {
        fill: isLight ? '#6366f1' : '#d1d5db',
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
      },
      labelBgStyle: {
        fill: isLight ? '#ffffff' : '#0e1117',
        fillOpacity: 0.9,
      },
    }))

    const { nodes: ln, edges: le } = getLayoutedElements(rfNodes, rfEdges)
    return { initialNodes: ln, initialEdges: le }
  }, [data, isLight])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Sync nodes/edges when theme or data changes
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges])

  // Calculate container height based on node count so fitView doesn't over-shrink
  const nodeCount = (data.nodes || []).length
  const containerHeight = Math.max(400, nodeCount * (NODE_HEIGHT + 60))

  const onInit = useCallback((instance) => {
    setTimeout(() => instance.fitView({ padding: 0.15 }), 100)
  }, [])

  return (
    <div style={{ width: '100%', height: `${containerHeight}px` }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.8}
        maxZoom={1.2}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        preventScrolling={false}
      >
        <Background color={isLight ? '#e2e8f0' : '#1a1f2e'} gap={20} size={1} />
      </ReactFlow>
    </div>
  )
}

export default memo(FlowchartRenderer)
