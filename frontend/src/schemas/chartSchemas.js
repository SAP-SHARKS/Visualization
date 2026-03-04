/**
 * Chart type definitions and constants.
 * These schemas define the contract between the AI output and the renderers.
 */

/**
 * @typedef {'flowchart' | 'timeline' | 'comparison' | 'infographic' | 'mindmap'} ChartType
 */

/**
 * @typedef {Object} FlowchartNode
 * @property {string} id
 * @property {string} label
 * @property {string} [description]
 * @property {'start' | 'process' | 'decision' | 'end'} nodeType
 */

/**
 * @typedef {Object} FlowchartEdge
 * @property {string} from
 * @property {string} to
 * @property {string} [label]
 * @property {'default' | 'yes' | 'no'} [edgeType]
 */

/**
 * @typedef {Object} FlowchartData
 * @property {'flowchart'} type
 * @property {string} title
 * @property {FlowchartNode[]} nodes
 * @property {FlowchartEdge[]} edges
 */

/**
 * @typedef {Object} TimelineEvent
 * @property {string} date
 * @property {string} title
 * @property {string} description
 * @property {string} [icon]
 */

/**
 * @typedef {Object} TimelineData
 * @property {'timeline'} type
 * @property {string} title
 * @property {TimelineEvent[]} events
 */

/**
 * @typedef {Object} ComparisonItem
 * @property {string} name
 * @property {string} [description]
 * @property {string[]} [pros]
 * @property {string[]} [cons]
 * @property {{label: string, value: string|number}[]} [stats]
 */

/**
 * @typedef {Object} ComparisonData
 * @property {'comparison'} type
 * @property {string} title
 * @property {ComparisonItem[]} items
 */

/**
 * @typedef {Object} InfographicSection
 * @property {string} heading
 * @property {string} value
 * @property {string} description
 * @property {string} [icon]
 */

/**
 * @typedef {Object} InfographicData
 * @property {'infographic'} type
 * @property {string} title
 * @property {string} [subtitle]
 * @property {InfographicSection[]} sections
 * @property {string} [footer]
 */

/**
 * @typedef {Object} MindmapChild
 * @property {string} label
 * @property {MindmapChild[]} [children]
 */

/**
 * @typedef {Object} MindmapData
 * @property {'mindmap'} type
 * @property {string} title
 * @property {{ label: string, children: MindmapChild[] }} root
 */

/**
 * @typedef {FlowchartData | TimelineData | ComparisonData | InfographicData | MindmapData} ChartData
 */

export const CHART_TYPES = ['flowchart', 'timeline', 'comparison', 'infographic', 'mindmap']

export const CHART_LABELS = {
  flowchart: 'Flowchart',
  timeline: 'Timeline',
  comparison: 'Comparison',
  infographic: 'Infographic',
  mindmap: 'Mindmap',
}

export const CHART_ICONS = {
  flowchart: 'GitBranch',
  timeline: 'Clock',
  comparison: 'BarChart3',
  infographic: 'PieChart',
  mindmap: 'Network',
}
