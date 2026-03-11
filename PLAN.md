# VisualScript — Current Implementation Plan

## Architecture Overview

```
=== LIVE MODE (LivePage) ===

Mic/Audio File → WebSocket (localhost:3001) → Deepgram STT → finalized sentences
                                                                    ↓
                                                    evolvingChartController.js
                                                    (debounce, filler filter, batch)
                                                                    ↓
                                                POST /api/generate-chart-claude
                                                (Claude picks action: new/update/skip)
                                                                    ↓
                                         ┌──────────────────────────┴──────────────────────────┐
                                         ↓                                                      ↓
                              Claude chart added to feed                            POST /api/generate-chart
                              (scrollable card per topic)                           (Napkin AI visual, parallel)
                                         ↓                                          + napkinVisualType hint
                              LivePage renders scrollable feed                               ↓
                              of chart cards with toggle                           Napkin image stored per card
                              + per-card transcript section                        (toggle to view)

=== UPLOAD MODE (VisualizePage) ===

Upload/Paste transcript → Parse into lines + speakers + stats
                                         ↓
                         POST /api/generate-transcript-visuals
                         (Claude analyzes full transcript, returns 1-8 charts per topic)
                                         ↓
                         ┌───────────────┴───────────────┐
                         ↓                               ↓
              Claude charts displayed          POST /api/generate-chart (per chart)
              in scrollable feed               (Napkin AI visual, parallel)
                         ↓                     + napkinVisualType hint
              VisualizePage dual-panel layout            ↓
              AI Visuals (left) | Transcript (right)   Napkin image stored per card

=== PERSISTENCE (Supabase) ===

Session save triggers:
  Upload mode → after charts + sections generated
  Live mode → when recording stops

Flow:
  1. Create session record (sessions table)
  2. Insert chart rows (charts table) with chart_data, napkin base64, transcript
  3. Insert sections row (sections table)
  4. Upload audio file to Supabase Storage (audio-files bucket)
  5. Capture Claude chart DOM → PNG → upload to Supabase Storage (chart-images bucket)
  6. Convert Napkin base64 SVG → blob → upload to Supabase Storage (chart-images bucket)
  7. Update chart rows with storage URLs (chart_image_url, napkin_image_url)
```

## What's Been Done

### 1. evolvingChartController.js (DONE)
- Replaces old 4s setInterval + 5-sentence sliding window
- Filters filler locally (um, uh, greetings) — never reaches API
- Debounces: 3s for first chart, 5s after last sentence for subsequent
- Max-wait cap: 12s forces a call even during continuous speech
- Rate-limits: 6s minimum between API calls
- Tracks ALL sentences for current topic (capped at 60)
- On "new": appends new card to feed, resets topic tracking
- On "update": replaces last card in feed in-place
- On "skip": does nothing
- On failure: puts sentences back in buffer
- Flush on stream end
- Passes `topicSentences` array with `onChartUpdate` and `onChartNew` callbacks
- Extracts `transformedTranscript` from Claude response, passes as 3rd argument to callbacks

### 2. Claude System Prompt — Live Mode (DONE)
- Single prompt handles chart-worthiness, topic detection, AND chart generation
- Three actions: SKIP, UPDATE (same visual structure), NEW (different topic or aspect)
- 6 chart types: mermaid_flowchart, mermaid_sequence, timeline, comparison, mindmap, infographic
- **Flowcharts consolidated into mermaid_flowchart** — all flowcharts render via Mermaid.js
- Topic Continuity Rule, Subtopic Guideline
- Transformed Transcript field in every response (cumulative on UPDATE)
- `napkinVisualType` field in every response — tells Napkin AI what visual to generate
- Anti-infographic rule, variety rule
- All output enforced in English (LANGUAGE RULE)

### 3. Claude System Prompt — Upload Mode (DONE)
- `/api/generate-transcript-visuals` — takes complete transcript, returns `{charts: [...]}`
- Claude analyzes the FULL transcript at once and identifies key topics
- **ONE CHART PER TOPIC** — never duplicates charts for the same topic
- Generates diverse chart types across topics (variety rule enforced)
- Each chart includes `transformedTranscript` (clean prose for Napkin AI)
- Each chart includes `topicSummary` (2-6 word summary)
- Each chart includes `napkinVisualType` — visual type hint for Napkin AI
- Same 6 chart types and size limits as live mode
- Max tokens 8192 to handle multiple charts in one response
- All output enforced in English (LANGUAGE RULE)

### 4. API Handlers (DONE)
- **`/api/generate-chart-claude`** — Live mode: newSentences, allTopicSentences, currentChart, topicSummary, existingTypes
- **`/api/generate-transcript-visuals`** — Upload mode: full transcript text → array of charts
- **`/api/generate-chart`** — Napkin AI visual generation (both modes), accepts `forcedType` → `visual_query`
- **`/api/generate-sections`** — Section extraction (concepts, suggestions, actions, quiz)
- **`/api/ask-question`** — Q&A about transcript
- All endpoints have both Vercel serverless (`frontend/api/`) and Vite dev middleware (`vite.config.js`)

### 5. MermaidRenderer (DONE)
- Renders ALL flowcharts (mermaid_flowchart, mermaid_sequence, and legacy flowchart type)
- Dynamic mermaid import, theme-aware (dark/light)
- Smooth opacity crossfade on update re-renders
- Fallback shows raw mermaid code on render error

### 6. ChartRouter (DONE)
- `flowchart`, `mermaid_flowchart`, `mermaid_sequence` all route → MermaidRenderer

### 7. LivePage.jsx (DONE)
- **Side-by-side dual panel layout**:
  - Left: Scrollable AI Visuals feed (chart cards)
  - Right: Live Transcript (340px)
- Each card: header (title + type badge + LIVE indicator), body (chart or Napkin image), collapsible transcripts
- Source toggle: Claude / Napkin AI
- Napkin AI generation fires in parallel (receives transformedTranscript + napkinVisualType)
- Pulsing "Evolving..." indicator, "Listening..." placeholder
- Auto-scroll to newest card, active card highlighted
- `data-chart-id` attribute on chart body elements for image capture

### 8. VisualizePage.jsx (DONE)
- **Side-by-side dual panel layout** (matching LivePage):
  - Left: Scrollable AI Visuals feed (chart cards)
  - Right: Transcript panel (340px, plain text, no speaker labels)
- On page load, sends full transcript to `/api/generate-transcript-visuals`
- Claude returns 1-8 charts covering key topics (one per topic)
- Napkin AI fired in parallel for each chart (using transformedTranscript + napkinVisualType)
- `AIVisualCard` component: header (title + type badge), body (Claude chart or Napkin image), collapsible transcript context
- Claude/Napkin toggle in the AI Visuals panel header
- Loading state with spinner while generating
- Error state if generation fails
- `data-chart-id` attribute on chart body elements for image capture
- **Transcript panel**: Simple plain text (no dialogue-style speaker labels)
- **Other sections preserved below**: Timeline, Speaker Analytics, Key Concepts, Suggestions, Action Items, Quiz, Ask AI

### 9. Frontend Service Functions (DONE)
- `chartAI.js` exports:
  - `generateTranscriptVisuals(text)` — full transcript → array of charts
  - `generateNapkinVisual(text, forcedType)` — text → Napkin AI image URL (accepts visual type hint)
  - `generateChart(text, forcedType)` — legacy Napkin generation
  - `generateChartClaude(text, forcedType)` — legacy Claude generation
  - `generateSections(text)` — section extraction
  - `askAI(text, question)` — Q&A

### 10. Diff-Based Animations (DONE)
- TimelineRenderer: new events slide in, existing get highlight flash
- ComparisonRenderer: new cards slide in, new pros/cons animate in
- InfographicRenderer: new sections scale in, updated values flash
- MindmapRenderer: D3 has 600ms enter transitions built in
- MermaidRenderer: opacity crossfade on re-render

### 11. Napkin AI Integration (DONE)
- `/api/generate-chart` endpoint (Napkin API with polling)
- Accepts `forcedType` → maps to `visual_query` in Napkin API for chart type hints
- **Live mode**: on each `onChartNew`, transformedTranscript + napkinVisualType sent to Napkin in parallel
- **Upload mode**: after Claude returns charts, Napkin fired for each using transformedTranscript + napkinVisualType
- Napkin image stored per feed card (`napkinImage`, `napkinLoading`, `napkinError`)
- Toggle switches all cards between Claude charts and Napkin AI images
- Loading spinner shown while Napkin generates; error state if it fails
- English-only instruction prefix on all Napkin content

### 12. Transformed Transcript (DONE)
- Claude returns `transformedTranscript` in every NEW/UPDATE response (both modes)
- Clean, professional prose — filler removed, key facts preserved
- **Cumulative on UPDATE**: Claude appends new info to existing transformedTranscript, never truncates
- Optimized for Napkin AI visual generation
- Displayed in card view as collapsible "View Transcript Context" section
- Data flows: Claude response → stored per card → Napkin uses + UI displays

### 13. Supabase Persistence (DONE)
- **Database tables**: `sessions`, `charts`, `sections`
- **Storage buckets**: `audio-files` (audio uploads), `chart-images` (chart PNGs + Napkin SVGs)
- **Session save flow**:
  1. Upload audio file to `audio-files` bucket (if present)
  2. Create `sessions` row (title, transcript, mode, duration, word_count, audio URLs)
  3. Insert `charts` rows (chart_data JSONB, napkin_image_url, transcript, transformed_transcript, topic_summary)
  4. Insert `sections` row (concepts, suggestions, action_items, quiz_data, suggested_qs)
  5. Non-blocking: capture Claude chart DOM → PNG → upload to `chart-images` bucket
  6. Non-blocking: convert Napkin base64 SVG → blob → upload to `chart-images` bucket
  7. Update chart rows with Supabase Storage URLs (`chart_image_url`, `napkin_image_url`)
- **Services**:
  - `sessionStorage.js` — `saveUploadSession()`, `saveLiveSession()`, `updateChartNapkinImage()`
  - `chartCapture.js` — `captureAndUploadCharts()` (DOM capture + Napkin blob upload)
  - `supabase.js` — Supabase client init + `isSupabaseConfigured()` check

### 14. Napkin Visual Type Suggestion (DONE)
- Claude includes `napkinVisualType` in every chart response (NEW and UPDATE)
- Mapping: mermaid_flowchart→"flowchart", mermaid_sequence→"sequence diagram", timeline→"timeline", comparison→"comparison table", mindmap→"mind map", infographic→"infographic"
- Passed through to Napkin API as `visual_query` parameter
- Both LivePage and VisualizePage extract from chart data and forward to Napkin

## Files Summary

| File | Status | Description |
|------|--------|-------------|
| `frontend/src/services/evolvingChartController.js` | DONE | Intelligent batching + topic tracking (live mode) |
| `frontend/src/services/chartAI.js` | DONE | API client functions incl. generateTranscriptVisuals, generateNapkinVisual(text, forcedType) |
| `frontend/src/services/sessionStorage.js` | DONE | Supabase persistence — save sessions, charts, sections, audio |
| `frontend/src/services/chartCapture.js` | DONE | Chart image capture (DOM→PNG) + Napkin SVG upload to Supabase Storage |
| `frontend/src/services/supabase.js` | DONE | Supabase client initialization |
| `frontend/api/generate-chart-claude.js` | DONE | Live mode prompt + handler (Vercel) |
| `frontend/api/generate-transcript-visuals.js` | DONE | Upload mode — full transcript → multiple charts (Vercel) |
| `frontend/api/generate-chart.js` | DONE | Napkin AI visual generation with forcedType→visual_query (Vercel) |
| `frontend/api/generate-sections.js` | DONE | Section extraction (Vercel) |
| `frontend/api/ask-question.js` | DONE | Q&A endpoint (Vercel) |
| `frontend/vite.config.js` | DONE | All API middleware synced (dev) |
| `frontend/vercel.json` | DONE | All serverless function configs |
| `frontend/src/components/charts/MermaidRenderer.jsx` | DONE | Mermaid renderer (flowcharts + sequences) |
| `frontend/src/components/ChartRouter.jsx` | DONE | Routes all flowcharts to MermaidRenderer |
| `frontend/src/pages/LivePage.jsx` | DONE | Dual-panel: AI Visuals feed + Live Transcript |
| `frontend/src/pages/VisualizePage.jsx` | DONE | Dual-panel: AI Visuals feed + Transcript + sections below |
| `frontend/src/components/charts/TimelineRenderer.jsx` | DONE | Diff animations |
| `frontend/src/components/charts/ComparisonRenderer.jsx` | DONE | Diff animations |
| `frontend/src/components/charts/InfographicRenderer.jsx` | DONE | Diff animations |
| `backend/server.py` | NO CHANGE | Deepgram WebSocket proxy |

## Tuning Knobs (evolvingChartController.js — Live Mode)

| Constant | Default | Description |
|----------|---------|-------------|
| MIN_API_INTERVAL_MS | 6000 | Minimum ms between API calls |
| DEBOUNCE_FIRST_MS | 3000 | Debounce for first chart |
| DEBOUNCE_MS | 5000 | Debounce for subsequent charts |
| MAX_WAIT_MS | 12000 | Max wait before forcing call |
| MIN_SENTENCES_TO_TRIGGER | 1 | Min sentences to trigger API call |
| MAX_TOPIC_SENTENCES | 60 | Cap sentences sent to Claude |

## Database Schema

```sql
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  transcript TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('live', 'upload')),
  duration INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  audio_file_url TEXT,
  audio_file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE charts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  chart_type TEXT,
  chart_data JSONB,
  napkin_image_url TEXT,
  topic_summary TEXT,
  transcript TEXT,
  transformed_transcript TEXT,
  chart_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  concepts JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  quiz_data JSONB DEFAULT '[]',
  suggested_qs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Storage Buckets

| Bucket | Access | Contents |
|--------|--------|----------|
| `audio-files` | Public | Uploaded audio files (.webm, .mp3, etc.) |
| `chart-images` | Public | Claude chart PNGs (`{sessionId}/{position}.png`) + Napkin SVGs (`{sessionId}/{position}-napkin.svg`) |
