import { useEffect, useRef, memo } from 'react'
import * as d3 from 'd3'
import { useTheme } from '../../context/ThemeContext'

const DEPTH_COLORS_DARK = ['#3dd68c', '#60a5fa', '#f59e0b', '#a78bfa', '#ef4444']
const DEPTH_COLORS_LIGHT = ['#6366f1', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444']

function buildHierarchy(root) {
  if (!root) return { name: 'Root', children: [] }

  function convert(node) {
    const result = { name: node.label || '' }
    if (node.children && node.children.length > 0) {
      result.children = node.children.map(convert)
    }
    return result
  }

  return convert(root)
}

function countNodes(node) {
  if (!node) return 0
  let count = 1
  if (node.children) {
    for (const child of node.children) count += countNodes(child)
  }
  return count
}

function MindmapRenderer({ data }) {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const { theme } = useTheme()
  const isLight = theme === 'light'

  // Calculate dynamic dimensions based on total node count
  const totalNodes = countNodes(data.root)

  useEffect(() => {
    if (!svgRef.current || !data.root) return
    const DEPTH_COLORS = isLight ? DEPTH_COLORS_LIGHT : DEPTH_COLORS_DARK

    const container = containerRef.current
    const containerW = container.clientWidth || 500
    const width = Math.max(containerW, 400)
    const treeHeight = Math.max(350, totalNodes * 40)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const g = svg.append('g')
      .attr('transform', `translate(${10}, ${20})`)

    const hierarchy = d3.hierarchy(buildHierarchy(data.root))
    const treeLayout = d3.tree().size([treeHeight - 40, width * 0.55])
    treeLayout(hierarchy)

    // Draw links
    g.selectAll('.mm-link')
      .data(hierarchy.links())
      .enter()
      .append('path')
      .attr('class', 'mm-link')
      .attr('d', d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x)
      )
      .attr('fill', 'none')
      .attr('stroke', d => DEPTH_COLORS[Math.min(d.source.depth, DEPTH_COLORS.length - 1)])
      .attr('stroke-opacity', isLight ? 0.6 : 0.55)
      .attr('stroke-width', d => Math.max(1, 3 - d.source.depth))
      .style('opacity', 0)
      .transition()
      .duration(600)
      .delay((_, i) => i * 80)
      .style('opacity', 1)

    // Draw nodes
    const node = g.selectAll('.mm-node')
      .data(hierarchy.descendants())
      .enter()
      .append('g')
      .attr('class', 'mm-node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('opacity', 0)

    node.transition()
      .duration(500)
      .delay((_, i) => i * 100)
      .style('opacity', 1)

    // Node circles
    node.append('circle')
      .attr('r', d => d.depth === 0 ? 12 : d.children ? 8 : 6)
      .attr('fill', d => DEPTH_COLORS[Math.min(d.depth, DEPTH_COLORS.length - 1)])
      .attr('stroke', isLight ? '#ffffff' : '#06080c')
      .attr('stroke-width', 2)

    // Glow for root
    node.filter(d => d.depth === 0)
      .append('circle')
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', DEPTH_COLORS[0])
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', 1)

    // Node labels
    node.append('text')
      .attr('dy', d => d.depth === 0 ? -18 : d.children ? -14 : 4)
      .attr('x', d => d.depth === 0 ? 0 : d.children ? 0 : 12)
      .attr('text-anchor', d => d.depth === 0 ? 'middle' : d.children ? 'middle' : 'start')
      .text(d => d.data.name)
      .attr('fill', d => isLight
        ? (d.depth === 0 ? '#0f172a' : d.depth === 1 ? '#1e293b' : '#334155')
        : (d.depth === 0 ? '#f1f5f9' : d.depth === 1 ? '#e2e8f0' : '#cbd5e1'))
      .attr('font-size', d => d.depth === 0 ? 17 : d.depth === 1 ? 14 : 13)
      .attr('font-weight', d => d.depth <= 1 ? 600 : 400)
      .attr('font-family', "'DM Sans', sans-serif")

    // Measure the widest leaf label to add enough right padding
    let maxLeafTextW = 0
    node.each(function (d) {
      if (!d.children) {
        const textEl = d3.select(this).select('text').node()
        if (textEl) {
          const tw = textEl.getBBox().width
          if (tw > maxLeafTextW) maxLeafTextW = tw
        }
      }
    })

    // Auto-fit SVG to content using viewBox
    const bbox = g.node().getBBox()
    const padL = 30
    const padR = Math.max(40, maxLeafTextW * 0.3)
    const padY = 30
    const vbX = bbox.x - padL
    const vbY = bbox.y - padY
    const vbW = bbox.width + padL + padR
    const vbH = bbox.height + padY * 2

    svg
      .attr('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`)
      .attr('width', '100%')
      .attr('height', null)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('aspect-ratio', `${vbW} / ${vbH}`)

  }, [data, totalNodes, isLight])

  return (
    <div ref={containerRef} style={{ width: '100%', minHeight: '200px', overflow: 'visible' }}>
      <svg
        ref={svgRef}
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '100%',
        }}
      />
    </div>
  )
}

export default memo(MindmapRenderer)
