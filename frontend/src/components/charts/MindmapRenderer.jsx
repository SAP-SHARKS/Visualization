import { useEffect, useRef, memo } from 'react'
import * as d3 from 'd3'

const DEPTH_COLORS = ['#3dd68c', '#60a5fa', '#f59e0b', '#a78bfa', '#ef4444']

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

function MindmapRenderer({ data }) {
  const svgRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current || !data.root) return

    const container = containerRef.current
    const width = container.clientWidth || 500
    const height = Math.min(container.clientHeight || 400, Math.max(300, width * 0.55))

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const g = svg.append('g')
      .attr('transform', `translate(${80}, ${height / 2})`)

    const hierarchy = d3.hierarchy(buildHierarchy(data.root))
    const treeLayout = d3.tree().size([height - 60, width - 200])
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
      .attr('stroke-opacity', 0.4)
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
      .attr('r', d => d.depth === 0 ? 10 : d.children ? 7 : 5)
      .attr('fill', d => DEPTH_COLORS[Math.min(d.depth, DEPTH_COLORS.length - 1)])
      .attr('stroke', '#06080c')
      .attr('stroke-width', 2)

    // Glow for root
    node.filter(d => d.depth === 0)
      .append('circle')
      .attr('r', 16)
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
      .attr('fill', d => d.depth === 0 ? '#e8eaf0' : d.depth === 1 ? '#c8cad0' : '#9ca3af')
      .attr('font-size', d => d.depth === 0 ? 14 : d.depth === 1 ? 12 : 11)
      .attr('font-weight', d => d.depth <= 1 ? 600 : 400)
      .attr('font-family', "'DM Sans', sans-serif")

  }, [data])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        style={{
          display: 'block',
          margin: '0 auto',
          overflow: 'hidden',
        }}
      />
    </div>
  )
}

export default memo(MindmapRenderer)
