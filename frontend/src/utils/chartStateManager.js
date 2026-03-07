/**
 * ChartStateManager — accumulates incremental chart operations
 * into a persistent chart state that ChartRouter can render.
 *
 * Supports both incremental operations (add_node, extend_timeline, etc.)
 * and full chart replacement as fallback.
 */

let nextNodeId = 1
const uid = () => `n${nextNodeId++}`

export function createChartState() {
  return {
    activeChartType: null,
    title: '',
    // flowchart
    nodes: [],
    edges: [],
    // timeline
    events: [],
    // comparison
    items: [],
    // infographic
    sections: [],
    subtitle: '',
    footer: '',
    // mindmap
    root: null,
    lastUpdated: null,
  }
}

/**
 * Apply a Claude response (operation or full chart) to the chart state.
 * Returns a new state object (immutable update).
 */
export function applyChartOperation(state, response) {
  const now = Date.now()

  // Full chart replacement (fallback or first generation)
  if (!response.operation) {
    return applyFullChart(state, response, now)
  }

  // Incremental operations
  const op = response.operation
  const next = { ...state, lastUpdated: now }

  // If chart type changes, reset to full chart
  if (state.activeChartType && state.activeChartType !== response.type) {
    return applyFullChart(state, response, now)
  }

  next.activeChartType = response.type
  if (response.title) next.title = response.title

  switch (op) {
    case 'add_node': {
      const node = response.node
      if (!node) break
      const id = node.id || uid()
      // Don't add duplicate labels
      if (next.nodes.some(n => n.label === node.label)) break
      next.nodes = [...state.nodes, { ...node, id }]
      // Auto-connect to previous node
      if (state.nodes.length > 0) {
        const prev = state.nodes[state.nodes.length - 1]
        next.edges = [...state.edges, {
          from: prev.id,
          to: id,
          label: node.edgeLabel || '',
          edgeType: node.edgeType || 'default',
        }]
      } else {
        next.edges = [...state.edges]
      }
      break
    }

    case 'add_edge': {
      const edge = response.edge
      if (!edge) break
      next.edges = [...state.edges, edge]
      break
    }

    case 'add_branch': {
      // Add a decision node with yes/no branches
      const branch = response.branch
      if (!branch) break
      const decisionId = branch.decisionId || uid()
      const yesId = branch.yesId || uid()
      const noId = branch.noId || uid()

      next.nodes = [...state.nodes,
        { id: decisionId, label: branch.question, nodeType: 'decision' },
        { id: yesId, label: branch.yesLabel, nodeType: 'process' },
        { id: noId, label: branch.noLabel, nodeType: 'process' },
      ]
      next.edges = [...state.edges,
        { from: decisionId, to: yesId, label: 'Yes', edgeType: 'yes' },
        { from: decisionId, to: noId, label: 'No', edgeType: 'no' },
      ]
      // Connect last node to decision
      if (state.nodes.length > 0) {
        const prev = state.nodes[state.nodes.length - 1]
        next.edges.push({ from: prev.id, to: decisionId, edgeType: 'default' })
      }
      break
    }

    case 'extend_timeline': {
      const event = response.event
      if (!event) break
      // Don't add duplicate titles
      if (state.events.some(e => e.title === event.title)) break
      next.events = [...state.events, event]
      break
    }

    case 'append_comparison_item': {
      const item = response.item
      if (!item) break
      // Don't add duplicate names
      if (state.items.some(i => i.name === item.name)) break
      next.items = [...state.items, item]
      break
    }

    case 'add_metric': {
      const section = response.section
      if (!section) break
      if (state.sections.some(s => s.heading === section.heading)) break
      next.sections = [...state.sections, section]
      if (response.subtitle) next.subtitle = response.subtitle
      if (response.footer) next.footer = response.footer
      break
    }

    case 'add_mindmap_branch': {
      const branch = response.branch
      if (!branch) break
      if (!state.root) {
        next.root = {
          label: next.title || 'Topic',
          children: [branch],
        }
      } else {
        // Add as new child of root
        const existing = state.root.children || []
        if (existing.some(c => c.label === branch.label)) break
        next.root = {
          ...state.root,
          children: [...existing, branch],
        }
      }
      break
    }

    default:
      // Unknown operation — try full replacement
      return applyFullChart(state, response, now)
  }

  return next
}

/**
 * Full chart replacement — used as fallback or for first chart.
 */
function applyFullChart(state, data, now) {
  const next = createChartState()
  next.activeChartType = data.type
  next.title = data.title || ''
  next.lastUpdated = now

  switch (data.type) {
    case 'flowchart':
      next.nodes = data.nodes || []
      next.edges = data.edges || []
      break
    case 'timeline':
      next.events = data.events || []
      break
    case 'comparison':
      next.items = data.items || []
      break
    case 'infographic':
      next.sections = data.sections || []
      next.subtitle = data.subtitle || ''
      next.footer = data.footer || ''
      break
    case 'mindmap':
      next.root = data.root || null
      break
  }

  return next
}

/**
 * Convert internal chart state → format ChartRouter expects.
 */
export function stateToChartData(state) {
  if (!state.activeChartType) return null

  const base = { type: state.activeChartType, title: state.title }

  switch (state.activeChartType) {
    case 'flowchart':
      if (state.nodes.length === 0) return null
      return { ...base, nodes: state.nodes, edges: state.edges }
    case 'timeline':
      if (state.events.length === 0) return null
      return { ...base, events: state.events }
    case 'comparison':
      if (state.items.length === 0) return null
      return { ...base, items: state.items }
    case 'infographic':
      if (state.sections.length === 0) return null
      return {
        ...base,
        sections: state.sections,
        subtitle: state.subtitle,
        footer: state.footer,
      }
    case 'mindmap':
      if (!state.root) return null
      return { ...base, root: state.root }
    default:
      return null
  }
}
