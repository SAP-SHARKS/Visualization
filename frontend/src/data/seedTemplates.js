/**
 * Seed data for the initial 11 visual templates.
 * Run insertSeedTemplates() once to populate the visual_templates table.
 *
 * SQL to create tables (run in Supabase SQL editor first):
 *
 * CREATE TABLE visual_templates (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name TEXT NOT NULL UNIQUE,
 *   slug TEXT NOT NULL UNIQUE,
 *   category TEXT NOT NULL,
 *   version INTEGER DEFAULT 1,
 *   is_active BOOLEAN DEFAULT true,
 *   schema JSONB NOT NULL,
 *   example_input JSONB,
 *   example_output JSONB,
 *   html_template TEXT NOT NULL,
 *   css_template TEXT DEFAULT '',
 *   css_variables_used TEXT[] DEFAULT '{}',
 *   render_type TEXT DEFAULT 'html',
 *   react_component_name TEXT,
 *   trigger_signals TEXT[] DEFAULT '{}',
 *   meeting_affinity TEXT[] DEFAULT '{}',
 *   conversation_pattern TEXT,
 *   min_data_points INTEGER DEFAULT 1,
 *   max_data_points INTEGER DEFAULT 20,
 *   similar_templates UUID[] DEFAULT '{}',
 *   when_to_prefer_over_similar TEXT,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * CREATE INDEX idx_templates_active ON visual_templates (is_active) WHERE is_active = true;
 * CREATE INDEX idx_templates_category ON visual_templates (category);
 * CREATE INDEX idx_templates_trigger_signals ON visual_templates USING GIN (trigger_signals);
 * CREATE INDEX idx_templates_meeting_affinity ON visual_templates USING GIN (meeting_affinity);
 *
 * CREATE TABLE template_usage (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   template_id UUID REFERENCES visual_templates(id) ON DELETE CASCADE,
 *   session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
 *   confidence_score REAL,
 *   selection_time_ms INTEGER,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 * CREATE INDEX idx_usage_template ON template_usage (template_id);
 *
 * CREATE TABLE visual_feedback (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   template_id UUID REFERENCES visual_templates(id) ON DELETE CASCADE,
 *   session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
 *   rating INTEGER CHECK (rating IN (-1, 1)),
 *   visual_data JSONB,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 * CREATE INDEX idx_feedback_template ON visual_feedback (template_id);
 *
 * CREATE TABLE brand_settings (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name TEXT DEFAULT 'default',
 *   primary_color TEXT DEFAULT '#3dd68c',
 *   accent_color TEXT DEFAULT '#5bf5dc',
 *   heading_font TEXT DEFAULT 'DM Serif Display',
 *   body_font TEXT DEFAULT 'DM Sans',
 *   is_active BOOLEAN DEFAULT true,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * ALTER TABLE visual_templates ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE template_usage ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE visual_feedback ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow all" ON visual_templates FOR ALL USING (true) WITH CHECK (true);
 * CREATE POLICY "Allow all" ON template_usage FOR ALL USING (true) WITH CHECK (true);
 * CREATE POLICY "Allow all" ON visual_feedback FOR ALL USING (true) WITH CHECK (true);
 * CREATE POLICY "Allow all" ON brand_settings FOR ALL USING (true) WITH CHECK (true);
 */

import { supabase, isSupabaseConfigured } from '../services/supabase'

export const SEED_TEMPLATES = [
  // ── ALWAYS CATEGORY ───────────────────────────────────
  {
    name: 'Key Takeaways',
    slug: 'takeaways',
    category: 'always',
    version: 1,
    schema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          minItems: 3,
          maxItems: 5,
          items: {
            type: 'object',
            required: ['text'],
            properties: {
              text: { type: 'string' },
              highlight: { type: 'boolean', default: false },
            },
          },
        },
      },
    },
    html_template: `<div class="tmpl-takeaways">
  {{#each items}}
  <div class="v2-takeaway {{#if highlight}}highlight{{/if}}">
    <div class="v2-takeaway-text">{{text}}</div>
  </div>
  {{/each}}
</div>`,
    css_template: `.v2-takeaway{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 22px;margin-bottom:10px;display:flex;align-items:flex-start;gap:14px;transition:all .3s;}
.v2-takeaway:hover{border-color:rgba(61,214,140,0.2);transform:translateX(4px);}
.v2-takeaway.highlight{border-color:rgba(61,214,140,0.3);background:linear-gradient(135deg,rgba(61,214,140,0.06),rgba(91,245,220,0.03));}
.v2-takeaway.highlight::before{content:'KEY';font-size:9px;font-weight:700;letter-spacing:1px;background:#3dd68c;color:#06080c;padding:2px 8px;border-radius:6px;font-family:'JetBrains Mono',monospace;}
.v2-takeaway-text{font-size:15px;line-height:1.6;}
[data-theme="light"] .v2-takeaway{background:#fff;}
[data-theme="light"] .v2-takeaway:hover{border-color:rgba(99,102,241,0.2);}
[data-theme="light"] .v2-takeaway.highlight{border-color:rgba(99,102,241,0.3);background:linear-gradient(135deg,rgba(99,102,241,0.04),rgba(139,92,246,0.03));}
[data-theme="light"] .v2-takeaway.highlight::before{background:#6366f1;color:#fff;}`,
    css_variables_used: ['--surface', '--border'],
    render_type: 'html',
    trigger_signals: ['summary', 'takeaways', 'key points', 'highlights', 'conclusions', 'findings', 'main points'],
    meeting_affinity: ['all'],
    conversation_pattern: 'Always include. Required for every meeting analysis.',
    min_data_points: 3,
    max_data_points: 5,
  },
  {
    name: 'ELI5',
    slug: 'eli5',
    category: 'always',
    version: 1,
    schema: {
      type: 'object',
      required: ['simple'],
      properties: {
        simple: { type: 'string', description: '2-3 plain sentences for someone who just walked in' },
        analogy: { type: 'string', description: 'Real-world analogy or empty string' },
      },
    },
    html_template: `<div class="v2-eli5">
  <div class="v2-eli5-label">Explain Like I'm 5</div>
  <div class="v2-eli5-simple">{{simple}}</div>
  {{#if analogy}}<div class="v2-eli5-analogy">{{analogy}}</div>{{/if}}
</div>`,
    css_template: `.v2-eli5{background:linear-gradient(135deg,rgba(199,125,255,0.08),rgba(0,212,255,0.06));border:1px solid rgba(199,125,255,0.15);border-radius:20px;padding:32px;position:relative;overflow:hidden;}
.v2-eli5::before{content:'';position:absolute;top:-50%;right:-30%;width:60%;height:120%;background:radial-gradient(circle,rgba(199,125,255,0.06),transparent 60%);pointer-events:none;}
.v2-eli5-label{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#c77dff;margin-bottom:12px;}
.v2-eli5-simple{font-size:18px;font-weight:500;line-height:1.7;margin-bottom:16px;}
.v2-eli5-analogy{font-size:14px;color:var(--text-dim);padding:12px 16px;background:rgba(199,125,255,0.06);border-radius:10px;border-left:3px solid #c77dff;}
[data-theme="light"] .v2-eli5{background:linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.04));border-color:rgba(99,102,241,0.12);}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['explain', 'summary', 'overview', 'simple', 'basics', 'what is'],
    meeting_affinity: ['all'],
    conversation_pattern: 'Always include. Provides a plain-language summary of the meeting.',
    min_data_points: 1,
    max_data_points: 1,
  },
  {
    name: 'Blind Spots',
    slug: 'blindspots',
    category: 'always',
    version: 1,
    schema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          minItems: 2,
          maxItems: 4,
          items: {
            type: 'object',
            required: ['question', 'note'],
            properties: {
              question: { type: 'string', description: 'Specific unanswered question' },
              note: { type: 'string', description: 'Why this gap is risky' },
            },
          },
        },
      },
    },
    html_template: `<div class="tmpl-blindspots">
  {{#each items}}
  <div class="v2-blind">
    <div class="v2-blind-q">{{question}}</div>
    <div class="v2-blind-note">{{note}}</div>
  </div>
  {{/each}}
</div>`,
    css_template: `.v2-blind{background:var(--surface);border:1px solid rgba(255,80,80,0.15);border-radius:14px;padding:18px 22px;margin-bottom:10px;transition:all .3s;}
.v2-blind:hover{border-color:rgba(255,80,80,0.3);transform:translateX(4px);}
.v2-blind-q{font-size:15px;font-weight:600;color:#ff5050;margin-bottom:4px;}
.v2-blind-note{font-size:13px;color:var(--text-dim);}
[data-theme="light"] .v2-blind{background:#fff;border-color:rgba(239,68,68,0.12);}`,
    css_variables_used: ['--surface', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['risks', 'gaps', 'missing', 'unanswered', 'blind spots', 'concerns', 'what about'],
    meeting_affinity: ['all'],
    conversation_pattern: 'Always include. Highlights unanswered questions and gaps in the discussion.',
    min_data_points: 2,
    max_data_points: 4,
  },

  // ── STRUCTURAL CATEGORY ──────────────────────────────
  {
    name: 'Process Flow',
    slug: 'flowchart',
    category: 'structural',
    version: 1,
    schema: {
      type: 'object',
      required: ['mermaid'],
      properties: {
        mermaid: { type: 'string', description: 'Mermaid graph TD syntax, max 10 nodes, labels under 6 words' },
        caption: { type: 'string' },
      },
    },
    html_template: '',
    css_template: `.v2-chart-wrap{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;min-height:300px;}
.v2-chart-caption{font-size:13px;color:var(--text-dim);text-align:center;margin-top:12px;}
[data-theme="light"] .v2-chart-wrap{background:#fff;}`,
    css_variables_used: ['--surface', '--border', '--text-dim'],
    render_type: 'mermaid',
    trigger_signals: ['process', 'workflow', 'steps', 'sequence', 'how to', 'pipeline', 'flow', 'if then', 'decision tree'],
    meeting_affinity: ['technical', 'operations', 'planning'],
    conversation_pattern: 'Use when there is a process, sequence of steps, or if/then logic discussed.',
    min_data_points: 3,
    max_data_points: 10,
  },
  {
    name: 'Mind Map',
    slug: 'mindmap',
    category: 'structural',
    version: 1,
    schema: {
      type: 'object',
      required: ['root'],
      properties: {
        root: {
          type: 'object',
          required: ['label'],
          properties: {
            label: { type: 'string', description: 'Core meeting topic' },
            children: {
              type: 'array',
              items: {
                type: 'object',
                required: ['label'],
                properties: {
                  label: { type: 'string' },
                  children: {
                    type: 'array',
                    items: { type: 'object', properties: { label: { type: 'string' } } },
                  },
                },
              },
            },
          },
        },
      },
    },
    html_template: '',
    css_template: `.v2-mindmap-wrap{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:0;min-height:300px;overflow:hidden;}
[data-theme="light"] .v2-mindmap-wrap{background:#fff;}`,
    css_variables_used: ['--surface', '--border'],
    render_type: 'd3-mindmap',
    trigger_signals: ['topics', 'breakdown', 'categories', 'themes', 'brainstorm', 'hierarchy', 'structure', 'aspects'],
    meeting_affinity: ['brainstorm', 'strategy', 'planning'],
    conversation_pattern: 'Use when no flowchart is present and there are multiple themes or topics to map.',
    min_data_points: 4,
    max_data_points: 6,
  },

  // ── ANALYTICAL CATEGORY ──────────────────────────────
  {
    name: 'Problems & Solutions',
    slug: 'problemsolution',
    category: 'analytical',
    version: 1,
    schema: {
      type: 'object',
      required: ['problems', 'solutions'],
      properties: {
        problems: { type: 'array', items: { type: 'string' }, description: 'Specific problems discussed' },
        solutions: { type: 'array', items: { type: 'string' }, description: 'Proposed fixes, matched where possible' },
      },
    },
    html_template: `<div class="v2-ps-grid">
  <div class="v2-ps-col">
    <div class="v2-ps-col-title prob">Problems</div>
    {{#each problems}}
    <div class="v2-ps-item"><div class="v2-ps-dot" style="background:#ff5050"></div>{{this}}</div>
    {{/each}}
  </div>
  <div class="v2-ps-col">
    <div class="v2-ps-col-title sol">Solutions</div>
    {{#each solutions}}
    <div class="v2-ps-item"><div class="v2-ps-dot" style="background:#00ff88"></div>{{this}}</div>
    {{/each}}
  </div>
</div>`,
    css_template: `.v2-ps-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.v2-ps-col{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;}
.v2-ps-col-title{font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;}
.v2-ps-col-title.prob{color:#ff5050;}
.v2-ps-col-title.sol{color:#00ff88;}
.v2-ps-item{font-size:14px;padding:10px 0;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:10px;}
.v2-ps-item:last-child{border-bottom:none;}
.v2-ps-dot{width:8px;height:8px;border-radius:50%;margin-top:6px;flex-shrink:0;}
[data-theme="light"] .v2-ps-col{background:#fff;}
@media(max-width:800px){.v2-ps-grid{grid-template-columns:1fr;}}`,
    css_variables_used: ['--surface', '--border'],
    render_type: 'html',
    trigger_signals: ['problem', 'issue', 'challenge', 'fix', 'solution', 'resolve', 'bug', 'pain point', 'blocker'],
    meeting_affinity: ['technical', 'standup', 'retrospective'],
    conversation_pattern: 'Use when no flowchart is present and problems with proposed solutions are discussed.',
    min_data_points: 2,
    max_data_points: 8,
  },
  {
    name: 'Pros & Cons',
    slug: 'proscons',
    category: 'analytical',
    version: 1,
    schema: {
      type: 'object',
      required: ['topic', 'pros', 'cons'],
      properties: {
        topic: { type: 'string', description: 'What is being weighed' },
        pros: { type: 'array', items: { type: 'string' } },
        cons: { type: 'array', items: { type: 'string' } },
      },
    },
    html_template: `<div class="tmpl-proscons">
  {{#if topic}}<div class="v2-pc-topic">{{topic}}</div>{{/if}}
  <div class="v2-pc-grid">
    <div class="v2-pc-col">
      <div class="v2-pc-col-title pro">Pros</div>
      {{#each pros}}
      <div class="v2-pc-item"><span style="color:#00ff88;font-weight:700">+</span> {{this}}</div>
      {{/each}}
    </div>
    <div class="v2-pc-col">
      <div class="v2-pc-col-title con">Cons</div>
      {{#each cons}}
      <div class="v2-pc-item"><span style="color:#ff5050;font-weight:700">-</span> {{this}}</div>
      {{/each}}
    </div>
  </div>
</div>`,
    css_template: `.v2-pc-topic{font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text);}
.v2-pc-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.v2-pc-col{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;}
.v2-pc-col-title{font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;}
.v2-pc-col-title.pro{color:#00ff88;}
.v2-pc-col-title.con{color:#ff5050;}
.v2-pc-item{font-size:14px;padding:10px 0;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:10px;}
.v2-pc-item:last-child{border-bottom:none;}
[data-theme="light"] .v2-pc-col{background:#fff;}
@media(max-width:800px){.v2-pc-grid{grid-template-columns:1fr;}}`,
    css_variables_used: ['--surface', '--border', '--text'],
    render_type: 'html',
    trigger_signals: ['pros', 'cons', 'advantages', 'disadvantages', 'trade-off', 'debate', 'versus', 'should we'],
    meeting_affinity: ['strategy', 'decision', 'planning'],
    conversation_pattern: 'Use when a debate or trade-off is being discussed.',
    min_data_points: 2,
    max_data_points: 10,
  },
  {
    name: 'Comparison Table',
    slug: 'comparison',
    category: 'analytical',
    version: 1,
    schema: {
      type: 'object',
      required: ['options', 'criteria'],
      properties: {
        options: { type: 'array', items: { type: 'string' }, description: 'Options being compared' },
        criteria: {
          type: 'array',
          minItems: 3,
          maxItems: 6,
          items: {
            type: 'object',
            required: ['name', 'values'],
            properties: {
              name: { type: 'string' },
              values: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    html_template: `<table class="v2-comp-table">
  <thead>
    <tr>
      <th>Criteria</th>
      {{#each options}}<th>{{this}}</th>{{/each}}
    </tr>
  </thead>
  <tbody>
    {{#each criteria}}
    <tr>
      <td style="font-weight:600">{{name}}</td>
      {{#each values}}<td>{{this}}</td>{{/each}}
    </tr>
    {{/each}}
  </tbody>
</table>`,
    css_template: `.v2-comp-table{width:100%;border-collapse:collapse;background:var(--surface);border-radius:16px;overflow:hidden;border:1px solid var(--border);}
.v2-comp-table th{padding:14px 18px;text-align:left;font-size:13px;font-weight:700;color:var(--accent);border-bottom:2px solid var(--border);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px;}
.v2-comp-table td{padding:12px 18px;font-size:14px;border-bottom:1px solid var(--border);}
.v2-comp-table tr:last-child td{border-bottom:none;}
.v2-comp-table tr:hover td{background:var(--accent-glow);}
[data-theme="light"] .v2-comp-table{background:#fff;}`,
    css_variables_used: ['--surface', '--border', '--accent', '--accent-glow'],
    render_type: 'html',
    trigger_signals: ['compare', 'versus', 'options', 'alternatives', 'evaluation', 'which one', 'side by side'],
    meeting_affinity: ['strategy', 'technical', 'decision'],
    conversation_pattern: 'Use when 2 or more options are being compared on attributes.',
    min_data_points: 3,
    max_data_points: 6,
  },

  // ── DATA CATEGORY ────────────────────────────────────
  {
    name: 'Timeline',
    slug: 'timeline',
    category: 'data',
    version: 1,
    schema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['time', 'event'],
            properties: {
              time: { type: 'string', description: 'Date or period label' },
              event: { type: 'string', description: 'What happened/happens' },
              note: { type: 'string', description: 'Optional context' },
              done: { type: 'boolean', default: false },
            },
          },
        },
      },
    },
    html_template: '',
    css_template: '',
    css_variables_used: [],
    render_type: 'react-component',
    react_component_name: 'TimelineRenderer',
    trigger_signals: ['timeline', 'schedule', 'milestones', 'phases', 'roadmap', 'dates', 'deadline', 'quarter', 'sprint'],
    meeting_affinity: ['planning', 'strategy', 'project'],
    conversation_pattern: 'Use when dates, phases, or a schedule is discussed.',
    min_data_points: 3,
    max_data_points: 10,
  },
  {
    name: 'Key Metrics',
    slug: 'metrics',
    category: 'data',
    version: 1,
    schema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          minItems: 3,
          maxItems: 6,
          items: {
            type: 'object',
            required: ['value', 'name'],
            properties: {
              value: { type: 'string', description: 'The metric value, e.g. "$2.4M"' },
              name: { type: 'string', description: 'Metric name in UPPERCASE' },
              context: { type: 'string', description: 'Additional context like trend' },
              color: { type: 'string', description: 'Hex color: #00ff88 good, #ff5050 bad, #00d4ff neutral' },
            },
          },
        },
      },
    },
    html_template: `<div class="v2-metrics-grid">
  {{#each items}}
  <div class="v2-metric">
    <div class="v2-metric-value" style="color:{{color}}">{{value}}</div>
    <div class="v2-metric-name">{{name}}</div>
    {{#if context}}<div class="v2-metric-ctx">{{context}}</div>{{/if}}
  </div>
  {{/each}}
</div>`,
    css_template: `.v2-metrics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;}
.v2-metric{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;text-align:center;position:relative;overflow:hidden;transition:all .3s;}
.v2-metric:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.2);}
.v2-metric::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;transition:opacity .3s;}
.v2-metric:hover::before{opacity:1;}
.v2-metric-value{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:700;margin-bottom:4px;}
.v2-metric-name{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;}
.v2-metric-ctx{font-size:12px;color:var(--text-dim);margin-top:6px;}
[data-theme="light"] .v2-metric{background:#fff;}
@media(max-width:800px){.v2-metrics-grid{grid-template-columns:1fr 1fr;}}`,
    css_variables_used: ['--surface', '--border', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['numbers', 'metrics', 'KPI', 'revenue', 'percentage', 'growth', 'stats', 'data points', 'performance'],
    meeting_affinity: ['strategy', 'review', 'quarterly', 'standup'],
    conversation_pattern: 'Use when specific numbers, KPIs, or metrics are mentioned.',
    min_data_points: 3,
    max_data_points: 6,
  },

  // ── REFERENCE CATEGORY ───────────────────────────────
  {
    name: 'Glossary',
    slug: 'terms',
    category: 'reference',
    version: 1,
    schema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          minItems: 2,
          maxItems: 6,
          items: {
            type: 'object',
            required: ['term', 'definition'],
            properties: {
              term: { type: 'string', description: 'Technical term in UPPERCASE' },
              definition: { type: 'string', description: 'Plain English definition in 1-2 sentences' },
            },
          },
        },
      },
    },
    html_template: `<div class="tmpl-terms">
  {{#each items}}
  <div class="v2-term">
    <div class="v2-term-word">{{term}}</div>
    <div class="v2-term-def">{{definition}}</div>
  </div>
  {{/each}}
</div>`,
    css_template: `.v2-term{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 22px;margin-bottom:10px;transition:all .3s;}
.v2-term:hover{border-color:rgba(0,212,255,0.2);transform:translateX(4px);}
.v2-term-word{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:#00d4ff;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;}
.v2-term-def{font-size:14px;color:var(--text-dim);line-height:1.6;}
[data-theme="light"] .v2-term{background:#fff;}`,
    css_variables_used: ['--surface', '--border', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['terminology', 'jargon', 'acronym', 'definition', 'glossary', 'what does', 'stands for'],
    meeting_affinity: ['technical', 'onboarding', 'training'],
    conversation_pattern: 'Use when technical jargon, acronyms, or domain terms are used.',
    min_data_points: 2,
    max_data_points: 6,
  },

  // ── FLOW & PROCESS (T01–T08) ───────────────────────────
  {
    name: 'Linear Flow',
    slug: 'process_flow',
    category: 'structural',
    version: 1,
    schema: { type: 'object', required: ['steps'], properties: { steps: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'object', required: ['label'], properties: { icon: { type: 'string' }, label: { type: 'string' }, detail: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-pf">{{#each steps}}<div class="tmpl-pf-s">{{#if icon}}<div class="tmpl-pf-i">{{icon}}</div>{{/if}}<div class="tmpl-pf-l">{{label}}</div>{{#if detail}}<div class="tmpl-pf-d">{{detail}}</div>{{/if}}</div>{{/each}}</div>`,
    css_template: `.tmpl-pf{display:flex;align-items:center;overflow-x:auto;padding:6px 0}.tmpl-pf-s{min-width:105px;padding:10px 8px;border-radius:12px;text-align:center;background:var(--surface);border:1.5px solid var(--border);margin-right:28px;position:relative;flex-shrink:0}.tmpl-pf-s:last-child{margin-right:0}.tmpl-pf-s:not(:last-child)::after{content:'→';position:absolute;right:-22px;top:50%;transform:translateY(-50%);color:var(--text-dim);font-size:14px}.tmpl-pf-i{font-size:18px;margin-bottom:3px}.tmpl-pf-l{font-size:10px;font-weight:700;color:var(--accent)}.tmpl-pf-d{font-size:8px;color:var(--text-dim)}[data-theme="light"] .tmpl-pf-s{background:#fff}`,
    css_variables_used: ['--surface', '--border', '--accent', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['process', 'steps', 'workflow', 'how it works', 'pipeline', 'procedure', 'user flow'],
    meeting_affinity: ['technical', 'operations', 'onboarding'],
    conversation_pattern: 'Use for a linear sequence of steps or a process flow.',
    min_data_points: 3,
    max_data_points: 6,
  },
  {
    name: 'Decision Tree',
    slug: 'decision_tree',
    category: 'structural',
    version: 1,
    schema: { type: 'object', required: ['question', 'branches'], properties: { question: { type: 'string' }, branches: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'object', required: ['condition', 'result'], properties: { condition: { type: 'string' }, result: { type: 'string' }, is_warning: { type: 'boolean' } } } } } },
    html_template: `<div class="tmpl-dt"><div class="tmpl-dt-q">{{question}}</div><div class="tmpl-dt-branches">{{#each branches}}<div class="tmpl-dt-b {{#if is_warning}}warn{{/if}}"><div class="tmpl-dt-cond">{{condition}}</div><div class="tmpl-dt-res">{{result}}</div></div>{{/each}}</div></div>`,
    css_template: `.tmpl-dt{display:flex;flex-direction:column;align-items:center;padding:6px 0}.tmpl-dt-q{padding:10px 20px;background:var(--surface);border:1.5px solid var(--border);border-radius:10px;font-size:12px;font-weight:600;margin-bottom:16px;position:relative}.tmpl-dt-q::after{content:'';position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);width:2px;height:10px;background:var(--border)}.tmpl-dt-branches{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}.tmpl-dt-b{padding:10px 14px;border-radius:10px;text-align:center;min-width:130px;background:rgba(0,224,142,0.06);border:1.5px solid rgba(0,224,142,0.2)}.tmpl-dt-b.warn{background:rgba(255,138,59,0.06);border-color:rgba(255,138,59,0.2)}.tmpl-dt-cond{font-size:9px;font-weight:700;color:#00e08e;font-family:'JetBrains Mono',monospace;text-transform:uppercase;margin-bottom:3px}.tmpl-dt-b.warn .tmpl-dt-cond{color:#ff8a3b}.tmpl-dt-res{font-size:11px;font-weight:600}[data-theme="light"] .tmpl-dt-q{background:#fff}`,
    css_variables_used: ['--surface', '--border'],
    render_type: 'html',
    trigger_signals: ['decision', 'if then', 'condition', 'depends on', 'branching', 'scenario', 'classification'],
    meeting_affinity: ['technical', 'strategy', 'planning'],
    conversation_pattern: 'Use when a decision point with multiple outcomes is discussed.',
    min_data_points: 2,
    max_data_points: 4,
  },
  {
    name: 'Vertical Waterfall',
    slug: 'waterfall',
    category: 'structural',
    version: 1,
    schema: { type: 'object', required: ['steps'], properties: { steps: { type: 'array', minItems: 3, maxItems: 8, items: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, detail: { type: 'string' }, owner: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-wf">{{#each steps}}<div class="tmpl-wf-s"><div class="tmpl-wf-dot"></div><div class="tmpl-wf-body"><div class="tmpl-wf-t">{{title}}</div>{{#if detail}}<div class="tmpl-wf-d">{{detail}}</div>{{/if}}</div></div>{{/each}}</div>`,
    css_template: `.tmpl-wf{position:relative;padding-left:24px}.tmpl-wf::before{content:'';position:absolute;left:8px;top:8px;bottom:8px;width:2px;background:linear-gradient(to bottom,#3b8bff,#9466ff,#00e08e)}.tmpl-wf-s{display:flex;align-items:center;gap:12px;margin-bottom:10px}.tmpl-wf-dot{width:18px;height:18px;border-radius:50%;background:var(--accent);flex-shrink:0;z-index:1}.tmpl-wf-body{flex:1;padding:10px 14px;background:var(--surface);border-radius:10px;border-left:3px solid var(--accent)}.tmpl-wf-t{font-size:12px;font-weight:700}.tmpl-wf-d{font-size:10px;color:var(--text-dim)}[data-theme="light"] .tmpl-wf-body{background:#fff}`,
    css_variables_used: ['--accent', '--surface', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['phases', 'implementation', 'rollout', 'waterfall', 'depends on previous', 'sequential phases'],
    meeting_affinity: ['planning', 'project', 'technical'],
    conversation_pattern: 'Use for sequential phases where each depends on the previous.',
    min_data_points: 3,
    max_data_points: 8,
  },
  {
    name: 'Cause-Effect Chain',
    slug: 'cause_effect',
    category: 'structural',
    version: 1,
    schema: { type: 'object', required: ['chain'], properties: { chain: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'object', required: ['label', 'type'], properties: { label: { type: 'string' }, type: { type: 'string', enum: ['root', 'effect', 'impact'] } } } } } },
    html_template: `<div class="tmpl-ce">{{#each chain}}<div class="tmpl-ce-n tmpl-ce-{{type}}"><div class="tmpl-ce-tag">{{type}}</div><div class="tmpl-ce-lbl">{{label}}</div></div>{{/each}}</div>`,
    css_template: `.tmpl-ce{display:flex;flex-direction:column;align-items:stretch;gap:0;padding:6px 0}.tmpl-ce-n{padding:14px 18px;border-radius:12px;text-align:left;position:relative;display:flex;align-items:center;gap:12px}.tmpl-ce-n:not(:last-child){margin-bottom:28px}.tmpl-ce-n:not(:last-child)::after{content:'↓';position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);color:var(--text-dim);font-size:16px;opacity:0.6}.tmpl-ce-tag{font-size:9px;font-weight:700;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px;min-width:48px;flex-shrink:0}.tmpl-ce-lbl{font-size:13px;font-weight:600;line-height:1.4}.tmpl-ce-root{background:rgba(255,77,94,0.06);border:1px solid rgba(255,77,94,0.15)}.tmpl-ce-root .tmpl-ce-tag{color:#ff4d5e}.tmpl-ce-effect{background:rgba(255,138,59,0.06);border:1px solid rgba(255,138,59,0.15)}.tmpl-ce-effect .tmpl-ce-tag{color:#ff8a3b}.tmpl-ce-impact{background:rgba(244,63,94,0.06);border:1px solid rgba(244,63,94,0.15)}.tmpl-ce-impact .tmpl-ce-tag{color:#f43f5e}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['because', 'root cause', 'led to', 'resulted in', 'consequence', 'chain reaction', 'cascade'],
    meeting_affinity: ['technical', 'retrospective', 'incident'],
    conversation_pattern: 'Use when a chain of cause and effects is discussed.',
    min_data_points: 3,
    max_data_points: 6,
  },
  {
    name: 'Swim Lanes',
    slug: 'swim_lanes',
    category: 'structural',
    version: 1,
    schema: { type: 'object', required: ['lanes'], properties: { lanes: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'object', required: ['person', 'tasks'], properties: { person: { type: 'string' }, tasks: { type: 'array', items: { type: 'object', required: ['label'], properties: { label: { type: 'string' } } } } } } } } },
    html_template: `<div class="tmpl-sl">{{#each lanes}}<div class="tmpl-sl-lane"><span class="tmpl-sl-name">{{person}}</span><div class="tmpl-sl-tasks">{{#each tasks}}<div class="tmpl-sl-task">{{label}}</div>{{/each}}</div></div>{{/each}}</div>`,
    css_template: `.tmpl-sl{display:flex;flex-direction:column;gap:6px}.tmpl-sl-lane{display:grid;grid-template-columns:70px 1fr;gap:8px;align-items:center}.tmpl-sl-name{font-size:10px;font-weight:700;color:var(--accent);text-align:right}.tmpl-sl-tasks{display:flex;gap:4px}.tmpl-sl-task{padding:6px 10px;background:rgba(61,214,140,0.07);border:1px solid rgba(61,214,140,0.2);border-radius:6px;font-size:9px;font-weight:600;flex:1}[data-theme="light"] .tmpl-sl-task{background:rgba(99,102,241,0.05);border-color:rgba(99,102,241,0.15)}`,
    css_variables_used: ['--accent'],
    render_type: 'html',
    trigger_signals: ['parallel', 'simultaneously', 'workstreams', 'who does what', 'concurrently', 'at the same time'],
    meeting_affinity: ['planning', 'project', 'standup'],
    conversation_pattern: 'Use when parallel workstreams across different people are discussed.',
    min_data_points: 2,
    max_data_points: 5,
  },
  {
    name: 'System Diagram',
    slug: 'system_diagram',
    category: 'structural',
    version: 1,
    schema: { type: 'object', required: ['mermaid'], properties: { mermaid: { type: 'string', description: 'Mermaid graph syntax showing system components and data flow. Use graph LR or graph TD.' }, caption: { type: 'string' } } },
    html_template: '',
    css_template: '',
    css_variables_used: ['--surface', '--border', '--text-dim'],
    render_type: 'mermaid',
    trigger_signals: ['architecture', 'system', 'integration', 'data flow', 'API', 'components', 'infrastructure'],
    meeting_affinity: ['technical', 'architecture', 'engineering'],
    conversation_pattern: 'Use when system architecture or data flow between components is discussed.',
    min_data_points: 3,
    max_data_points: 12,
  },
  {
    name: 'Circular Process',
    slug: 'circular_flow',
    category: 'structural',
    version: 1,
    schema: { type: 'object', required: ['steps'], properties: { steps: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'object', required: ['label'], properties: { icon: { type: 'string' }, label: { type: 'string' } } } }, center_label: { type: 'string' }, center_detail: { type: 'string' } } },
    html_template: `<div class="tmpl-cf">{{#each steps}}<div class="tmpl-cf-s">{{#if icon}}<div style="font-size:16px;margin-bottom:2px">{{icon}}</div>{{/if}}<div class="tmpl-cf-l">{{label}}</div></div>{{/each}}</div>{{#if center_label}}<div class="tmpl-cf-ctr"><span class="tmpl-cf-cv">{{center_label}}</span>{{#if center_detail}}<span class="tmpl-cf-cd">{{center_detail}}</span>{{/if}}</div>{{/if}}`,
    css_template: `.tmpl-cf{display:flex;align-items:center;overflow-x:auto;padding:6px 0}.tmpl-cf-s{min-width:80px;padding:8px 12px;border-radius:10px;text-align:center;background:var(--surface);border:1.5px solid var(--border);margin-right:24px;position:relative;flex-shrink:0}.tmpl-cf-s:last-child{margin-right:0}.tmpl-cf-s:not(:last-child)::after{content:'→';position:absolute;right:-18px;top:50%;transform:translateY(-50%);color:var(--text-dim);font-size:12px}.tmpl-cf-s:last-child::after{content:'↩';position:absolute;right:-18px;top:50%;transform:translateY(-50%);color:var(--accent);font-size:12px;margin-right:-18px}.tmpl-cf-l{font-size:9px;font-weight:700;color:var(--accent)}.tmpl-cf-ctr{text-align:center;margin-top:10px;padding:8px 16px;background:var(--surface);border:1.5px dashed var(--accent);border-radius:10px;display:inline-flex;gap:6px;align-items:baseline}.tmpl-cf-cv{font-size:18px;font-weight:800;font-family:'JetBrains Mono',monospace}.tmpl-cf-cd{font-size:9px;color:var(--text-dim)}[data-theme="light"] .tmpl-cf-s{background:#fff}`,
    css_variables_used: ['--surface', '--border', '--accent', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['cycle', 'recurring', 'repeating', 'loop', 'circular', 'monthly', 'periodic'],
    meeting_affinity: ['operations', 'process', 'planning'],
    conversation_pattern: 'Use when a repeating or cyclical process is discussed.',
    min_data_points: 3,
    max_data_points: 6,
  },
  {
    name: 'Error / Success Path',
    slug: 'dual_path',
    category: 'structural',
    version: 1,
    schema: { type: 'object', required: ['starting_point', 'success_label', 'error_label'], properties: { starting_point: { type: 'string' }, success_label: { type: 'string' }, success_detail: { type: 'string' }, error_label: { type: 'string' }, error_detail: { type: 'string' } } },
    html_template: `<div class="tmpl-dp"><div class="tmpl-dp-start">{{starting_point}}</div><div class="tmpl-dp-paths"><div class="tmpl-dp-ok"><div class="tmpl-dp-tag" style="color:#00e08e">✓ SUCCESS</div><div class="tmpl-dp-lbl">{{success_label}}</div>{{#if success_detail}}<div class="tmpl-dp-det">{{success_detail}}</div>{{/if}}</div><div class="tmpl-dp-err"><div class="tmpl-dp-tag" style="color:#ff4d5e">✗ ERROR</div><div class="tmpl-dp-lbl">{{error_label}}</div>{{#if error_detail}}<div class="tmpl-dp-det">{{error_detail}}</div>{{/if}}</div></div></div>`,
    css_template: `.tmpl-dp{display:flex;flex-direction:column;align-items:center;padding:6px 0}.tmpl-dp-start{padding:10px 20px;background:var(--surface);border:1.5px solid var(--border);border-radius:10px;font-size:12px;font-weight:600;margin-bottom:16px}.tmpl-dp-paths{display:flex;gap:24px}.tmpl-dp-ok,.tmpl-dp-err{padding:10px 14px;border-radius:10px;text-align:center;min-width:140px}.tmpl-dp-ok{background:rgba(0,224,142,0.06);border:1.5px solid rgba(0,224,142,0.2)}.tmpl-dp-err{background:rgba(255,77,94,0.06);border:1.5px solid rgba(255,77,94,0.2)}.tmpl-dp-tag{font-size:8px;font-weight:700;font-family:'JetBrains Mono',monospace;margin-bottom:3px}.tmpl-dp-lbl{font-size:11px;font-weight:600}.tmpl-dp-det{font-size:9px;color:var(--text-dim);margin-top:2px}[data-theme="light"] .tmpl-dp-start{background:#fff}`,
    css_variables_used: ['--surface', '--border', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['success', 'failure', 'error path', 'happy path', 'edge case', 'fallback', 'what if fails'],
    meeting_affinity: ['technical', 'operations', 'incident'],
    conversation_pattern: 'Use when two diverging outcomes from a single event are discussed.',
    min_data_points: 2,
    max_data_points: 2,
  },

  // ── NUMBERS & DATA (T09–T18) ───────────────────────────
  {
    name: 'Metric Dashboard',
    slug: 'metric_dashboard',
    category: 'data',
    version: 1,
    schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'object', required: ['value', 'label'], properties: { value: { type: 'string' }, label: { type: 'string' }, color: { type: 'string', description: 'Hex color: #00e08e good, #ff4d5e bad, #ffc233 warning' } } } } } },
    html_template: `<div class="tmpl-md">{{#each items}}<div class="tmpl-md-card"><div class="tmpl-md-val" style="color:{{color}}">{{value}}</div><div class="tmpl-md-lbl">{{label}}</div></div>{{/each}}</div>`,
    css_template: `.tmpl-md{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}.tmpl-md-card{background:var(--surface);border-radius:10px;padding:12px;text-align:center}.tmpl-md-val{font-size:22px;font-weight:800;font-family:'JetBrains Mono',monospace}.tmpl-md-lbl{font-size:9px;color:var(--text-dim);margin-top:3px}[data-theme="light"] .tmpl-md-card{background:#fff}`,
    css_variables_used: ['--surface', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['KPIs', 'dashboard', 'performance', 'snapshot', 'scorecard', 'numbers overview'],
    meeting_affinity: ['review', 'quarterly', 'standup', 'strategy'],
    conversation_pattern: 'Use when multiple KPIs or performance metrics are presented together.',
    min_data_points: 3,
    max_data_points: 6,
  },
  {
    name: 'Hero Number',
    slug: 'hero_number',
    category: 'data',
    version: 1,
    schema: { type: 'object', required: ['value', 'label'], properties: { value: { type: 'string' }, label: { type: 'string' }, trend: { type: 'string', description: 'Trend context like ▲34% QoQ' }, color: { type: 'string' } } },
    html_template: `<div class="tmpl-hn"><div class="tmpl-hn-val" style="color:{{color}}">{{value}}</div><div class="tmpl-hn-lbl">{{label}}</div>{{#if trend}}<div class="tmpl-hn-trend" style="color:{{color}}">{{trend}}</div>{{/if}}</div>`,
    css_template: `.tmpl-hn{text-align:center;padding:12px 0}.tmpl-hn-val{font-size:48px;font-weight:800;font-family:'JetBrains Mono',monospace}.tmpl-hn-lbl{font-size:14px;color:var(--text-dim);margin-top:4px}.tmpl-hn-trend{font-size:11px;margin-top:6px}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['critical number', 'headline stat', 'single metric', 'key figure', 'the number is'],
    meeting_affinity: ['review', 'incident', 'quarterly'],
    conversation_pattern: 'Use when a single dramatic number dominates the discussion.',
    min_data_points: 1,
    max_data_points: 1,
  },
  {
    name: 'Side-by-Side Comparison',
    slug: 'side_by_side',
    category: 'data',
    version: 1,
    schema: { type: 'object', required: ['left_label', 'left_value', 'right_label', 'right_value'], properties: { left_label: { type: 'string' }, left_value: { type: 'string' }, left_detail: { type: 'string' }, right_label: { type: 'string' }, right_value: { type: 'string' }, right_detail: { type: 'string' }, diff: { type: 'string', description: 'Difference or discrepancy label' } } },
    html_template: `<div class="tmpl-sbs"><div class="tmpl-sbs-left"><div class="tmpl-sbs-tag" style="color:#00e08e">{{left_label}}</div><div class="tmpl-sbs-val" style="color:#00e08e">{{left_value}}</div>{{#if left_detail}}<div class="tmpl-sbs-det">{{left_detail}}</div>{{/if}}</div>{{#if diff}}<div class="tmpl-sbs-diff"><div class="tmpl-sbs-diffval">{{diff}}</div><div style="font-size:14px;color:var(--text-dim)">≠</div></div>{{/if}}<div class="tmpl-sbs-right"><div class="tmpl-sbs-tag" style="color:#ff4d5e">{{right_label}}</div><div class="tmpl-sbs-val" style="color:#ff4d5e">{{right_value}}</div>{{#if right_detail}}<div class="tmpl-sbs-det">{{right_detail}}</div>{{/if}}</div></div>`,
    css_template: `.tmpl-sbs{display:grid;grid-template-columns:1fr 48px 1fr;align-items:center}.tmpl-sbs-left,.tmpl-sbs-right{padding:16px;border-radius:12px;text-align:center}.tmpl-sbs-left{background:rgba(0,224,142,0.05);border:1.5px solid rgba(0,224,142,0.16)}.tmpl-sbs-right{background:rgba(255,77,94,0.05);border:1.5px solid rgba(255,77,94,0.16)}.tmpl-sbs-tag{font-size:9px;font-weight:700;margin-bottom:4px}.tmpl-sbs-val{font-size:30px;font-weight:800;font-family:'JetBrains Mono',monospace}.tmpl-sbs-det{font-size:9px;color:var(--text-dim);margin-top:3px}.tmpl-sbs-diff{text-align:center}.tmpl-sbs-diffval{font-size:18px;font-weight:800;color:#ffc233;font-family:'JetBrains Mono',monospace}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['versus', 'discrepancy', 'gap', 'mismatch', 'difference between', 'expected vs actual'],
    meeting_affinity: ['review', 'audit', 'incident'],
    conversation_pattern: 'Use when two values are directly compared to highlight a discrepancy.',
    min_data_points: 2,
    max_data_points: 2,
  },
  {
    name: 'Donut Split',
    slug: 'pie_split',
    category: 'data',
    version: 1,
    schema: { type: 'object', required: ['segments', 'total'], properties: { total: { type: 'string' }, segments: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'object', required: ['label', 'value', 'pct'], properties: { label: { type: 'string' }, value: { type: 'string' }, pct: { type: 'string' }, color: { type: 'string' }, icon: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-ds"><div class="tmpl-ds-total"><span class="tmpl-ds-tv">{{total}}</span><span class="tmpl-ds-tl">total</span></div><div class="tmpl-ds-segs">{{#each segments}}<div class="tmpl-ds-seg">{{#if icon}}<span style="font-size:16px">{{icon}}</span>{{/if}}<div><div class="tmpl-ds-sl" style="color:{{color}}">{{value}} → {{label}}</div><div class="tmpl-ds-sp">{{pct}}</div></div></div>{{/each}}</div></div>`,
    css_template: `.tmpl-ds{display:flex;align-items:center;gap:28px;justify-content:center;padding:6px 0}.tmpl-ds-total{text-align:center;padding:16px;border:2px solid var(--border);border-radius:50%;width:80px;height:80px;display:flex;flex-direction:column;align-items:center;justify-content:center}.tmpl-ds-tv{font-size:20px;font-weight:800;font-family:'JetBrains Mono',monospace}.tmpl-ds-tl{font-size:8px;color:var(--text-dim)}.tmpl-ds-segs{display:flex;flex-direction:column;gap:8px}.tmpl-ds-seg{display:flex;align-items:center;gap:6px}.tmpl-ds-sl{font-size:12px;font-weight:700}.tmpl-ds-sp{font-size:9px;color:var(--text-dim)}`,
    css_variables_used: ['--border', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['breakdown', 'split', 'distribution', 'allocation', 'portion', 'share', 'where it goes'],
    meeting_affinity: ['strategy', 'review', 'budget'],
    conversation_pattern: 'Use when a total is split into parts or proportions.',
    min_data_points: 2,
    max_data_points: 5,
  },
  {
    name: 'ROI Calculator',
    slug: 'roi_calculator',
    category: 'data',
    version: 1,
    schema: { type: 'object', required: ['invest_label', 'invest_value', 'return_label', 'return_value'], properties: { invest_label: { type: 'string' }, invest_value: { type: 'string' }, pipeline_label: { type: 'string' }, pipeline_value: { type: 'string' }, return_label: { type: 'string' }, return_value: { type: 'string' } } },
    html_template: `<div class="tmpl-roi"><div class="tmpl-roi-box invest"><div class="tmpl-roi-tag">{{invest_label}}</div><div class="tmpl-roi-val">{{invest_value}}</div></div><div class="tmpl-roi-arrow">→</div>{{#if pipeline_value}}<div class="tmpl-roi-box pipeline"><div class="tmpl-roi-tag">{{pipeline_label}}</div><div class="tmpl-roi-val">{{pipeline_value}}</div></div><div class="tmpl-roi-arrow">→</div>{{/if}}<div class="tmpl-roi-box return"><div class="tmpl-roi-tag">{{return_label}}</div><div class="tmpl-roi-val">{{return_value}}</div></div></div>`,
    css_template: `.tmpl-roi{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;padding:6px 0}.tmpl-roi-box{text-align:center;padding:14px 18px;border-radius:12px}.tmpl-roi-box.invest{background:rgba(255,77,94,0.05);border:1.5px solid rgba(255,77,94,0.18)}.tmpl-roi-box.invest .tmpl-roi-tag{color:#ff4d5e}.tmpl-roi-box.pipeline{background:rgba(255,194,51,0.05);border:1.5px dashed rgba(255,194,51,0.2)}.tmpl-roi-box.pipeline .tmpl-roi-tag{color:#ffc233}.tmpl-roi-box.return{background:rgba(0,224,142,0.05);border:1.5px solid rgba(0,224,142,0.18)}.tmpl-roi-box.return .tmpl-roi-tag{color:#00e08e}.tmpl-roi-tag{font-size:8px;font-family:'JetBrains Mono',monospace;letter-spacing:1px;margin-bottom:2px}.tmpl-roi-val{font-size:24px;font-weight:800;font-family:'JetBrains Mono',monospace}.tmpl-roi-arrow{font-size:16px;color:var(--text-dim)}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['ROI', 'investment', 'return', 'payback', 'cost vs benefit', 'revenue impact', 'spend'],
    meeting_affinity: ['strategy', 'budget', 'quarterly'],
    conversation_pattern: 'Use when investment, pipeline, or return on investment figures are discussed.',
    min_data_points: 2,
    max_data_points: 3,
  },
  {
    name: 'Scale Bars',
    slug: 'scale_chart',
    category: 'data',
    version: 1,
    schema: { type: 'object', required: ['bars'], properties: { bars: { type: 'array', minItems: 2, maxItems: 6, items: { type: 'object', required: ['label', 'value', 'pct'], properties: { label: { type: 'string' }, value: { type: 'string' }, pct: { type: 'number', description: 'Width percentage 1-100' }, color: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-sb">{{#each bars}}<div class="tmpl-sb-row"><div class="tmpl-sb-lbl" style="color:{{color}}">{{label}}</div><div class="tmpl-sb-track"><div class="tmpl-sb-fill" style="width:{{pct}}%;border-right:2px solid {{color}};background:linear-gradient(90deg,rgba(61,214,140,0.15),transparent)"><span class="tmpl-sb-val">{{value}}</span></div></div></div>{{/each}}</div>`,
    css_template: `.tmpl-sb{display:flex;flex-direction:column;gap:6px}.tmpl-sb-row{display:flex;align-items:center;gap:8px}.tmpl-sb-lbl{width:50px;text-align:right;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;flex-shrink:0}.tmpl-sb-track{flex:1;height:24px;background:var(--surface);border-radius:5px;overflow:hidden}.tmpl-sb-fill{height:100%;display:flex;align-items:center;padding-left:8px}.tmpl-sb-val{font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace}[data-theme="light"] .tmpl-sb-track{background:#f1f5f9}`,
    css_variables_used: ['--surface'],
    render_type: 'html',
    trigger_signals: ['scale', 'volume', 'at different levels', 'growth projection', 'bar chart', 'range of values'],
    meeting_affinity: ['strategy', 'planning', 'review'],
    conversation_pattern: 'Use when comparing values at different scales or projected growth.',
    min_data_points: 2,
    max_data_points: 6,
  },
  {
    name: 'Conversion Funnel',
    slug: 'funnel',
    category: 'data',
    version: 1,
    schema: { type: 'object', required: ['stages'], properties: { stages: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'object', required: ['label', 'count'], properties: { label: { type: 'string' }, count: { type: 'string' }, icon: { type: 'string' }, is_bottleneck: { type: 'boolean' } } } } } },
    html_template: `<div class="tmpl-fn">{{#each stages}}<div class="tmpl-fn-stage {{#if is_bottleneck}}bottleneck{{/if}}">{{#if icon}}<span>{{icon}}</span>{{/if}}<strong>{{label}}</strong><span class="tmpl-fn-ct">{{count}}</span></div>{{/each}}</div>`,
    css_template: `.tmpl-fn{display:flex;flex-direction:column;align-items:center;gap:2px}.tmpl-fn-stage{width:100%;padding:10px 14px;background:rgba(0,224,142,0.04);border:1px solid rgba(0,224,142,0.14);border-radius:8px;display:flex;justify-content:space-between;font-size:12px;align-items:center}.tmpl-fn-stage:nth-child(2){width:75%}.tmpl-fn-stage:nth-child(3){width:50%}.tmpl-fn-stage:nth-child(4){width:35%}.tmpl-fn-stage:nth-child(5){width:25%}.tmpl-fn-stage.bottleneck{background:rgba(255,77,94,0.06);border:1.5px solid rgba(255,77,94,0.25)}.tmpl-fn-stage.bottleneck .tmpl-fn-ct{color:#ff4d5e}.tmpl-fn-ct{font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--accent)}`,
    css_variables_used: ['--accent'],
    render_type: 'html',
    trigger_signals: ['funnel', 'conversion', 'pipeline', 'drop-off', 'MQL', 'SQL', 'leads', 'stages'],
    meeting_affinity: ['strategy', 'review', 'sales'],
    conversation_pattern: 'Use when a conversion funnel or pipeline with drop-off stages is discussed.',
    min_data_points: 3,
    max_data_points: 6,
  },
  {
    name: 'Before / After',
    slug: 'before_after',
    category: 'data',
    version: 1,
    schema: { type: 'object', required: ['before_label', 'before_value', 'after_label', 'after_value'], properties: { before_label: { type: 'string' }, before_value: { type: 'string' }, after_label: { type: 'string' }, after_value: { type: 'string' }, change: { type: 'string', description: 'Change indicator like +35%' }, direction: { type: 'string', enum: ['up', 'down'], description: 'Whether up is good or bad' } } },
    html_template: `<div class="tmpl-ba"><div class="tmpl-ba-before"><div class="tmpl-ba-lbl">{{before_label}}</div><div class="tmpl-ba-val">{{before_value}}</div></div><div class="tmpl-ba-mid">{{#if change}}<div class="tmpl-ba-change">{{change}}</div>{{/if}}<div style="font-size:14px;color:var(--text-dim)">→</div></div><div class="tmpl-ba-after"><div class="tmpl-ba-lbl">{{after_label}}</div><div class="tmpl-ba-val">{{after_value}}</div></div></div>`,
    css_template: `.tmpl-ba{display:grid;grid-template-columns:1fr 50px 1fr;align-items:center}.tmpl-ba-before,.tmpl-ba-after{padding:14px;border-radius:12px;text-align:center}.tmpl-ba-before{background:var(--surface)}.tmpl-ba-after{background:rgba(255,77,94,0.05);border:1.5px solid rgba(255,77,94,0.16)}.tmpl-ba-lbl{font-size:9px;color:var(--text-dim);font-weight:600;margin-bottom:4px}.tmpl-ba-val{font-size:30px;font-weight:800;font-family:'JetBrains Mono',monospace}.tmpl-ba-mid{text-align:center}.tmpl-ba-change{font-size:8px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#ff4d5e}[data-theme="light"] .tmpl-ba-before{background:#fff}`,
    css_variables_used: ['--surface', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['before', 'after', 'was now', 'changed from', 'increased', 'decreased', 'compared to last'],
    meeting_affinity: ['review', 'quarterly', 'retrospective'],
    conversation_pattern: 'Use when a metric is compared between two time periods.',
    min_data_points: 2,
    max_data_points: 2,
  },
  {
    name: 'Trend Card',
    slug: 'trend_card',
    category: 'data',
    version: 1,
    schema: { type: 'object', required: ['value', 'label'], properties: { value: { type: 'string' }, label: { type: 'string' }, trend: { type: 'string', description: 'Trend text like ▲ Projected from current trajectory' }, detail: { type: 'string' }, color: { type: 'string' } } },
    html_template: `<div class="tmpl-tc"><div class="tmpl-tc-val" style="color:{{color}}">{{value}}</div><div class="tmpl-tc-info"><div class="tmpl-tc-lbl">{{label}}</div>{{#if trend}}<div class="tmpl-tc-trend" style="color:{{color}}">{{trend}}</div>{{/if}}{{#if detail}}<div class="tmpl-tc-det">{{detail}}</div>{{/if}}</div></div>`,
    css_template: `.tmpl-tc{display:flex;align-items:center;gap:16px;padding:4px 0}.tmpl-tc-val{font-size:36px;font-weight:800;font-family:'JetBrains Mono',monospace}.tmpl-tc-lbl{font-size:12px;font-weight:600}.tmpl-tc-trend{font-size:11px;margin-top:2px}.tmpl-tc-det{font-size:10px;color:var(--text-dim);margin-top:2px}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['trending', 'projection', 'forecast', 'trajectory', 'heading toward', 'on track for'],
    meeting_affinity: ['review', 'strategy', 'planning'],
    conversation_pattern: 'Use when a single key metric with trend direction is discussed.',
    min_data_points: 1,
    max_data_points: 1,
  },
  {
    name: 'Feature Table',
    slug: 'feature_table',
    category: 'data',
    version: 1,
    schema: { type: 'object', required: ['headers', 'rows'], properties: { headers: { type: 'array', items: { type: 'string' } }, rows: { type: 'array', items: { type: 'object', required: ['feature', 'values'], properties: { feature: { type: 'string' }, values: { type: 'array', items: { type: 'string', description: 'Use ✓, ✗, or short text' } } } } } } },
    html_template: `<div class="tmpl-ft-wrap"><table class="tmpl-ft"><thead><tr><th>Feature</th>{{#each headers}}<th>{{this}}</th>{{/each}}</tr></thead><tbody>{{#each rows}}<tr><td class="tmpl-ft-feat">{{feature}}</td>{{#each values}}<td class="tmpl-ft-v">{{this}}</td>{{/each}}</tr>{{/each}}</tbody></table></div>`,
    css_template: `.tmpl-ft-wrap{overflow-x:auto}.tmpl-ft{width:100%;border-collapse:collapse;font-size:11px}.tmpl-ft th{text-align:left;padding:8px;border-bottom:1px solid var(--border);color:var(--text-dim);font-size:10px}.tmpl-ft td{padding:6px 8px;border-bottom:1px solid rgba(34,41,64,0.3)}.tmpl-ft-feat{font-weight:600}.tmpl-ft-v{text-align:center}[data-theme="light"] .tmpl-ft{border-color:#e2e8f0}`,
    css_variables_used: ['--border', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['feature comparison', 'capabilities', 'competitor', 'vendor comparison', 'product comparison'],
    meeting_affinity: ['strategy', 'product', 'decision'],
    conversation_pattern: 'Use when comparing features or capabilities across products or options.',
    min_data_points: 2,
    max_data_points: 10,
  },

  // ── PROBLEMS & DECISIONS (T19–T26) ─────────────────────
  {
    name: 'Problem → Solution Pair',
    slug: 'problem_solution',
    category: 'analytical',
    version: 1,
    schema: { type: 'object', required: ['pairs'], properties: { pairs: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'object', required: ['problem', 'solution'], properties: { problem: { type: 'string' }, solution: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-ps2">{{#each pairs}}<div class="tmpl-ps2-pair"><div class="tmpl-ps2-p"><div class="tmpl-ps2-tag" style="color:#ff4d5e">⚠ PROBLEM</div><div class="tmpl-ps2-txt">{{problem}}</div></div><div class="tmpl-ps2-arrow">→</div><div class="tmpl-ps2-s"><div class="tmpl-ps2-tag" style="color:#00e08e">✓ FIX</div><div class="tmpl-ps2-txt">{{solution}}</div></div></div>{{/each}}</div>`,
    css_template: `.tmpl-ps2{display:flex;flex-direction:column;gap:10px}.tmpl-ps2-pair{display:grid;grid-template-columns:1fr 28px 1fr;align-items:stretch}.tmpl-ps2-p{padding:10px;background:rgba(255,77,94,0.04);border:1px solid rgba(255,77,94,0.12);border-radius:9px 0 0 9px}.tmpl-ps2-s{padding:10px;background:rgba(0,224,142,0.04);border:1px solid rgba(0,224,142,0.12);border-radius:0 9px 9px 0}.tmpl-ps2-arrow{display:flex;align-items:center;justify-content:center;background:var(--surface);color:#00e08e;font-size:12px}.tmpl-ps2-tag{font-size:7px;font-weight:800;font-family:'JetBrains Mono',monospace;letter-spacing:1px;margin-bottom:2px}.tmpl-ps2-txt{font-size:11px;line-height:1.4}[data-theme="light"] .tmpl-ps2-arrow{background:#fff}`,
    css_variables_used: ['--surface'],
    render_type: 'html',
    trigger_signals: ['problem and solution', 'issue and fix', 'root cause and resolution', 'what went wrong and how to fix'],
    meeting_affinity: ['technical', 'incident', 'retrospective'],
    conversation_pattern: 'Use when specific problems are paired with their proposed solutions.',
    min_data_points: 1,
    max_data_points: 4,
  },
  {
    name: 'Decision Log',
    slug: 'decision_log',
    category: 'analytical',
    version: 1,
    schema: { type: 'object', required: ['now', 'next'], properties: { now: { type: 'array', items: { type: 'string' }, description: 'Decided now / do immediately' }, next: { type: 'array', items: { type: 'string' }, description: 'Decided for later / build next' } } },
    html_template: `<div class="tmpl-dl"><div class="tmpl-dl-col"><div class="tmpl-dl-hdr" style="color:#00e08e">🔥 NOW</div>{{#each now}}<div class="tmpl-dl-item now"><span style="color:#00e08e;font-weight:800">✓</span> {{this}}</div>{{/each}}</div><div class="tmpl-dl-col"><div class="tmpl-dl-hdr" style="color:#3b8bff">📋 NEXT</div>{{#each next}}<div class="tmpl-dl-item next"><span style="color:#3b8bff">◷</span> {{this}}</div>{{/each}}</div></div>`,
    css_template: `.tmpl-dl{display:grid;grid-template-columns:1fr 1fr;gap:12px}.tmpl-dl-hdr{font-size:9px;font-weight:800;font-family:'JetBrains Mono',monospace;letter-spacing:1px;margin-bottom:8px}.tmpl-dl-item{padding:9px 11px;border-radius:8px;font-size:11px;margin-bottom:5px;display:flex;gap:6px}.tmpl-dl-item.now{background:rgba(0,224,142,0.04);border:1px solid rgba(0,224,142,0.12)}.tmpl-dl-item.next{background:rgba(59,139,255,0.04);border:1px solid rgba(59,139,255,0.12)}@media(max-width:600px){.tmpl-dl{grid-template-columns:1fr}}`,
    css_variables_used: [],
    render_type: 'html',
    trigger_signals: ['decided', 'agreed', 'do now', 'defer', 'next sprint', 'prioritize', 'do first'],
    meeting_affinity: ['planning', 'standup', 'strategy'],
    conversation_pattern: 'Use when decisions are split into immediate actions vs future plans.',
    min_data_points: 2,
    max_data_points: 8,
  },
  {
    name: 'Action Items',
    slug: 'action_items',
    category: 'analytical',
    version: 1,
    schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'object', required: ['task'], properties: { task: { type: 'string' }, owner: { type: 'string' }, priority: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] }, icon: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-ai">{{#each items}}<div class="tmpl-ai-item"><span class="tmpl-ai-icon">{{#if icon}}{{icon}}{{/if}}</span><div class="tmpl-ai-body"><div class="tmpl-ai-task">{{task}}</div><div class="tmpl-ai-meta">{{#if owner}}<span class="tmpl-ai-owner">{{owner}}</span>{{/if}}{{#if priority}}<span class="tmpl-ai-pri tmpl-ai-{{priority}}">{{priority}}</span>{{/if}}</div></div></div>{{/each}}</div>`,
    css_template: `.tmpl-ai{display:flex;flex-direction:column;gap:6px}.tmpl-ai-item{display:flex;gap:8px;padding:12px 14px;background:var(--surface);border-radius:8px;border-left:3px solid var(--accent)}.tmpl-ai-icon{font-size:16px;flex-shrink:0}.tmpl-ai-task{font-size:15px;font-weight:600}.tmpl-ai-meta{display:flex;gap:4px;margin-top:4px}.tmpl-ai-owner{font-size:10px;padding:2px 8px;border-radius:3px;background:rgba(88,99,128,0.15);color:var(--text-dim);font-family:'JetBrains Mono',monospace}.tmpl-ai-pri{font-size:10px;padding:2px 8px;border-radius:3px;font-family:'JetBrains Mono',monospace;font-weight:700}.tmpl-ai-CRITICAL{background:rgba(255,77,94,0.1);color:#ff4d5e}.tmpl-ai-HIGH{background:rgba(255,138,59,0.1);color:#ff8a3b}.tmpl-ai-MEDIUM{background:rgba(255,194,51,0.1);color:#ffc233}.tmpl-ai-LOW{background:rgba(88,99,128,0.1);color:var(--text-dim)}[data-theme="light"] .tmpl-ai-item{background:#fff}`,
    css_variables_used: ['--surface', '--accent', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['action item', 'to-do', 'assigned to', 'follow up', 'task', 'deliverable', 'owner'],
    meeting_affinity: ['standup', 'planning', 'retrospective', 'all'],
    conversation_pattern: 'Use when tasks are assigned to specific people with priorities.',
    min_data_points: 1,
    max_data_points: 8,
  },
  {
    name: 'Risk Matrix',
    slug: 'risk_matrix',
    category: 'analytical',
    version: 1,
    schema: { type: 'object', required: ['risks'], properties: { risks: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'object', required: ['title', 'severity'], properties: { title: { type: 'string' }, severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] }, note: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-rm">{{#each risks}}<div class="tmpl-rm-risk tmpl-rm-{{severity}}"><div class="tmpl-rm-top"><strong>{{title}}</strong><span class="tmpl-rm-badge">{{severity}}</span></div>{{#if note}}<div class="tmpl-rm-note">{{note}}</div>{{/if}}</div>{{/each}}</div>`,
    css_template: `.tmpl-rm{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tmpl-rm-risk{padding:10px;border-radius:8px}.tmpl-rm-risk.tmpl-rm-HIGH{background:rgba(255,77,94,0.04);border:1px solid rgba(255,77,94,0.12)}.tmpl-rm-risk.tmpl-rm-MEDIUM{background:rgba(255,138,59,0.04);border:1px solid rgba(255,138,59,0.12)}.tmpl-rm-risk.tmpl-rm-LOW{background:rgba(88,99,128,0.04);border:1px solid rgba(88,99,128,0.12)}.tmpl-rm-top{display:flex;justify-content:space-between;margin-bottom:3px;font-size:11px}.tmpl-rm-badge{font-size:6px;padding:1px 5px;border-radius:2px;font-family:'JetBrains Mono',monospace;font-weight:700}.tmpl-rm-HIGH .tmpl-rm-badge{background:rgba(255,77,94,0.1);color:#ff4d5e}.tmpl-rm-MEDIUM .tmpl-rm-badge{background:rgba(255,138,59,0.1);color:#ff8a3b}.tmpl-rm-LOW .tmpl-rm-badge{background:rgba(88,99,128,0.1);color:var(--text-dim)}.tmpl-rm-note{font-size:10px;color:var(--text-dim)}@media(max-width:600px){.tmpl-rm{grid-template-columns:1fr}}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['risk', 'exposure', 'vulnerability', 'threat', 'what could go wrong', 'residual risk'],
    meeting_affinity: ['planning', 'incident', 'strategy'],
    conversation_pattern: 'Use when risks with severity levels are identified.',
    min_data_points: 1,
    max_data_points: 6,
  },
  {
    name: 'Priority Matrix',
    slug: 'priority_matrix',
    category: 'analytical',
    version: 1,
    schema: { type: 'object', required: ['do_first', 'plan', 'quick_win', 'later'], properties: { do_first: { type: 'array', items: { type: 'string' } }, plan: { type: 'array', items: { type: 'string' } }, quick_win: { type: 'array', items: { type: 'string' } }, later: { type: 'array', items: { type: 'string' } } } },
    html_template: `<div class="tmpl-pm"><div class="tmpl-pm-q do-first"><div class="tmpl-pm-hdr">🎯 DO FIRST</div>{{#each do_first}}<div class="tmpl-pm-item">{{this}}</div>{{/each}}</div><div class="tmpl-pm-q plan"><div class="tmpl-pm-hdr">📋 PLAN</div>{{#each plan}}<div class="tmpl-pm-item">{{this}}</div>{{/each}}</div><div class="tmpl-pm-q quick-win"><div class="tmpl-pm-hdr">⚡ QUICK WIN</div>{{#each quick_win}}<div class="tmpl-pm-item">{{this}}</div>{{/each}}</div><div class="tmpl-pm-q later"><div class="tmpl-pm-hdr">🗓️ LATER</div>{{#each later}}<div class="tmpl-pm-item">{{this}}</div>{{/each}}</div></div>`,
    css_template: `.tmpl-pm{display:grid;grid-template-columns:1fr 1fr;gap:2px;background:var(--border);border-radius:12px;overflow:hidden}.tmpl-pm-q{padding:12px;text-align:center}.tmpl-pm-q.do-first{background:rgba(0,224,142,0.06)}.tmpl-pm-q.plan{background:rgba(59,139,255,0.06)}.tmpl-pm-q.quick-win{background:rgba(255,194,51,0.06)}.tmpl-pm-q.later{background:var(--surface)}.tmpl-pm-hdr{font-size:8px;font-weight:700;font-family:'JetBrains Mono',monospace;margin-bottom:6px}.tmpl-pm-q.do-first .tmpl-pm-hdr{color:#00e08e}.tmpl-pm-q.plan .tmpl-pm-hdr{color:#3b8bff}.tmpl-pm-q.quick-win .tmpl-pm-hdr{color:#ffc233}.tmpl-pm-q.later .tmpl-pm-hdr{color:var(--text-dim)}.tmpl-pm-item{font-size:10px;line-height:1.5}`,
    css_variables_used: ['--border', '--surface', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['priority', 'effort vs impact', 'urgent', 'important', 'eisenhower', 'triage', 'what first'],
    meeting_affinity: ['planning', 'strategy', 'standup'],
    conversation_pattern: 'Use when items are being prioritized by effort and impact.',
    min_data_points: 4,
    max_data_points: 16,
  },
  {
    name: 'Approval Status',
    slug: 'approval_status',
    category: 'analytical',
    version: 1,
    schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'object', required: ['item', 'status'], properties: { item: { type: 'string' }, approver: { type: 'string' }, status: { type: 'string', enum: ['APPROVED', 'DEFERRED', 'REJECTED', 'PENDING'] } } } } } },
    html_template: `<div class="tmpl-as">{{#each items}}<div class="tmpl-as-row"><span class="tmpl-as-item">{{item}}</span><div class="tmpl-as-right">{{#if approver}}<span class="tmpl-as-who">{{approver}}</span>{{/if}}<span class="tmpl-as-badge tmpl-as-{{status}}">{{status}}</span></div></div>{{/each}}</div>`,
    css_template: `.tmpl-as{display:flex;flex-direction:column;gap:6px}.tmpl-as-row{display:flex;justify-content:space-between;padding:10px 12px;background:var(--surface);border-radius:8px;align-items:center;font-size:12px}.tmpl-as-right{display:flex;align-items:center;gap:6px}.tmpl-as-who{font-size:12px}.tmpl-as-badge{font-size:7px;padding:2px 7px;border-radius:3px;font-family:'JetBrains Mono',monospace;font-weight:700}.tmpl-as-APPROVED{background:rgba(0,224,142,0.12);color:#00e08e}.tmpl-as-DEFERRED{background:rgba(255,194,51,0.12);color:#ffc233}.tmpl-as-REJECTED{background:rgba(255,77,94,0.12);color:#ff4d5e}.tmpl-as-PENDING{background:rgba(88,99,128,0.12);color:var(--text-dim)}[data-theme="light"] .tmpl-as-row{background:#fff}`,
    css_variables_used: ['--surface', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['approved', 'rejected', 'deferred', 'pending approval', 'sign-off', 'budget approved'],
    meeting_affinity: ['strategy', 'budget', 'planning'],
    conversation_pattern: 'Use when decisions or requests have approval statuses.',
    min_data_points: 1,
    max_data_points: 6,
  },
  {
    name: 'Objection Tracker',
    slug: 'objection_tracker',
    category: 'analytical',
    version: 1,
    schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'object', required: ['objection', 'status'], properties: { objection: { type: 'string' }, response: { type: 'string' }, status: { type: 'string', enum: ['handled', 'pending'] } } } } } },
    html_template: `<div class="tmpl-ot">{{#each items}}<div class="tmpl-ot-item tmpl-ot-{{status}}"><span class="tmpl-ot-icon">{{#if status}}{{status}}{{/if}}</span><div><strong>"{{objection}}"</strong>{{#if response}}<div class="tmpl-ot-resp">{{response}}</div>{{/if}}</div></div>{{/each}}</div>`,
    css_template: `.tmpl-ot{display:flex;flex-direction:column;gap:6px}.tmpl-ot-item{padding:9px 12px;border-radius:8px;display:flex;gap:7px;font-size:11px}.tmpl-ot-handled{background:rgba(0,224,142,0.03);border:1px solid rgba(0,224,142,0.12)}.tmpl-ot-pending{background:rgba(255,194,51,0.03);border:1px solid rgba(255,194,51,0.15)}.tmpl-ot-icon{font-weight:800;flex-shrink:0}.tmpl-ot-handled .tmpl-ot-icon{color:#00e08e}.tmpl-ot-pending .tmpl-ot-icon{color:#ffc233}.tmpl-ot-resp{font-size:10px;color:var(--text-dim);font-style:italic;margin-top:1px}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['objection', 'pushback', 'concern raised', 'they said', 'blocker from client', 'deal risk'],
    meeting_affinity: ['sales', 'strategy', 'review'],
    conversation_pattern: 'Use when sales objections or stakeholder concerns and their responses are tracked.',
    min_data_points: 1,
    max_data_points: 6,
  },
  {
    name: 'New Issue Flag',
    slug: 'new_issue',
    category: 'analytical',
    version: 1,
    schema: { type: 'object', required: ['title', 'description'], properties: { title: { type: 'string' }, description: { type: 'string' }, severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM'] } } },
    html_template: `<div class="tmpl-ni"><div class="tmpl-ni-badge">🆕 NEW ISSUE</div><div class="tmpl-ni-title">{{title}}</div><div class="tmpl-ni-desc">{{description}}</div></div>`,
    css_template: `.tmpl-ni{padding:12px 14px;background:rgba(255,194,51,0.04);border:1.5px solid rgba(255,194,51,0.16);border-radius:10px}.tmpl-ni-badge{font-size:7px;padding:2px 7px;border-radius:3px;background:rgba(255,194,51,0.15);color:#ffc233;font-family:'JetBrains Mono',monospace;font-weight:700;display:inline-block;margin-bottom:6px}.tmpl-ni-title{font-size:14px;font-weight:700;margin-bottom:3px}.tmpl-ni-desc{font-size:12px;color:var(--text-dim);line-height:1.5}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['new issue', 'just discovered', 'found out', 'emerging problem', 'flag this', 'heads up'],
    meeting_affinity: ['standup', 'incident', 'all'],
    conversation_pattern: 'Use when a brand-new issue is raised during the meeting for the first time.',
    min_data_points: 1,
    max_data_points: 1,
  },

  // ── PEOPLE & COMMUNICATION (T27–T32) ───────────────────
  {
    name: 'Stakeholder Map',
    slug: 'stakeholder_map',
    category: 'people',
    version: 1,
    schema: { type: 'object', required: ['people'], properties: { people: { type: 'array', minItems: 2, maxItems: 6, items: { type: 'object', required: ['name', 'role'], properties: { name: { type: 'string' }, role: { type: 'string' }, type: { type: 'string', enum: ['champion', 'evaluator', 'blocker', 'neutral'], description: 'Stakeholder disposition' }, concern: { type: 'string' }, icon: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-sm">{{#each people}}<div class="tmpl-sm-person tmpl-sm-{{type}}"><div class="tmpl-sm-avi">{{#if icon}}{{icon}}{{/if}}</div><div><div class="tmpl-sm-name">{{name}} {{#if type}}<span class="tmpl-sm-badge">{{type}}</span>{{/if}}</div><div class="tmpl-sm-role">{{role}}{{#if concern}} · {{concern}}{{/if}}</div></div></div>{{/each}}</div>`,
    css_template: `.tmpl-sm{display:flex;flex-direction:column;gap:6px}.tmpl-sm-person{display:flex;gap:10px;padding:10px;background:var(--surface);border-radius:8px;border-left:3px solid var(--border)}.tmpl-sm-champion{border-left-color:#00e08e}.tmpl-sm-evaluator{border-left-color:#ffc233}.tmpl-sm-blocker{border-left-color:#ff4d5e}.tmpl-sm-avi{width:30px;height:30px;border-radius:7px;background:rgba(88,99,128,0.1);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}.tmpl-sm-name{font-size:12px;font-weight:700}.tmpl-sm-badge{font-size:7px;padding:1px 5px;border-radius:2px;font-family:'JetBrains Mono',monospace;text-transform:uppercase}.tmpl-sm-champion .tmpl-sm-badge{background:rgba(0,224,142,0.12);color:#00e08e}.tmpl-sm-evaluator .tmpl-sm-badge{background:rgba(255,194,51,0.12);color:#ffc233}.tmpl-sm-blocker .tmpl-sm-badge{background:rgba(255,77,94,0.12);color:#ff4d5e}.tmpl-sm-role{font-size:10px;color:var(--text-dim)}[data-theme="light"] .tmpl-sm-person{background:#fff}`,
    css_variables_used: ['--surface', '--border', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['stakeholder', 'decision maker', 'champion', 'blocker', 'evaluator', 'who is involved', 'key people'],
    meeting_affinity: ['sales', 'strategy', 'planning'],
    conversation_pattern: 'Use when key stakeholders and their roles or dispositions are discussed.',
    min_data_points: 2,
    max_data_points: 6,
  },
  {
    name: 'Key Quote',
    slug: 'quote_highlight',
    category: 'people',
    version: 1,
    schema: { type: 'object', required: ['quote', 'speaker'], properties: { quote: { type: 'string' }, speaker: { type: 'string' }, title: { type: 'string' }, signal: { type: 'string', description: 'Why this quote matters' } } },
    html_template: `<div class="tmpl-kq"><div class="tmpl-kq-quote">"{{quote}}"</div><div class="tmpl-kq-attr"><span class="tmpl-kq-speaker">{{speaker}}</span>{{#if title}}<span class="tmpl-kq-title">{{title}}</span>{{/if}}</div>{{#if signal}}<div class="tmpl-kq-signal">💡 <strong>Signal:</strong> {{signal}}</div>{{/if}}</div>`,
    css_template: `.tmpl-kq{padding:12px 16px;background:var(--surface);border-radius:10px;border-left:4px solid #00e08e}.tmpl-kq-quote{font-size:14px;font-style:italic;line-height:1.6;padding-right:16px}.tmpl-kq-attr{display:flex;gap:6px;margin-top:8px;align-items:center}.tmpl-kq-speaker{font-size:9px;font-weight:600;color:#00e08e}.tmpl-kq-title{font-size:8px;color:var(--text-dim)}.tmpl-kq-signal{font-size:11px;color:#00e08e;margin-top:8px;padding:6px 10px;background:rgba(0,224,142,0.03);border:1px solid rgba(0,224,142,0.1);border-radius:6px}[data-theme="light"] .tmpl-kq{background:#fff}`,
    css_variables_used: ['--surface', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['quote', 'said', 'verbatim', 'exact words', 'key statement', 'notable remark'],
    meeting_affinity: ['sales', 'interview', 'all'],
    conversation_pattern: 'Use when a specific quote from someone carries significant meaning.',
    min_data_points: 1,
    max_data_points: 1,
  },
  {
    name: 'Speaker Breakdown',
    slug: 'speaker_breakdown',
    category: 'people',
    version: 1,
    schema: { type: 'object', required: ['speakers'], properties: { speakers: { type: 'array', minItems: 2, maxItems: 6, items: { type: 'object', required: ['name', 'pct'], properties: { name: { type: 'string' }, pct: { type: 'number', description: 'Talk time percentage' }, color: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-spk">{{#each speakers}}<div class="tmpl-spk-row"><div class="tmpl-spk-name">{{name}}</div><div class="tmpl-spk-bar"><div class="tmpl-spk-fill" style="width:{{pct}}%;background:{{color}}"></div></div><span class="tmpl-spk-pct" style="color:{{color}}">{{pct}}%</span></div>{{/each}}</div>`,
    css_template: `.tmpl-spk{display:flex;flex-direction:column;gap:6px}.tmpl-spk-row{display:flex;align-items:center;gap:8px}.tmpl-spk-name{width:60px;font-size:11px;font-weight:600;text-align:right;flex-shrink:0}.tmpl-spk-bar{flex:1;height:6px;background:var(--surface);border-radius:3px;overflow:hidden}.tmpl-spk-fill{height:100%;border-radius:3px}.tmpl-spk-pct{width:40px;font-size:13px;font-weight:800;font-family:'JetBrains Mono',monospace;text-align:right}[data-theme="light"] .tmpl-spk-bar{background:#f1f5f9}`,
    css_variables_used: ['--surface'],
    render_type: 'html',
    trigger_signals: ['talk time', 'who spoke', 'dominated', 'participation', 'speaker balance', 'conversation share'],
    meeting_affinity: ['retrospective', 'review', 'all'],
    conversation_pattern: 'Use when speaker participation or talk time distribution is relevant.',
    min_data_points: 2,
    max_data_points: 6,
  },
  {
    name: 'RACI Matrix',
    slug: 'raci_matrix',
    category: 'people',
    version: 1,
    schema: { type: 'object', required: ['people', 'tasks'], properties: { people: { type: 'array', items: { type: 'string' } }, tasks: { type: 'array', items: { type: 'object', required: ['task', 'assignments'], properties: { task: { type: 'string' }, assignments: { type: 'array', items: { type: 'string', description: 'R, A, C, I, or — for each person' } } } } } } },
    html_template: `<div class="tmpl-raci-wrap"><table class="tmpl-raci"><thead><tr><th>Task</th>{{#each people}}<th>{{this}}</th>{{/each}}</tr></thead><tbody>{{#each tasks}}<tr><td class="tmpl-raci-task">{{task}}</td>{{#each assignments}}<td class="tmpl-raci-cell">{{this}}</td>{{/each}}</tr>{{/each}}</tbody></table><div class="tmpl-raci-legend"><span><strong style="color:#00e08e">R</strong> Responsible</span><span><strong style="color:#ffc233">A</strong> Accountable</span><span><strong style="color:#3b8bff">C</strong> Consulted</span><span><strong style="color:var(--text-dim)">I</strong> Informed</span></div></div>`,
    css_template: `.tmpl-raci-wrap{overflow-x:auto}.tmpl-raci{width:100%;border-collapse:collapse;font-size:10px;text-align:center}.tmpl-raci th{text-align:left;padding:6px;border-bottom:1px solid var(--border);color:var(--text-dim)}.tmpl-raci td{padding:5px 6px;border-bottom:1px solid rgba(34,41,64,0.3)}.tmpl-raci-task{text-align:left;font-weight:600}.tmpl-raci-cell{font-weight:700}.tmpl-raci-legend{display:flex;gap:12px;margin-top:8px;font-size:8px;color:var(--text-dim)}`,
    css_variables_used: ['--border', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['RACI', 'responsible', 'accountable', 'consulted', 'informed', 'who owns', 'ownership matrix'],
    meeting_affinity: ['planning', 'project', 'operations'],
    conversation_pattern: 'Use when responsibility assignments across people and tasks are discussed.',
    min_data_points: 2,
    max_data_points: 10,
  },
  {
    name: 'Sentiment Tracker',
    slug: 'sentiment',
    category: 'people',
    version: 1,
    schema: { type: 'object', required: ['speakers'], properties: { speakers: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'object', required: ['name', 'mood'], properties: { name: { type: 'string' }, positive: { type: 'number' }, neutral: { type: 'number' }, negative: { type: 'number' }, mood: { type: 'string', description: 'Overall mood label like Confident, Concerned, Frustrated' } } } } } },
    html_template: `<div class="tmpl-sent">{{#each speakers}}<div class="tmpl-sent-row"><div class="tmpl-sent-name">{{name}}</div><div class="tmpl-sent-bar"><div style="flex:{{positive}};background:rgba(0,224,142,0.3)"></div><div style="flex:{{neutral}};background:rgba(255,194,51,0.3)"></div><div style="flex:{{negative}};background:rgba(255,77,94,0.3)"></div></div><div class="tmpl-sent-mood">{{mood}}</div></div>{{/each}}<div class="tmpl-sent-legend"><span>🟢 Positive</span><span>🟡 Neutral</span><span>🔴 Tense</span></div></div>`,
    css_template: `.tmpl-sent{display:flex;flex-direction:column;gap:6px}.tmpl-sent-row{display:flex;align-items:center;gap:8px}.tmpl-sent-name{width:60px;font-size:10px;font-weight:600;text-align:right;flex-shrink:0}.tmpl-sent-bar{flex:1;height:16px;background:var(--surface);border-radius:4px;overflow:hidden;display:flex}.tmpl-sent-mood{width:70px;font-size:8px;flex-shrink:0}.tmpl-sent-legend{display:flex;gap:10px;margin-top:8px;font-size:8px;color:var(--text-dim)}`,
    css_variables_used: ['--surface', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['sentiment', 'mood', 'tension', 'frustration', 'enthusiasm', 'emotional', 'temperature of the room'],
    meeting_affinity: ['retrospective', 'review', 'all'],
    conversation_pattern: 'Use when the emotional tone or sentiment of participants is notable.',
    min_data_points: 2,
    max_data_points: 5,
  },
  {
    name: 'Feedback Notes',
    slug: 'feedback_notes',
    category: 'people',
    version: 1,
    schema: { type: 'object', required: ['positive', 'growth'], properties: { positive: { type: 'array', items: { type: 'string' } }, growth: { type: 'array', items: { type: 'string' } } } },
    html_template: `<div class="tmpl-fb"><div class="tmpl-fb-col"><div class="tmpl-fb-hdr" style="color:#00e08e">👏 POSITIVE</div>{{#each positive}}<div class="tmpl-fb-item pos">{{this}}</div>{{/each}}</div><div class="tmpl-fb-col"><div class="tmpl-fb-hdr" style="color:#ffc233">🎯 GROWTH</div>{{#each growth}}<div class="tmpl-fb-item grow">{{this}}</div>{{/each}}</div></div>`,
    css_template: `.tmpl-fb{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tmpl-fb-hdr{font-size:8px;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:1px;margin-bottom:6px}.tmpl-fb-item{padding:7px 9px;border-radius:6px;margin-bottom:4px;font-size:10px;line-height:1.4}.tmpl-fb-item.pos{background:rgba(0,224,142,0.03);border-left:2px solid rgba(0,224,142,0.25)}.tmpl-fb-item.grow{background:rgba(255,194,51,0.03);border-left:2px solid rgba(255,194,51,0.25)}@media(max-width:600px){.tmpl-fb{grid-template-columns:1fr}}`,
    css_variables_used: [],
    render_type: 'html',
    trigger_signals: ['feedback', 'performance review', 'strengths', 'areas for improvement', 'praise', 'growth areas'],
    meeting_affinity: ['review', '1-on-1', 'retrospective'],
    conversation_pattern: 'Use when positive feedback and growth areas are discussed.',
    min_data_points: 2,
    max_data_points: 8,
  },

  // ── BRAINSTORM & IDEAS (T33–T38) ───────────────────────
  {
    name: 'Idea Cluster',
    slug: 'idea_cluster',
    category: 'brainstorm',
    version: 1,
    schema: { type: 'object', required: ['ideas'], properties: { ideas: { type: 'array', minItems: 3, maxItems: 12, items: { type: 'object', required: ['label'], properties: { label: { type: 'string' }, color: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-ic">{{#each ideas}}<div class="tmpl-ic-tag" style="border-color:{{color}};color:{{color}}">{{label}}</div>{{/each}}</div>`,
    css_template: `.tmpl-ic{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.tmpl-ic-tag{padding:10px 14px;border-radius:24px;background:rgba(88,99,128,0.04);border:1.5px solid;font-size:11px;font-weight:600}`,
    css_variables_used: [],
    render_type: 'html',
    trigger_signals: ['ideas', 'brainstorm', 'suggestions', 'options generated', 'what if we', 'possibilities'],
    meeting_affinity: ['brainstorm', 'strategy', 'planning'],
    conversation_pattern: 'Use when multiple ideas are generated in a brainstorming session.',
    min_data_points: 3,
    max_data_points: 12,
  },
  {
    name: 'Detailed Pros / Cons',
    slug: 'pros_cons',
    category: 'brainstorm',
    version: 1,
    schema: { type: 'object', required: ['options'], properties: { options: { type: 'array', minItems: 2, maxItems: 3, items: { type: 'object', required: ['name', 'pros', 'cons'], properties: { name: { type: 'string' }, pros: { type: 'array', items: { type: 'string' } }, cons: { type: 'array', items: { type: 'string' } } } } } } },
    html_template: `<div class="tmpl-pc2">{{#each options}}<div class="tmpl-pc2-opt"><div class="tmpl-pc2-name">{{name}}</div>{{#each pros}}<div class="tmpl-pc2-item pro"><span style="color:#00e08e">✓</span> {{this}}</div>{{/each}}{{#each cons}}<div class="tmpl-pc2-item con"><span style="color:#ff4d5e">✗</span> {{this}}</div>{{/each}}</div>{{/each}}</div>`,
    css_template: `.tmpl-pc2{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.tmpl-pc2-opt{padding:12px}.tmpl-pc2-name{font-size:9px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--accent);margin-bottom:6px}.tmpl-pc2-item{padding:5px 9px;border-radius:5px;margin-bottom:3px;font-size:10px;display:flex;gap:4px}.tmpl-pc2-item.pro{background:rgba(0,224,142,0.03);border-left:2px solid rgba(0,224,142,0.25)}.tmpl-pc2-item.con{background:rgba(255,77,94,0.03);border-left:2px solid rgba(255,77,94,0.25)}`,
    css_variables_used: ['--accent'],
    render_type: 'html',
    trigger_signals: ['pros and cons per option', 'trade-offs for each', 'advantages disadvantages of each'],
    meeting_affinity: ['brainstorm', 'strategy', 'decision'],
    conversation_pattern: 'Use when multiple options are each evaluated with their own pros and cons.',
    min_data_points: 2,
    max_data_points: 3,
  },
  {
    name: 'Competitive Grid',
    slug: 'competitive',
    category: 'brainstorm',
    version: 1,
    schema: { type: 'object', required: ['competitors'], properties: { competitors: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, is_us: { type: 'boolean' }, strengths: { type: 'array', items: { type: 'string' } }, weaknesses: { type: 'array', items: { type: 'string' } } } } } } },
    html_template: `<div class="tmpl-cg">{{#each competitors}}<div class="tmpl-cg-card {{#if is_us}}us{{/if}}">{{#if is_us}}<div class="tmpl-cg-you">YOU</div>{{/if}}<div class="tmpl-cg-name">{{name}}</div>{{#each strengths}}<div class="tmpl-cg-str">✓ {{this}}</div>{{/each}}{{#each weaknesses}}<div class="tmpl-cg-wk">✗ {{this}}</div>{{/each}}</div>{{/each}}</div>`,
    css_template: `.tmpl-cg{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.tmpl-cg-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;position:relative}.tmpl-cg-card.us{background:rgba(0,224,142,0.05);border:1.5px solid rgba(0,224,142,0.22)}.tmpl-cg-you{position:absolute;top:-6px;left:50%;transform:translateX(-50%);background:#00e08e;color:#06080c;font-size:6px;font-weight:800;padding:1px 6px;border-radius:6px;font-family:'JetBrains Mono',monospace}.tmpl-cg-name{font-size:12px;font-weight:800;margin-top:3px;margin-bottom:4px}.tmpl-cg-str{font-size:9px;color:#00e08e}.tmpl-cg-wk{font-size:9px;color:#ff4d5e}[data-theme="light"] .tmpl-cg-card{background:#fff}`,
    css_variables_used: ['--surface', '--border'],
    render_type: 'html',
    trigger_signals: ['competitor', 'alternative', 'market position', 'how we compare', 'competitive landscape'],
    meeting_affinity: ['strategy', 'sales', 'product'],
    conversation_pattern: 'Use when competitors or alternatives are compared with strengths and weaknesses.',
    min_data_points: 2,
    max_data_points: 5,
  },
  {
    name: 'Voting / Ranking',
    slug: 'voting_results',
    category: 'brainstorm',
    version: 1,
    schema: { type: 'object', required: ['options'], properties: { options: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'object', required: ['label', 'votes'], properties: { label: { type: 'string' }, votes: { type: 'number' }, color: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-vr">{{#each options}}<div class="tmpl-vr-row"><span class="tmpl-vr-rank" style="color:{{color}}">{{votes}}</span><div class="tmpl-vr-bar"><div class="tmpl-vr-fill" style="background:{{color}}"><span class="tmpl-vr-lbl">{{label}}</span></div></div></div>{{/each}}</div>`,
    css_template: `.tmpl-vr{display:flex;flex-direction:column;gap:5px}.tmpl-vr-row{display:flex;align-items:center;gap:8px}.tmpl-vr-rank{width:20px;font-size:14px;font-weight:800;font-family:'JetBrains Mono',monospace;text-align:right;flex-shrink:0;color:var(--text)}.tmpl-vr-bar{flex:1;height:26px;background:var(--surface);border-radius:5px;overflow:hidden;position:relative}.tmpl-vr-fill{height:100%;display:flex;align-items:center;padding-left:8px;opacity:0.22;position:relative}.tmpl-vr-lbl{font-size:10px;font-weight:700;color:var(--text);position:absolute;left:8px;top:50%;transform:translateY(-50%);z-index:1}[data-theme="light"] .tmpl-vr-bar{background:#f1f5f9}[data-theme="light"] .tmpl-vr-rank{color:#1e293b}[data-theme="light"] .tmpl-vr-lbl{color:#1e293b}`,
    css_variables_used: ['--surface', '--text'],
    render_type: 'html',
    trigger_signals: ['vote', 'rank', 'preference', 'most popular', 'team chose', 'poll results', 'ranking'],
    meeting_affinity: ['brainstorm', 'planning', 'retrospective'],
    conversation_pattern: 'Use when ideas or options are ranked by team preference or votes.',
    min_data_points: 2,
    max_data_points: 8,
  },
  {
    name: 'Spectrum / Range',
    slug: 'spectrum',
    category: 'brainstorm',
    version: 1,
    schema: { type: 'object', required: ['min_label', 'max_label', 'markers'], properties: { min_label: { type: 'string' }, mid_label: { type: 'string' }, max_label: { type: 'string' }, markers: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'object', required: ['label', 'position'], properties: { label: { type: 'string' }, position: { type: 'number', description: 'Position 0-100 on the spectrum' }, color: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-sp"><div class="tmpl-sp-labels"><span>{{min_label}}</span>{{#if mid_label}}<span>{{mid_label}}</span>{{/if}}<span>{{max_label}}</span></div><div class="tmpl-sp-track">{{#each markers}}<div class="tmpl-sp-dot" style="left:{{position}}%;background:{{color}}" title="{{label}}"></div>{{/each}}</div><div class="tmpl-sp-legend">{{#each markers}}<span style="color:{{color}}">● {{label}}</span>{{/each}}</div></div>`,
    css_template: `.tmpl-sp{padding:8px 0}.tmpl-sp-labels{display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);margin-bottom:4px}.tmpl-sp-track{height:8px;background:linear-gradient(90deg,rgba(0,224,142,0.15),rgba(255,194,51,0.15),rgba(255,77,94,0.15));border-radius:4px;position:relative;margin-bottom:12px}.tmpl-sp-dot{position:absolute;top:-4px;width:16px;height:16px;border-radius:50%;border:3px solid var(--bg);transform:translateX(-50%)}.tmpl-sp-legend{display:flex;gap:12px;font-size:9px;flex-wrap:wrap}`,
    css_variables_used: ['--text-dim', '--bg'],
    render_type: 'html',
    trigger_signals: ['spectrum', 'range', 'scale', 'positioning', 'where we sit', 'market position', 'pricing tier'],
    meeting_affinity: ['strategy', 'product', 'sales'],
    conversation_pattern: 'Use when items are positioned on a spectrum or range.',
    min_data_points: 1,
    max_data_points: 5,
  },
  {
    name: 'Affinity Groups',
    slug: 'affinity_groups',
    category: 'brainstorm',
    version: 1,
    schema: { type: 'object', required: ['groups'], properties: { groups: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'object', required: ['label', 'items'], properties: { label: { type: 'string' }, icon: { type: 'string' }, color: { type: 'string' }, items: { type: 'array', items: { type: 'string' } } } } } } },
    html_template: `<div class="tmpl-ag">{{#each groups}}<div class="tmpl-ag-group" style="border-color:{{color}}"><div class="tmpl-ag-hdr" style="color:{{color}}">{{#if icon}}{{icon}} {{/if}}{{label}}</div>{{#each items}}<div class="tmpl-ag-item">{{this}}</div>{{/each}}</div>{{/each}}</div>`,
    css_template: `.tmpl-ag{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.tmpl-ag-group{padding:12px;border:1px solid;border-radius:10px;background:rgba(88,99,128,0.02)}.tmpl-ag-hdr{font-size:9px;font-weight:700;font-family:'JetBrains Mono',monospace;margin-bottom:8px}.tmpl-ag-item{padding:5px 8px;background:var(--surface);border-radius:5px;font-size:10px;margin-bottom:4px}[data-theme="light"] .tmpl-ag-item{background:#fff}`,
    css_variables_used: ['--surface'],
    render_type: 'html',
    trigger_signals: ['group', 'cluster', 'categorize', 'theme', 'bucket', 'sorted into', 'affinity mapping'],
    meeting_affinity: ['brainstorm', 'planning', 'retrospective'],
    conversation_pattern: 'Use when ideas or items are grouped into thematic categories.',
    min_data_points: 2,
    max_data_points: 4,
  },

  // ── TIME & STATUS (T39–T46) ────────────────────────────
  {
    name: 'Horizontal Timeline',
    slug: 'horizontal_timeline',
    category: 'status',
    version: 1,
    schema: { type: 'object', required: ['events'], properties: { events: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'object', required: ['time', 'label'], properties: { time: { type: 'string' }, label: { type: 'string' }, color: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-ht">{{#each events}}<div class="tmpl-ht-ev" style="border-top-color:{{color}}"><div class="tmpl-ht-time" style="color:{{color}}">{{time}}</div><div class="tmpl-ht-lbl">{{label}}</div></div>{{/each}}</div>`,
    css_template: `.tmpl-ht{display:flex;gap:8px;overflow-x:auto;padding:4px 0}.tmpl-ht-ev{min-width:130px;padding:10px;background:var(--surface);border-radius:8px;border-top:3px solid var(--accent);flex:0 0 auto}.tmpl-ht-time{font-size:9px;font-weight:800;font-family:'JetBrains Mono',monospace;margin-bottom:3px}.tmpl-ht-lbl{font-size:10px;line-height:1.3}[data-theme="light"] .tmpl-ht-ev{background:#fff}`,
    css_variables_used: ['--surface', '--accent'],
    render_type: 'html',
    trigger_signals: ['incident timeline', 'sequence of events', 'what happened when', 'chronological', 'time stamps'],
    meeting_affinity: ['incident', 'retrospective', 'review'],
    conversation_pattern: 'Use for a horizontal sequence of time-stamped events like incident timelines.',
    min_data_points: 2,
    max_data_points: 8,
  },
  {
    name: 'Status Board',
    slug: 'status_board',
    category: 'status',
    version: 1,
    schema: { type: 'object', required: ['people'], properties: { people: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'object', required: ['name', 'status'], properties: { name: { type: 'string' }, initials: { type: 'string' }, status: { type: 'string', enum: ['on_track', 'blocked', 'at_risk', 'done'] }, detail: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-stb">{{#each people}}<div class="tmpl-stb-row tmpl-stb-{{status}}"><div class="tmpl-stb-avi">{{#if initials}}{{initials}}{{/if}}</div><div><div class="tmpl-stb-name">{{name}} — <span class="tmpl-stb-st">{{status}}</span></div>{{#if detail}}<div class="tmpl-stb-det">{{detail}}</div>{{/if}}</div></div>{{/each}}</div>`,
    css_template: `.tmpl-stb{display:flex;flex-direction:column;gap:5px}.tmpl-stb-row{display:flex;gap:7px;padding:8px 10px;background:var(--surface);border-radius:7px;border-left:3px solid var(--border)}.tmpl-stb-on_track{border-left-color:#00e08e}.tmpl-stb-blocked{border-left-color:#ff4d5e;background:rgba(255,77,94,0.02)}.tmpl-stb-at_risk{border-left-color:#ffc233}.tmpl-stb-done{border-left-color:#3b8bff}.tmpl-stb-avi{width:22px;height:22px;border-radius:5px;background:rgba(88,99,128,0.1);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;flex-shrink:0}.tmpl-stb-on_track .tmpl-stb-avi{color:#00e08e;background:rgba(0,224,142,0.1)}.tmpl-stb-blocked .tmpl-stb-avi{color:#ff4d5e;background:rgba(255,77,94,0.1)}.tmpl-stb-name{font-size:11px;font-weight:600}.tmpl-stb-st{text-transform:capitalize}.tmpl-stb-on_track .tmpl-stb-st{color:#00e08e}.tmpl-stb-blocked .tmpl-stb-st{color:#ff4d5e}.tmpl-stb-at_risk .tmpl-stb-st{color:#ffc233}.tmpl-stb-det{font-size:9px;color:var(--text-dim)}[data-theme="light"] .tmpl-stb-row{background:#fff}`,
    css_variables_used: ['--surface', '--border', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['standup', 'status update', 'on track', 'blocked', 'progress report', 'where are we'],
    meeting_affinity: ['standup', 'planning', 'review'],
    conversation_pattern: 'Use for standup-style status updates per person.',
    min_data_points: 2,
    max_data_points: 8,
  },
  {
    name: 'Goal Tracker',
    slug: 'goal_tracker',
    category: 'status',
    version: 1,
    schema: { type: 'object', required: ['goals'], properties: { goals: { type: 'array', minItems: 2, maxItems: 6, items: { type: 'object', required: ['label', 'pct'], properties: { label: { type: 'string' }, pct: { type: 'number', description: 'Progress 0-100' }, status_label: { type: 'string', description: 'e.g. DONE ✓, 2/3, 0/2 ⚠' }, is_behind: { type: 'boolean' } } } } } },
    html_template: `<div class="tmpl-gt">{{#each goals}}<div class="tmpl-gt-goal {{#if is_behind}}behind{{/if}}"><div class="tmpl-gt-top"><span class="tmpl-gt-lbl">{{label}}</span>{{#if status_label}}<span class="tmpl-gt-st">{{status_label}}</span>{{/if}}</div><div class="tmpl-gt-bar"><div class="tmpl-gt-fill" style="width:{{pct}}%"></div></div></div>{{/each}}</div>`,
    css_template: `.tmpl-gt{display:flex;flex-direction:column;gap:7px}.tmpl-gt-goal{padding:10px;background:var(--surface);border-radius:8px}.tmpl-gt-goal.behind{background:rgba(255,77,94,0.02);border:1px solid rgba(255,77,94,0.08)}.tmpl-gt-top{display:flex;justify-content:space-between;margin-bottom:4px}.tmpl-gt-lbl{font-size:11px;font-weight:600}.tmpl-gt-st{font-size:8px;color:#00e08e;font-family:'JetBrains Mono',monospace}.tmpl-gt-goal.behind .tmpl-gt-st{color:#ff4d5e}.tmpl-gt-bar{height:4px;background:rgba(88,99,128,0.15);border-radius:2px;overflow:hidden}.tmpl-gt-fill{height:100%;background:#00e08e;border-radius:2px}.tmpl-gt-goal.behind .tmpl-gt-fill{background:#ff4d5e}[data-theme="light"] .tmpl-gt-goal{background:#fff}`,
    css_variables_used: ['--surface'],
    render_type: 'html',
    trigger_signals: ['goal', 'OKR', 'target', 'progress', 'on track', 'behind schedule', 'completion'],
    meeting_affinity: ['review', '1-on-1', 'quarterly'],
    conversation_pattern: 'Use when goals with progress percentages are being tracked.',
    min_data_points: 2,
    max_data_points: 6,
  },
  {
    name: 'Retrospective',
    slug: 'retro',
    category: 'status',
    version: 1,
    schema: { type: 'object', required: ['went_well', 'improve'], properties: { went_well: { type: 'array', items: { type: 'string' } }, improve: { type: 'array', items: { type: 'string' } } } },
    html_template: `<div class="tmpl-ret"><div class="tmpl-ret-col"><div class="tmpl-ret-hdr" style="color:#00e08e">✅ WENT WELL</div>{{#each went_well}}<div class="tmpl-ret-item well">{{this}}</div>{{/each}}</div><div class="tmpl-ret-col"><div class="tmpl-ret-hdr" style="color:#ff8a3b">🔧 IMPROVE</div>{{#each improve}}<div class="tmpl-ret-item imp">{{this}}</div>{{/each}}</div></div>`,
    css_template: `.tmpl-ret{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tmpl-ret-hdr{font-size:8px;font-weight:700;font-family:'JetBrains Mono',monospace;margin-bottom:6px}.tmpl-ret-item{padding:6px 8px;border-radius:5px;margin-bottom:3px;font-size:10px}.tmpl-ret-item.well{background:rgba(0,224,142,0.03);border-left:2px solid rgba(0,224,142,0.22)}.tmpl-ret-item.imp{background:rgba(255,138,59,0.03);border-left:2px solid rgba(255,138,59,0.22)}@media(max-width:600px){.tmpl-ret{grid-template-columns:1fr}}`,
    css_variables_used: [],
    render_type: 'html',
    trigger_signals: ['retro', 'retrospective', 'went well', 'improve', 'what worked', 'what didnt', 'lessons learned'],
    meeting_affinity: ['retrospective', 'review'],
    conversation_pattern: 'Use for sprint or project retrospectives with went-well and improve columns.',
    min_data_points: 2,
    max_data_points: 10,
  },
  {
    name: 'Countdown',
    slug: 'countdown',
    category: 'status',
    version: 1,
    schema: { type: 'object', required: ['number', 'unit', 'label'], properties: { number: { type: 'string' }, unit: { type: 'string', description: 'e.g. days, hours, weeks' }, label: { type: 'string' }, warning: { type: 'string' }, color: { type: 'string' } } },
    html_template: `<div class="tmpl-cd"><div class="tmpl-cd-num" style="color:{{color}}">{{number}} {{unit}}</div><div class="tmpl-cd-lbl">{{label}}</div>{{#if warning}}<div class="tmpl-cd-warn" style="color:{{color}}">⚠ {{warning}}</div>{{/if}}</div>`,
    css_template: `.tmpl-cd{text-align:center;padding:8px 0}.tmpl-cd-num{font-size:40px;font-weight:800;font-family:'JetBrains Mono',monospace}.tmpl-cd-lbl{font-size:13px;color:var(--text-dim);margin-top:4px}.tmpl-cd-warn{font-size:10px;margin-top:6px}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['deadline', 'days left', 'countdown', 'due date', 'time remaining', 'expires', 'must be done by'],
    meeting_affinity: ['planning', 'standup', 'all'],
    conversation_pattern: 'Use when a critical deadline with urgency is discussed.',
    min_data_points: 1,
    max_data_points: 1,
  },
  {
    name: 'Gantt Chart',
    slug: 'gantt',
    category: 'status',
    version: 1,
    schema: { type: 'object', required: ['tasks', 'periods'], properties: { periods: { type: 'array', items: { type: 'string' }, description: 'Column headers like W1, W2, W3, W4' }, tasks: { type: 'array', minItems: 2, maxItems: 6, items: { type: 'object', required: ['label', 'start', 'duration'], properties: { label: { type: 'string' }, start: { type: 'number', description: '0-based start period index' }, duration: { type: 'number', description: 'Number of periods' }, color: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-ga"><div class="tmpl-ga-hdr">{{#each periods}}<div class="tmpl-ga-per">{{this}}</div>{{/each}}</div>{{#each tasks}}<div class="tmpl-ga-row"><span class="tmpl-ga-lbl" style="color:{{color}}">{{label}}</span><div class="tmpl-ga-track"><div class="tmpl-ga-bar" style="background:{{color}}"></div></div></div>{{/each}}</div>`,
    css_template: `.tmpl-ga{font-size:10px}.tmpl-ga-hdr{display:flex;gap:6px;margin-bottom:4px;padding-left:70px}.tmpl-ga-per{flex:1;text-align:right;color:var(--text-dim)}.tmpl-ga-row{display:flex;align-items:center;gap:6px;margin-bottom:4px}.tmpl-ga-lbl{width:60px;text-align:right;font-size:9px;font-weight:600;flex-shrink:0}.tmpl-ga-track{display:flex;gap:1px;flex:1}.tmpl-ga-bar{height:18px;border-radius:4px;opacity:0.2;flex:1}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['gantt', 'project timeline', 'workstream duration', 'parallel tasks', 'weeks to complete'],
    meeting_affinity: ['planning', 'project'],
    conversation_pattern: 'Use when task durations and overlaps need to be visualized across time periods.',
    min_data_points: 2,
    max_data_points: 6,
  },
  {
    name: 'Milestone Checklist',
    slug: 'milestones',
    category: 'status',
    version: 1,
    schema: { type: 'object', required: ['current', 'total', 'label'], properties: { current: { type: 'number' }, total: { type: 'number' }, label: { type: 'string' }, pct: { type: 'string' }, goal: { type: 'string' } } },
    html_template: `<div class="tmpl-ms"><div class="tmpl-ms-circle">{{#if pct}}{{pct}}{{/if}}</div><div class="tmpl-ms-info"><div class="tmpl-ms-num">{{current}} / {{total}}</div><div class="tmpl-ms-lbl">{{label}}</div>{{#if goal}}<div class="tmpl-ms-goal">{{goal}}</div>{{/if}}</div></div>`,
    css_template: `.tmpl-ms{display:flex;align-items:center;gap:12px;padding:4px 0}.tmpl-ms-circle{width:70px;height:70px;border-radius:50%;border:4px solid #00e08e;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#00e08e;font-family:'JetBrains Mono',monospace;flex-shrink:0}.tmpl-ms-num{font-size:20px;font-weight:800;color:#00e08e;font-family:'JetBrains Mono',monospace}.tmpl-ms-lbl{font-size:11px;color:var(--text-dim)}.tmpl-ms-goal{font-size:10px;color:#ffc233;margin-top:3px}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['milestone', 'progress', 'completion', 'out of', 'achieved', 'remaining', 'checklist'],
    meeting_affinity: ['review', 'planning', 'quarterly'],
    conversation_pattern: 'Use when progress toward a milestone (X out of Y) is discussed.',
    min_data_points: 1,
    max_data_points: 1,
  },
  {
    name: 'Phase Diagram',
    slug: 'phase_diagram',
    category: 'status',
    version: 1,
    schema: { type: 'object', required: ['phases'], properties: { phases: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'object', required: ['label', 'status'], properties: { label: { type: 'string' }, detail: { type: 'string' }, status: { type: 'string', enum: ['complete', 'current', 'upcoming'] } } } } } },
    html_template: `<div class="tmpl-ph">{{#each phases}}<div class="tmpl-ph-box tmpl-ph-{{status}}"><div class="tmpl-ph-name">{{label}}</div>{{#if detail}}<div class="tmpl-ph-det">{{detail}}</div>{{/if}}<div class="tmpl-ph-st">{{status}}</div></div>{{/each}}</div>`,
    css_template: `.tmpl-ph{display:flex;gap:4px;align-items:center;padding:4px 0}.tmpl-ph-box{flex:1;padding:10px 8px;border-radius:8px;text-align:center}.tmpl-ph-complete{background:rgba(0,224,142,0.06);border:1px solid rgba(0,224,142,0.15)}.tmpl-ph-current{background:rgba(255,194,51,0.08);border:2px solid rgba(255,194,51,0.3);box-shadow:0 0 12px rgba(255,194,51,0.08)}.tmpl-ph-upcoming{background:var(--surface);border:1px solid var(--border)}.tmpl-ph-name{font-size:9px;font-weight:700}.tmpl-ph-complete .tmpl-ph-name{color:#00e08e}.tmpl-ph-current .tmpl-ph-name{color:#ffc233}.tmpl-ph-upcoming .tmpl-ph-name{color:var(--text-dim)}.tmpl-ph-det{font-size:8px;color:var(--text-dim);margin-top:2px}.tmpl-ph-st{font-size:7px;margin-top:3px}.tmpl-ph-complete .tmpl-ph-st{color:#00e08e}.tmpl-ph-current .tmpl-ph-st{color:#ffc233}.tmpl-ph-upcoming .tmpl-ph-st{color:var(--text-dim)}[data-theme="light"] .tmpl-ph-upcoming{background:#fff}`,
    css_variables_used: ['--surface', '--border', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['phase', 'stage', 'we are in', 'current phase', 'next phase', 'maturity model'],
    meeting_affinity: ['planning', 'strategy', 'review'],
    conversation_pattern: 'Use when a project is described in phases with a current position.',
    min_data_points: 3,
    max_data_points: 6,
  },

  // ── REFERENCE & CONTEXT (T47–T55) ─────────────────────
  {
    name: 'Definition Cards',
    slug: 'definitions',
    category: 'reference',
    version: 1,
    schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', minItems: 2, maxItems: 6, items: { type: 'object', required: ['term', 'definition'], properties: { term: { type: 'string' }, definition: { type: 'string' }, icon: { type: 'string' }, source: { type: 'string', description: 'IN CALL or CONTEXT' } } } } } },
    html_template: `<div class="tmpl-def">{{#each items}}<div class="tmpl-def-card"><div class="tmpl-def-top">{{#if icon}}<span>{{icon}}</span>{{/if}}<span class="tmpl-def-term">{{term}}</span></div><div class="tmpl-def-desc">{{definition}}</div>{{#if source}}<span class="tmpl-def-src">{{source}}</span>{{/if}}</div>{{/each}}</div>`,
    css_template: `.tmpl-def{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tmpl-def-card{padding:10px;background:var(--surface);border-radius:8px;border-top:2px solid var(--accent)}.tmpl-def-top{display:flex;gap:5px;margin-bottom:3px}.tmpl-def-term{font-size:11px;font-weight:700}.tmpl-def-desc{font-size:9px;color:var(--text-dim);line-height:1.4}.tmpl-def-src{font-size:6px;padding:1px 4px;border-radius:2px;background:rgba(0,224,142,0.1);color:#00e08e;font-family:'JetBrains Mono',monospace;margin-top:4px;display:inline-block}[data-theme="light"] .tmpl-def-card{background:#fff}@media(max-width:600px){.tmpl-def{grid-template-columns:1fr}}`,
    css_variables_used: ['--surface', '--accent', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['define', 'what is', 'meaning of', 'term', 'concept explained', 'let me clarify'],
    meeting_affinity: ['technical', 'onboarding', 'all'],
    conversation_pattern: 'Use when key terms with definitions are introduced or explained.',
    min_data_points: 2,
    max_data_points: 6,
  },
  {
    name: 'Blindspots V2',
    slug: 'blindspots_v2',
    category: 'reference',
    version: 1,
    schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'object', required: ['title', 'severity'], properties: { title: { type: 'string' }, severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] }, note: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-bs2">{{#each items}}<div class="tmpl-bs2-item tmpl-bs2-{{severity}}"><div class="tmpl-bs2-top"><span class="tmpl-bs2-title">{{title}}</span><span class="tmpl-bs2-badge">{{severity}}</span></div>{{#if note}}<div class="tmpl-bs2-note">{{note}}</div>{{/if}}</div>{{/each}}</div>`,
    css_template: `.tmpl-bs2{display:flex;flex-direction:column;gap:5px}.tmpl-bs2-item{padding:8px 10px;background:var(--surface);border-radius:7px;border-left:3px solid}.tmpl-bs2-HIGH{border-left-color:#ff4d5e}.tmpl-bs2-MEDIUM{border-left-color:#ff8a3b}.tmpl-bs2-LOW{border-left-color:var(--text-dim)}.tmpl-bs2-top{display:flex;justify-content:space-between;margin-bottom:2px}.tmpl-bs2-title{font-size:11px;font-weight:700}.tmpl-bs2-badge{font-size:6px;padding:1px 4px;border-radius:2px;font-family:'JetBrains Mono',monospace;font-weight:700}.tmpl-bs2-HIGH .tmpl-bs2-badge{background:rgba(255,77,94,0.1);color:#ff4d5e}.tmpl-bs2-MEDIUM .tmpl-bs2-badge{background:rgba(255,138,59,0.1);color:#ff8a3b}.tmpl-bs2-note{font-size:9px;color:var(--text-dim)}[data-theme="light"] .tmpl-bs2-item{background:#fff}`,
    css_variables_used: ['--surface', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['not discussed', 'overlooked', 'missing from agenda', 'nobody mentioned', 'gap in coverage'],
    meeting_affinity: ['all'],
    conversation_pattern: 'Use as an enhanced blindspot card with severity levels for what was NOT discussed.',
    min_data_points: 1,
    max_data_points: 5,
  },
  {
    name: 'Summary Stats Bar',
    slug: 'summary_stats',
    category: 'reference',
    version: 1,
    schema: { type: 'object', required: ['stats'], properties: { stats: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'object', required: ['value', 'label'], properties: { value: { type: 'string' }, label: { type: 'string' }, color: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-ss">{{#each stats}}<div class="tmpl-ss-pill"><div class="tmpl-ss-val" style="color:{{color}}">{{value}}</div><div class="tmpl-ss-lbl">{{label}}</div></div>{{/each}}</div>`,
    css_template: `.tmpl-ss{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.tmpl-ss-pill{padding:8px 14px;background:var(--surface);border-radius:7px;text-align:center}.tmpl-ss-val{font-size:16px;font-weight:800;font-family:'JetBrains Mono',monospace}.tmpl-ss-lbl{font-size:8px;color:var(--text-dim)}[data-theme="light"] .tmpl-ss-pill{background:#fff}`,
    css_variables_used: ['--surface', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['summary', 'overview stats', 'at a glance', 'meeting stats', 'total count'],
    meeting_affinity: ['all'],
    conversation_pattern: 'Use as a compact summary bar showing key counts from the meeting.',
    min_data_points: 3,
    max_data_points: 6,
  },
  {
    name: 'Critical Alert',
    slug: 'alert_card',
    category: 'reference',
    version: 1,
    schema: { type: 'object', required: ['title', 'description'], properties: { title: { type: 'string' }, description: { type: 'string' }, icon: { type: 'string' } } },
    html_template: `<div class="tmpl-alert"><span class="tmpl-alert-icon">{{#if icon}}{{icon}}{{/if}}</span><div><div class="tmpl-alert-title">{{title}}</div><div class="tmpl-alert-desc">{{description}}</div></div></div>`,
    css_template: `.tmpl-alert{padding:14px;background:rgba(255,77,94,0.05);border:1.5px solid rgba(255,77,94,0.2);border-radius:10px;display:flex;gap:10px}.tmpl-alert-icon{font-size:22px;flex-shrink:0}.tmpl-alert-title{font-size:14px;font-weight:700;color:#ff4d5e}.tmpl-alert-desc{font-size:12px;color:var(--text-dim);margin-top:4px;line-height:1.5}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['critical', 'urgent', 'emergency', 'red flag', 'showstopper', 'must fix immediately', 'breaking'],
    meeting_affinity: ['incident', 'standup', 'all'],
    conversation_pattern: 'Use when a single critical alert or warning dominates the meeting.',
    min_data_points: 1,
    max_data_points: 1,
  },
  {
    name: 'FAQ / Q&A Pairs',
    slug: 'faq',
    category: 'reference',
    version: 1,
    schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'object', required: ['question', 'answer'], properties: { question: { type: 'string' }, answer: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-faq">{{#each items}}<div class="tmpl-faq-pair"><div class="tmpl-faq-q">Q: {{question}}</div><div class="tmpl-faq-a"><strong style="color:#00e08e">A:</strong> {{answer}}</div></div>{{/each}}</div>`,
    css_template: `.tmpl-faq{display:flex;flex-direction:column;gap:6px}.tmpl-faq-pair{padding:10px 12px;background:var(--surface);border-radius:8px}.tmpl-faq-q{font-size:11px;font-weight:700;color:#3b8bff;margin-bottom:3px}.tmpl-faq-a{font-size:11px;color:var(--text-dim)}[data-theme="light"] .tmpl-faq-pair{background:#fff}`,
    css_variables_used: ['--surface', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['question', 'answer', 'asked about', 'FAQ', 'Q&A', 'clarification given'],
    meeting_affinity: ['all'],
    conversation_pattern: 'Use when questions were asked and answered during the meeting.',
    min_data_points: 1,
    max_data_points: 6,
  },
  {
    name: 'Topic Heatmap',
    slug: 'topic_heatmap',
    category: 'reference',
    version: 1,
    schema: { type: 'object', required: ['topics'], properties: { topics: { type: 'array', minItems: 3, maxItems: 10, items: { type: 'object', required: ['label', 'count'], properties: { label: { type: 'string' }, count: { type: 'number' }, color: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-th">{{#each topics}}<div class="tmpl-th-tag" style="border-color:{{color}}"><span class="tmpl-th-lbl" style="color:{{color}}">{{label}}</span><span class="tmpl-th-ct">{{count}}×</span></div>{{/each}}</div>`,
    css_template: `.tmpl-th{display:flex;flex-wrap:wrap;gap:6px}.tmpl-th-tag{padding:6px 11px;border-radius:8px;background:rgba(88,99,128,0.04);border:1px solid}.tmpl-th-lbl{font-size:10px;font-weight:700}.tmpl-th-ct{font-size:8px;color:var(--text-dim);margin-left:4px;font-family:'JetBrains Mono',monospace}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['most discussed', 'frequency', 'mentioned times', 'dominant topic', 'recurring theme'],
    meeting_affinity: ['all'],
    conversation_pattern: 'Use to show which topics dominated the conversation by mention frequency.',
    min_data_points: 3,
    max_data_points: 10,
  },
  {
    name: 'Glossary Strip',
    slug: 'glossary_strip',
    category: 'reference',
    version: 1,
    schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', minItems: 3, maxItems: 8, items: { type: 'object', required: ['abbr', 'full'], properties: { abbr: { type: 'string' }, full: { type: 'string' }, color: { type: 'string' } } } } } },
    html_template: `<div class="tmpl-gs">{{#each items}}<div class="tmpl-gs-card"><div class="tmpl-gs-abbr" style="color:{{color}}">{{abbr}}</div><div class="tmpl-gs-full">{{full}}</div></div>{{/each}}</div>`,
    css_template: `.tmpl-gs{display:flex;gap:8px;overflow-x:auto;padding:2px 0}.tmpl-gs-card{min-width:110px;padding:8px;background:var(--surface);border-radius:8px;flex:0 0 auto}.tmpl-gs-abbr{font-size:10px;font-weight:700}.tmpl-gs-full{font-size:8px;color:var(--text-dim);margin-top:2px}[data-theme="light"] .tmpl-gs-card{background:#fff}`,
    css_variables_used: ['--surface', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['abbreviation', 'acronym', 'stands for', 'shorthand', 'initialism'],
    meeting_affinity: ['technical', 'onboarding', 'all'],
    conversation_pattern: 'Use for a compact horizontal strip of abbreviations and their expansions.',
    min_data_points: 3,
    max_data_points: 8,
  },
  {
    name: 'Meeting vs Last Time',
    slug: 'meeting_comparison',
    category: 'reference',
    version: 1,
    schema: { type: 'object', required: ['metrics'], properties: { metrics: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'object', required: ['label', 'before', 'after'], properties: { label: { type: 'string' }, before: { type: 'string' }, after: { type: 'string' }, direction: { type: 'string', enum: ['better', 'worse', 'neutral'] } } } }, summary: { type: 'string' } } },
    html_template: `<div class="tmpl-mc">{{#each metrics}}<div class="tmpl-mc-row"><div class="tmpl-mc-before"><div class="tmpl-mc-lbl">Last meeting</div><div class="tmpl-mc-val">{{before}}</div></div><div class="tmpl-mc-arrow tmpl-mc-{{direction}}">→</div><div class="tmpl-mc-after tmpl-mc-{{direction}}"><div class="tmpl-mc-lbl">This meeting</div><div class="tmpl-mc-val">{{after}}</div></div></div>{{/each}}{{#if summary}}<div class="tmpl-mc-summary">{{summary}}</div>{{/if}}</div>`,
    css_template: `.tmpl-mc{display:flex;flex-direction:column;gap:6px}.tmpl-mc-row{display:grid;grid-template-columns:1fr 40px 1fr;align-items:center;padding:8px 10px;background:var(--surface);border-radius:8px}.tmpl-mc-before,.tmpl-mc-after{text-align:center}.tmpl-mc-lbl{font-size:8px;color:var(--text-dim);margin-bottom:2px}.tmpl-mc-val{font-size:16px;font-weight:800;font-family:'JetBrains Mono',monospace}.tmpl-mc-arrow{text-align:center;font-size:12px}.tmpl-mc-better{color:#00e08e}.tmpl-mc-better .tmpl-mc-val{color:#00e08e}.tmpl-mc-worse{color:#ff4d5e}.tmpl-mc-worse .tmpl-mc-val{color:#ff4d5e}.tmpl-mc-neutral{color:var(--text-dim)}.tmpl-mc-summary{font-size:11px;color:var(--text-dim);line-height:1.5;margin-top:4px}[data-theme="light"] .tmpl-mc-row{background:#fff}`,
    css_variables_used: ['--surface', '--text-dim'],
    render_type: 'html',
    trigger_signals: ['compared to last', 'since last meeting', 'changed since', 'progress from last time', 'update from previous'],
    meeting_affinity: ['review', 'standup', 'quarterly'],
    conversation_pattern: 'Use when comparing current meeting metrics to the previous meeting.',
    min_data_points: 1,
    max_data_points: 4,
  },
  {
    name: 'Recurring Issue',
    slug: 'recurring_issue',
    category: 'reference',
    version: 1,
    schema: { type: 'object', required: ['title', 'description'], properties: { title: { type: 'string' }, description: { type: 'string' }, count: { type: 'string', description: 'How many times raised, e.g. "3 meetings"' }, duration: { type: 'string', description: 'How long unresolved, e.g. "5 weeks"' }, action: { type: 'string', enum: ['ESCALATE', 'MONITOR', 'RESOLVE'] } } },
    html_template: `<div class="tmpl-ri"><span class="tmpl-ri-icon">🔁</span><div><div class="tmpl-ri-title">{{title}}</div><div class="tmpl-ri-desc">{{description}}</div><div class="tmpl-ri-meta">{{#if action}}<span class="tmpl-ri-action">{{action}}</span>{{/if}}{{#if count}}<span class="tmpl-ri-stat">{{count}}</span>{{/if}}{{#if duration}}<span class="tmpl-ri-stat">{{duration}}</span>{{/if}}</div></div></div>`,
    css_template: `.tmpl-ri{padding:12px 14px;background:rgba(244,63,94,0.04);border:1.5px solid rgba(244,63,94,0.16);border-radius:10px;display:flex;gap:10px}.tmpl-ri-icon{font-size:18px;flex-shrink:0}.tmpl-ri-title{font-size:13px;font-weight:700;color:#f43f5e}.tmpl-ri-desc{font-size:11px;color:var(--text-dim);margin-top:3px;line-height:1.5}.tmpl-ri-meta{display:flex;gap:4px;margin-top:6px}.tmpl-ri-action{font-size:7px;padding:2px 6px;border-radius:3px;background:rgba(244,63,94,0.1);color:#f43f5e;font-family:'JetBrains Mono',monospace;font-weight:700}.tmpl-ri-stat{font-size:7px;padding:2px 6px;border-radius:3px;background:rgba(88,99,128,0.1);color:var(--text-dim);font-family:'JetBrains Mono',monospace}`,
    css_variables_used: ['--text-dim'],
    render_type: 'html',
    trigger_signals: ['again', 'still unresolved', 'keeps coming up', 'recurring', 'same issue', 'third time', 'escalate'],
    meeting_affinity: ['standup', 'retrospective', 'all'],
    conversation_pattern: 'Use when an issue has been raised multiple meetings in a row without resolution.',
    min_data_points: 1,
    max_data_points: 1,
  },
]

/**
 * Insert all seed templates into Supabase.
 * Skips templates that already exist (by slug).
 */
export async function insertSeedTemplates() {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase not configured' }
  }

  try {
    // Check which slugs already exist
    const { data: existing } = await supabase
      .from('visual_templates')
      .select('slug')

    const existingSlugs = new Set((existing || []).map(t => t.slug))

    const toInsert = SEED_TEMPLATES.filter(t => !existingSlugs.has(t.slug))

    if (toInsert.length === 0) {
      return { inserted: 0, message: 'All templates already exist' }
    }

    const { error } = await supabase
      .from('visual_templates')
      .insert(toInsert)

    if (error) throw error

    return { inserted: toInsert.length }
  } catch (err) {
    console.error('Failed to seed templates:', err)
    return { error: err.message || 'Failed to seed templates' }
  }
}
