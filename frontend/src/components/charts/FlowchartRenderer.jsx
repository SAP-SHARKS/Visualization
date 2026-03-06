import { useMemo, useCallback, memo } from 'react'
import ReactFlow, { Background, Controls, useNodesState, useEdgesState } from 'reactflow'
import dagre from 'dagre'
import 'reactflow/dist/style.css'
import { useTheme } from '../../context/ThemeContext'

const NODE_WIDTH = 220
const NODE_HEIGHT = 80

const nodeColorsDark = {
  start: { bg: 'rgba(61,214,140,0.15)', border: '#3dd68c', text: '#3dd68c' },
  process: { bg: 'rgba(96,165,250,0.15)', border: '#60a5fa', text: '#60a5fa' },
  decision: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#f59e0b' },
  end: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#ef4444' },
}

const nodeColorsLight = {
  start: { bg: 'rgba(53,88,114,0.08)', border: '#355872', text: '#355872' },
  process: { bg: 'rgba(37,99,235,0.08)', border: '#2563eb', text: '#2563eb' },
  decision: { bg: 'rgba(217,119,6,0.08)', border: '#d97706', text: '#d97706' },
  end: { bg: 'rgba(220,38,38,0.08)', border: '#dc2626', text: '#dc2626' },
}

function CustomNode({ data }) {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  const nodeColors = isLight ? nodeColorsLight : nodeColorsDark
  const colors = nodeColors[data.nodeType] || nodeColors.process
  const isDecision = data.nodeType === 'decision'

  return (
    <div style={{
      background: colors.bg,
      border: `2px solid ${colors.border}`,
      borderRadius: isDecision ? '4px' : '14px',
      padding: '14px 20px',
      minWidth: `${NODE_WIDTH - 20}px`,
      textAlign: 'center',
      transform: isDecision ? 'rotate(0deg)' : 'none',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: isLight ? '#1a2d3d' : '#e8eaf0',
        marginBottom: data.description ? '4px' : 0,
      }}>
        {data.label}
      </div>
      {data.description && (
        <div style={{
          fontSize: '11px',
          color: isLight ? '#7AAACE' : '#6b7280',
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
        color: isLight ? '#F7F8F0' : '#06080c',
        fontSize: '8px',
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
        stroke: e.edgeType === 'yes' ? (isLight ? '#355872' : '#3dd68c') : e.edgeType === 'no' ? (isLight ? '#dc2626' : '#ef4444') : (isLight ? '#9CD5FF' : '#4a5060'),
        strokeWidth: 2,
      },
      labelStyle: {
        fill: isLight ? '#7AAACE' : '#9ca3af',
        fontSize: 11,
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

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const onInit = useCallback((instance) => {
    setTimeout(() => instance.fitView({ padding: 0.2 }), 100)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        preventScrolling={false}
      >
        <Background color={isLight ? '#dde5db' : '#1a1f2e'} gap={20} size={1} />
      </ReactFlow>
    </div>
  )
}

export default memo(FlowchartRenderer)
