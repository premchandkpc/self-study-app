# react-stateless-app — Architecture Plan

## Core Philosophy

Zero app state. Components = factories `(data, context) => UI`.
Everything composed from templates. URL is the only source of truth.

## Route Design

```
#/topic              → TopicPage (list subtopics)
#/topic/subtopic     → SubtopicPage (render subtopic via template)
```

Hash-only routing. Top-level hashchange listener re-renders entire tree.

```
Root:
  readHash() → { topic, subtopic }
  fetchMaps() → { topics, subtopics, templates }
  render(<App topic={t} subtopic={s} maps={m} />)

App:
  if subtopic → <SubtopicPage topic={t} subtopic={s} maps={m} />
  else         → <TopicPage topic={t} maps={m} />
```

## Template System (Factory Pattern)

Every piece of UI is a template. Templates are registered factory functions:

```
renderTemplate(slug, data, context) → JSX
```

```js
// template-registry.js
const registry = new Map();

function define(slug, factory) {
  registry.set(slug, factory);
}

function render(slug, data, context = {}) {
  const fn = registry.get(slug);
  if (!fn) return <MissingTemplate slug={slug} />;
  return fn(data, context);
}
```

### Template = factory(data, context) → JSX

- `data`   = subtopic.data (content from DB, JSONB)
- `context` = runtime modifiers { theme, mode, readonly, permissions, locale, ... }

Context lets the same template adapt: dark/light theme, edit/preview mode, mobile/desktop.

### Template Composition

Templates nest other templates via `render()`:

```js
define('split-panel', (data, ctx) => (
  <SplitPanel
    left={render(data.left.template, data.left.data, ctx)}
    right={render(data.right.template, data.right.data, ctx)}
  />
));
```

### Template Extension

A template extends another by wrapping or modifying context:

```js
define('dark-markdown', (data, ctx) =>
  render('markdown', data, { ...ctx, theme: 'dark' })
);
```

## Provided Templates (initial)

| Slug | Factory | Data shape | Context keys |
|------|---------|------------|--------------|
| `markdown` | Renders markdown content | `{ content, frontmatter }` | theme |
| `visualizer` | Interactive algorithm viz | `{ vizType, steps, variables }` | mode, speed |
| `playground` | Code editor + test runner | `{ code, language, tests }` | readonly, theme |
| `card-grid` | Grid of clickable cards | `{ items[], columns }` | compact |
| `split-panel` | Two-panel resizable layout | `{ left:{template,data}, right:{template,data} }` | ratio |
| `tabs` | Tabbed container | `{ tabs: [{label, template, data}] }` | activeTab |
| `step-controls` | Forward/back step navigator | `{ steps[], current }` | — |
| `concept-map` | Graph/relation visualization | `{ nodes[], edges[] }` | layout |

## DB Schema

```sql
CREATE TABLE topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  config JSONB DEFAULT '{}'
);

CREATE TABLE templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}'
);

CREATE TABLE subtopics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(200) UNIQUE NOT NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0
);
```

## Entity Breakdown

```
Topic
├── slug, title, description, icon
├── config: { defaultTemplate, color, order }
└── subtopics[]

Subtopic [MAIN ENTITY]
├── slug, title, description
├── tags[]       ← cross-topic linking
├── template_id  ← which template renders it
├── data: {}     ← the content (template-specific shape)
├── metadata: {} ← extra: { difficulty, readingTime, prerequisites }
└── related: []  ← other subtopics (from tags or explicit refs)

Template
├── slug, name
├── config: { defaultContext, layout, styles }
└── factory(data, context) → JSX
```

## API Endpoints

```
GET  /api/maps             → { topics[], templateMap, slugMap }
GET  /api/topics           → [topic[]]
GET  /api/topics/:slug     → { topic, subtopics[] }
GET  /api/subtopics/:slug  → { subtopic, template, tags[], related[] }
POST /api/execute          → { steps, result, duration }
POST /api/seed             → seed DB from JSON
```

`/api/maps` is THE cacheable payload. Loaded once on app boot. Contains:
- `topics` — list for sidebar/nav
- `slugMap` — `{ "topicSlug:subtopicSlug": templateSlug }` for instant routing
- `templateMap` — `{ "templateSlug": true }` for validity checks

## Component Tree

```
<Root>
  <Head>  ← title, meta from current topic/subtopic
  <Navbar topics={maps.topics} currentTopic={topic} />
  <PageShell>
    {subtopic
      ? <SubtopicPage>
          <renderTemplate(subtopic.template_id, subtopic.data, context) />
        </SubtopicPage>
      : <TopicPage topic={topic} subtopics={subtopics} />
    }
  </PageShell>
</Root>
```

### SubtopicPage variants:

```
subtopic.template_id = 'split-panel'
  → left: markdown (description + examples)
  → right: playground (code + test runner)

subtopic.template_id = 'visualizer'
  → <VisualizerTemplate data={subtopic.data} context={context} />

subtopic.template_id = 'tabs'
  → tabs: ["Learn" → markdown, "Play" → playground, "Visualize" → visualizer]
```

## Factory Pattern Details

```js
// A template is just a function in a registry
define('playground', (data, context) => {
  const readOnly = context.mode === 'preview';
  const theme = context.theme || 'dark';

  return (
    <div className="playground">
      <div className="playground-editor">
        <CodeEditor code={data.code} readOnly={readOnly} />
      </div>
      {!readOnly && (
        <div className="playground-controls">
          <Button onClick={() => runCode(data.code)}>Run</Button>
        </div>
      )}
    </div>
  );
});

// Extend with context:
define('preview-playground', (data, ctx) =>
  render('playground', data, { ...ctx, mode: 'preview' })
);

// Compose:
define('lesson', (data, ctx) => (
  <SplitPanel
    left={render('markdown', data.lesson, ctx)}
    right={render('playground', data.code, ctx)}
  />
));
```

## No State Rules

| What | Allowed? | How instead |
|------|----------|-------------|
| useState | NO | Data in URL or fetched fresh |
| useReducer | NO | N/A |
| useContext | NO | Pass context as prop down tree |
| useRef | NO | For DOM? Use callback refs + direct DOM API |
| useEffect | NO | Data fetching? Top-level render loop calls fetch |
| useMemo/useCallback | NO | Avoid; templates are cheap |
| Custom hooks | NO | Any hook = state |
| props | YES | Only data flow |
| hashchange listener | YES | Top-level, triggers re-render |

## Build Order

1. Scaffold: workspaces, package.json, vite, express
2. DB schema + seed script
3. API: `/api/maps`, `/api/topics/:slug`, `/api/subtopics/:slug`
4. Template registry + 3 core templates
5. Hash-driven render loop + TopicPage + SubtopicPage
6. Seed with 3 topics, 15 subtopics
7. Verify no state hooks exist

## Directory Structure

```
react-stateless-app/
├── data/                   # seed JSON
│   ├── topics.json
│   ├── templates.json
│   └── subtopics.json
├── packages/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── db.js
│   │   │   ├── seed.js
│   │   │   └── routes/
│   │   │       ├── maps.js
│   │   │       ├── topics.js
│   │   │       ├── subtopics.js
│   │   │       └── execute.js
│   │   └── package.json
│   └── web/
│       ├── src/
│       │   ├── index.html
│       │   ├── main.jsx       ← Hash-driven render loop
│       │   ├── App.jsx        ← <App hash topic={} subtopic={} maps={} />
│       │   ├── registry/
│       │   │   ├── index.js   ← define() / render()
│       │   │   └── templates/
│       │   │       ├── markdown.jsx
│       │   │       ├── visualizer.jsx
│       │   │       ├── playground.jsx
│       │   │       ├── split-panel.jsx
│       │   │       ├── tabs.jsx
│       │   │       ├── card-grid.jsx
│       │   │       ├── step-controls.jsx
│       │   │       └── concept-map.jsx
│       │   ├── pages/
│       │   │   ├── TopicPage.jsx
│       │   │   └── SubtopicPage.jsx
│       │   ├── components/
│       │   │   ├── Navbar.jsx
│       │   │   ├── PageShell.jsx
│       │   │   └── MissingTemplate.jsx
│       │   ├── api.js         ← fetch helpers
│       │   └── styles.css
│       └── package.json
└── package.json
```
