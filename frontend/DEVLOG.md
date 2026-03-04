# Development Log — VisualScript Dynamic Chart Engine

## 2026-03-03: AI-Powered Chart Generation

### What Changed
- Replaced all hardcoded visual modes (flowchart, infographic, napkin, sankey, compare) with dynamic AI-powered chart generation
- Added Vercel serverless function at `/api/generate-chart` to proxy Claude API calls
- Built 5 new React chart renderers: FlowchartRenderer (ReactFlow + dagre), TimelineRenderer, ComparisonRenderer, InfographicRenderer (Lucide icons), MindmapRenderer (D3 tree)
- Added chart type auto-detection and manual override via ChartTypeSelector
- Added result caching (in-memory hash map) to avoid duplicate API calls
- Added PNG export via html-to-image
- Lazy-loaded chart libraries (ReactFlow, D3) via React.lazy + Suspense

### Architecture
```
User Text → /api/generate-chart (Vercel serverless)
  → Claude API (claude-sonnet-4-20250514)
  → Structured JSON (one of 5 chart schemas)
  → ChartRouter → Correct Renderer Component
```

### New Dependencies
- reactflow + dagre (flowchart layout)
- d3 (mindmap tree visualization)
- lucide-react (infographic icons)
- html-to-image (PNG export)

### Files Created
- `api/generate-chart.js` — Vercel serverless function
- `src/schemas/chartSchemas.js` — Type definitions
- `src/services/chartAI.js` — Frontend API service
- `src/utils/chartCache.js` — Result cache
- `src/hooks/useChartGeneration.js` — React hook
- `src/components/ChartRouter.jsx` — Chart type router
- `src/components/ChartLoading.jsx` — Loading skeleton
- `src/components/ChartError.jsx` — Error state
- `src/components/ChartTypeSelector.jsx` — Type override toolbar
- `src/components/charts/FlowchartRenderer.jsx`
- `src/components/charts/TimelineRenderer.jsx`
- `src/components/charts/ComparisonRenderer.jsx`
- `src/components/charts/InfographicRenderer.jsx`
- `src/components/charts/MindmapRenderer.jsx`
- `src/components/charts/ChartExportButton.jsx`

### Files Deleted
- `src/utils/visualData.js` — Replaced by AI generation

### Files Modified
- `src/pages/VisualizePage.jsx` — Integrated new chart system
- `package.json` — Added new dependencies
