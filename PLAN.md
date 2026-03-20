# VisualScript — Current Implementation Plan

## Architecture Overview

```
=== CANVAS MODE (Visualize2Page — primary) ===

Upload/Paste transcript → Visualize2Page
                              ↓
                    POST /api/generate-canvas
                    (template pipeline or legacy fallback)
                              ↓
          ┌───────────────────┴───────────────────┐
          ↓                                       ↓
   Template Pipeline                        Legacy Fallback
   (Supabase configured)                   (no Supabase/no templates)
          ↓                                       ↓
   FETCH_TEMPLATES → SPLIT                  Hardcoded 11-type
   → PRE_FILTER → LLM_SELECT               system prompt
   → CONFIDENCE_GATE → DEDUP                     ↓
          ↓                                 Returns visuals[]
   Returns visuals[]
          ↓
   Visualize2Page renders all sections
   via TemplateRenderer (HTML templates)
   or legacy VisualRenderer (built-in components)

=== TEMPLATE PIPELINE (5-step selection) ===

1. FETCH_TEMPLATES  — Load active templates from Supabase visual_templates table
2. SPLIT            — Separate always-included (eli5, takeaways, blindspots) from selectable
3. PRE_FILTER       — Score selectable templates against transcript keywords using trigger_signals
4. LLM_SELECT       — Claude picks 3-5 best candidates + fills all schemas (always + selected)
5. CONFIDENCE_GATE  — Suppress visuals with confidence < 60, warn < 75
6. DEDUP            — Remove duplicates, enforce max 2 per category

=== LIVE MODE (LivePage2) ===

Mic/Audio → Deepgram STT → diarized sentences
                              ↓
                    evolvingChartController.js
                    (debounce, filler filter, batch)
                              ↓
                    POST /api/generate-chart-claude
                    (Claude picks action: new/update/skip)
                              ↓
                    LivePage2 renders evolving canvas
                    with real-time transcript diarization

=== UPLOAD MODE — LEGACY (VisualizePage) ===

Upload/Paste transcript → VisualizePage
                              ↓
              POST /api/generate-transcript-visuals
              (Claude: title + subtitle + 1-8 charts)
                              ↓
              Napkin AI fired in parallel per chart
              VisualizePage renders chart feed + sections

=== PERSISTENCE (Supabase) ===

Tables: sessions, charts, sections, visual_templates, template_usage, visual_feedback
Buckets: audio-files, chart-images
```

## What's Been Done

### 1. Template System (DONE)
- **55+ visual templates** in `seedTemplates.js` across 8 categories: always, structural, analytical, data, status, reference, people, brainstorm
- **Always-included sections**: eli5, takeaways, blindspots — filled by LLM every time, not part of selection
- **All other sections decided by Claude**: action_items, decision_log, flowchart, comparison, mindmap, proscons, metrics, timeline, etc.
- No hardcoded decisions/actions sections — everything is template-driven
- Templates stored in Supabase `visual_templates` table with schema, HTML template, CSS, trigger signals
- **TemplateRenderer** processes Handlebars-like syntax (`{{var}}`, `{{#each}}`, `{{#if}}`) with nested loop support
- **VisualFeedback** (thumbs up/down) shown on LLM-selected sections only, not on always-included

### 2. Canvas Generation Pipeline (DONE)
- **`/api/generate-canvas`** — dual mode: template pipeline or legacy fallback
- **Template mode**: fetches templates → splits always/selectable → pre-filters by keyword scoring → Claude selects + fills → confidence gating → dedup
- **`promptBuilder.js`**: builds dynamic system prompt with always-included schemas + candidate schemas
- **Pipeline logging**: detailed step-by-step logs in browser console (FETCH_TEMPLATES, SPLIT, PRE_FILTER, LLM_SELECT, CONFIDENCE_GATE, DEDUP, COMPLETE)
- **Legacy mode**: hardcoded 11-type system prompt, used when Supabase not configured or no templates seeded

### 3. Visualize2Page (DONE)
- **Canvas view**: left sidebar (transcript) + right panel (visual sections)
- **Dynamic navbar**: populated from all visuals in response (template_slug or type), plus Ask section
- **Section rendering**: TemplateRenderer for template-based visuals, legacy VisualRenderer for built-in types
- **Section headings**: icon + label from SECTION_META or template name
- **Console pipeline logging**: colored grouped output with step details and timing
- **Ask Q&A**: inline question/answer about the transcript
- **Text selection analysis**: select transcript text → analyze just that portion
- **Save to Supabase**: manual save button stores canvas session
- **Napkin integration**: auto-generates Napkin visuals for all sections on canvas load; user selects preferred variation (defaults to first); selected variation saved to Supabase on save; restored in history mode with Canvas/Napkin toggle

### 4. Admin Panel (DONE)
- **`/admin`** — AdminLayout with sidebar navigation
- **Template List** (`/admin/templates`): grid view, category filter, active toggle, seed defaults button
- **Template Editor** (`/admin/templates/:id`): edit schema, HTML, CSS, triggers, live preview
- **Brand Settings** (`/admin/brand`): colors, fonts, brand persistence
- **Analytics** (`/admin/analytics`): template usage stats, confidence scores, user ratings
- **Test Sandbox** (`/admin/sandbox`): paste transcript, run pipeline step-by-step

### 5. evolvingChartController.js — Live Mode (DONE)
- Filters filler locally (um, uh, greetings)
- Debounces: 3s for first chart, 5s after last sentence for subsequent
- Max-wait cap: 12s forces a call even during continuous speech
- Rate-limits: 6s minimum between API calls
- Tracks ALL sentences for current topic (capped at 60)
- Actions: new (append card), update (replace last card), skip (do nothing)

### 6. API Handlers (DONE)
- **`/api/generate-canvas`** — Canvas mode: template pipeline or legacy
- **`/api/generate-chart-claude`** — Live mode: evolving chart generation
- **`/api/generate-transcript-visuals`** — Legacy upload mode: full transcript → charts
- **`/api/generate-chart`** — Napkin AI visual generation
- **`/api/generate-sections`** — Section extraction (takeaways, eli5, blindspots, etc.)
- **`/api/ask-question`** — Q&A about transcript
- All endpoints have both Vercel serverless (`frontend/api/`) and Vite dev middleware (`vite.config.js`)
- Vite middleware delegates to actual `api/generate-canvas.js` handler via `server.ssrLoadModule`

### 7. Server-side Supabase (DONE)
- **`api/lib/supabaseServer.js`**: server-side client with service role key
  - `isServerSupabaseConfigured()` — checks env vars
  - `fetchActiveTemplates()` — queries visual_templates where is_active = true
  - `recordTemplateUsages()` — logs template selections
- **`api/lib/promptBuilder.js`**: builds dynamic prompts from template schemas
  - `buildCanvasPrompt(candidates, alwaysTemplates)` — canvas mode
  - `buildLivePrompt(candidates)` — live mode

### 8. Frontend Services (DONE)
- **`chartAI.js`**: generateCanvas, generateTranscriptVisuals, generateNapkinVisual, generateSections, askAI
- **`templateService.js`**: CRUD + caching for visual_templates, brand settings, feedback, usage stats
- **`sessionStorage.js`**: save/load canvas sessions, charts, sections to Supabase
- **`chartCapture.js`**: DOM-to-PNG capture + Supabase Storage upload
- **`supabase.js`**: client initialization

### 9. Hooks (DONE)
- **`useTemplates.js`**: loads visual templates from Supabase, provides `getTemplate(slug)`
- **`useChartGeneration.js`**: single chart generation lifecycle
- **`useSectionGeneration.js`**: section data from Claude
- **`useBackgroundPregen.js`** / **`useBackgroundPregenClaude.js`**: background pre-generation
- **`useMultiChartGeneration.js`** / **`useMultiChartGenerationClaude.js`**: cached chart polling

### 10. Chart Renderers (DONE)
- **MermaidRenderer**: flowchart, sequence, class, ER, state, gantt via Mermaid.js
- **MindmapRenderer**: hierarchical mindmaps via Mermaid
- **TimelineRenderer**: chronological timelines with diff animations
- **ComparisonRenderer**: comparison matrices with diff animations
- **InfographicRenderer**: data infographics with diff animations
- **FlowchartRenderer**: process flows and decision trees
- **TemplateRenderer**: renders any HTML template from visual_templates with CSS injection

### 11. LivePage2 (DONE)
- Real-time transcript diarization
- Canvas-based multi-visual system with template support
- Dual panel: live transcript + evolving visuals

### 12. Supabase Persistence (DONE)
- **Sessions**: title, transcript, mode, duration, word_count, audio URLs
- **Sessions canvas_data**: visuals, decisions, actions, infographic_image_url, napkin_images (map of visual index → Storage URL)
- **Charts**: chart_data JSONB, napkin_image_url, transcript, topic_summary
- **Sections**: takeaways, eli5, blindspots, concepts, suggestions, action_items, quiz_data
- **Visual Templates**: slug, schema, html_template, css_template, trigger_signals, category
- **Template Usage**: template_id, session_id, confidence_score, selection_time_ms
- **Visual Feedback**: template_id, session_id, rating, visual_data
- **Storage**: `chart-images/infographics/` (Gemini infographics), `chart-images/napkin/` (Napkin AI selected variations)

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | UploadPage | Transcript upload (drag & drop, paste, file) |
| `/visualize` | VisualizePage | Legacy chart feed + sections |
| `/visualize2` | Visualize2Page | Canvas view with template pipeline |
| `/live` | LivePage | Legacy real-time meeting |
| `/live2` | LivePage2 | Enhanced real-time with diarization + templates |
| `/history` | HistoryPage | Saved session list |
| `/admin` | AdminLayout → TemplateList | Template management grid |
| `/admin/templates/:id` | TemplateEditor | Edit individual template |
| `/admin/brand` | BrandSettings | Brand customization |
| `/admin/analytics` | Analytics | Usage statistics |
| `/admin/sandbox` | TestSandbox | Pipeline testing tool |

## Files Summary

| File | Description |
|------|-------------|
| **Pages** | |
| `src/pages/Visualize2Page.jsx` | Canvas view — template pipeline, dynamic navbar, console logging |
| `src/pages/LivePage2.jsx` | Real-time meeting with diarization + templates |
| `src/pages/VisualizePage.jsx` | Legacy chart feed + sections |
| `src/pages/LivePage.jsx` | Legacy real-time meeting |
| `src/pages/UploadPage.jsx` | Transcript upload |
| `src/pages/HistoryPage.jsx` | Session history list |
| `src/pages/admin/AdminLayout.jsx` | Admin panel layout |
| `src/pages/admin/TemplateList.jsx` | Template grid + seed |
| `src/pages/admin/TemplateEditor.jsx` | Template editor + live preview |
| `src/pages/admin/BrandSettings.jsx` | Brand customization |
| `src/pages/admin/Analytics.jsx` | Usage stats dashboard |
| `src/pages/admin/TestSandbox.jsx` | Pipeline sandbox |
| **API Handlers** | |
| `api/generate-canvas.js` | Canvas generation (template pipeline + legacy) |
| `api/generate-chart-claude.js` | Live mode evolving charts |
| `api/generate-transcript-visuals.js` | Legacy upload mode charts |
| `api/generate-chart.js` | Napkin AI visual generation |
| `api/generate-napkin-visual.js` | Napkin AI visual (canvas mode) |
| `api/generate-sections.js` | Section extraction |
| `api/ask-question.js` | Q&A endpoint |
| `api/lib/supabaseServer.js` | Server-side Supabase client |
| `api/lib/promptBuilder.js` | Dynamic prompt builder |
| **Services** | |
| `src/services/chartAI.js` | API client (generateCanvas, etc.) |
| `src/services/templateService.js` | Template CRUD + caching |
| `src/services/sessionStorage.js` | Supabase persistence (canvas sessions, napkin image upload) |
| `src/services/evolvingChartController.js` | Live mode batching |
| `src/services/chartCapture.js` | DOM-to-PNG capture |
| `src/services/supabase.js` | Supabase client init |
| **Components** | |
| `src/components/TemplateRenderer.jsx` | HTML template engine (nested #each, #if) |
| `src/components/VisualFeedback.jsx` | Thumbs up/down rating |
| `src/components/ChartRouter.jsx` | Routes to chart renderers |
| `src/components/charts/*.jsx` | Mermaid, Mindmap, Timeline, Comparison, Infographic, Flowchart renderers |
| **Data** | |
| `src/data/seedTemplates.js` | 55+ template definitions + DB schema SQL |
| **Config** | |
| `vite.config.js` | Dev middleware (delegates to api/generate-canvas.js) |
| `vercel.json` | Serverless function configs |

## Template Categories

| Category | Purpose | Examples |
|----------|---------|---------|
| `always` | Included in every canvas | eli5, takeaways, blindspots |
| `structural` | Process and architecture | flowchart, system_diagram, process_flow, dependency_map |
| `analytical` | Analysis and comparison | proscons, comparison, decision_log, action_items, risk_matrix |
| `data` | Numbers and metrics | metrics, budget_tracker, kpi_dashboard |
| `status` | Progress tracking | milestones, sprint_status, progress_tracker |
| `reference` | Information lookup | definitions, glossary, acronym_decoder |
| `people` | Team and roles | stakeholder_map, raci_matrix, team_workload |
| `brainstorm` | Ideas and creativity | brainstorm_cloud, what_if_scenarios |

## Database Schema

```sql
-- Core tables
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT, subtitle TEXT, transcript TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('live', 'upload')),
  duration INTEGER DEFAULT 0, word_count INTEGER DEFAULT 0,
  canvas_data JSONB, audio_file_url TEXT, audio_file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE charts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  chart_type TEXT, chart_data JSONB,
  napkin_image_url TEXT, chart_image_url TEXT,
  topic_summary TEXT, transcript TEXT, transformed_transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  takeaways JSONB DEFAULT '[]', eli5 JSONB DEFAULT '{}',
  blindspots JSONB DEFAULT '[]', concepts JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]', action_items JSONB DEFAULT '[]',
  quiz_data JSONB DEFAULT '[]', suggested_qs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Template system tables
CREATE TABLE visual_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  category TEXT NOT NULL, version INTEGER DEFAULT 1,
  schema JSONB NOT NULL, html_template TEXT NOT NULL,
  css_template TEXT DEFAULT '', css_variables_used TEXT[] DEFAULT '{}',
  render_type TEXT DEFAULT 'html',
  trigger_signals TEXT[] DEFAULT '{}',
  meeting_affinity TEXT[] DEFAULT '{}',
  conversation_pattern TEXT,
  min_data_points INTEGER DEFAULT 1, max_data_points INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE template_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES visual_templates(id),
  session_id UUID, confidence_score NUMERIC,
  selection_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE visual_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES visual_templates(id),
  session_id TEXT, rating INTEGER CHECK (rating IN (-1, 1)),
  visual_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Environment Variables

| Variable | Side | Purpose |
|----------|------|---------|
| `ANTHROPIC_API_KEY` | Server | Claude API key |
| `VITE_ANTHROPIC_API_KEY` | Client | Claude API key (for legacy client-side calls) |
| `VITE_DEEPGRAM_API_KEY` | Client | Deepgram STT for live mode |
| `NAPKIN_API_KEY` | Server | Napkin AI visual generation |
| `VITE_SUPABASE_URL` | Client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client | Supabase anonymous key |
| `SUPABASE_URL` | Server | Supabase project URL (for serverless functions) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase service role key (for serverless functions) |

## Tuning Knobs

### evolvingChartController.js (Live Mode)
| Constant | Default | Description |
|----------|---------|-------------|
| MIN_API_INTERVAL_MS | 6000 | Minimum ms between API calls |
| DEBOUNCE_FIRST_MS | 3000 | Debounce for first chart |
| DEBOUNCE_MS | 5000 | Debounce for subsequent charts |
| MAX_WAIT_MS | 12000 | Max wait before forcing call |
| MAX_TOPIC_SENTENCES | 60 | Cap sentences sent to Claude |

### Template Pipeline (generate-canvas.js)
| Setting | Value | Description |
|---------|-------|-------------|
| Always-included slugs | eli5, takeaways, blindspots | Filled every time, bypass selection |
| LLM selection target | 3-5 candidates | From pre-filtered pool |
| Confidence suppress | < 60 | Visual dropped |
| Confidence warn | < 75 | Visual kept with warning |
| Category cap | 2 per category | Dedup variety enforcement |
| LLM timeout | 100s | AbortController timeout |
| LLM model | claude-sonnet-4-20250514 | For canvas generation |
