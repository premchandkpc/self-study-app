# Architecture Overview

## Monorepo Structure

```
study-app/
├── packages/
│   ├── api/          # Express.js backend with PostgreSQL
│   └── web/          # React frontend with Vite
├── package.json      # Root monorepo config (workspaces)
└── Makefile          # Development commands
```

This is a **yarn/npm workspaces** monorepo. Scripts run with `npm run script-name` at root or use `npm -w packages/api run script-name`.

---

## Technology Stack

### Frontend (packages/web)
- **React 19** - UI library with hooks
- **React Router 7** - Client-side routing
- **React Query 5** - Server state management
- **Vite 8** - Build tool and dev server (localhost:5175)
- **CSS Modules** - Component-scoped styling

### Backend (packages/api)
- **Express.js** - REST API framework
- **Node.js** - Runtime with ESM modules
- **PostgreSQL** - Relational database
- **pg 8** - PostgreSQL client
- **CORS** - Cross-origin resource sharing

---

## Data Flow Architecture

```
User Interaction (React)
       ↓
Route Change / User Event
       ↓
API Call (React Query)
       ↓
Express Backend
       ↓
PostgreSQL Database
       ↓
Query Response
       ↓
Context Update (TopicMapsContext)
       ↓
Component Re-render
```

---

## Backend Services (packages/api)

### Database Layer
- **src/db/pool.js** - PostgreSQL connection pool
- **src/db/migrate.js** - Schema migrations
- **src/db/seed.js** - Initial data population

### Data Access Layer
- **src/db/queries/topics.js** - Topic queries
- **src/db/queries/subtopics.js** - Subtopic queries
- **src/db/queries/maps.js** - Mapping data (VISUALIZER_MAP, ABBR_MAP, etc.)

### Routes & API Endpoints
- **src/routes/health.js** - Health check (`GET /health`)
- **src/routes/topics.js** - Topic endpoints (`GET /api/topics`)
- **src/routes/subtopics.js** - Subtopic endpoints (`GET /api/topics/:id/subtopics`)
- **src/routes/maps.js** - Mapping data (`GET /api/maps`)

### Middleware
- **src/middleware/cors.js** - CORS configuration
- **src/middleware/errorHandler.js** - Global error handling

### Server Entry
- **src/index.js** - Initializes Express app, connects to DB, starts server on PORT (default 4000)

---

## Frontend Architecture (packages/web)

### Core Directories

#### `src/core/` - Business Logic & Context
- **context/** - Global state providers
  - `TopicMapsContext.js` - Topics, subtopics, mappings, visualizers
  - `ThemeContext.js` - Theme/dark mode state
  - `UIContext.js` - UI state (sidebar expanded, modal open, etc.)
  - `SimulationContext.js` - Algorithm simulation state
  
- **topics/** - Topic utilities
  - `topicRoutes.js` - URL route builders (e.g., `buildSubtopicRoute()`)
  
- **api/** - API client layer
  - `client.js` - HTTP utility for backend calls
  - Query functions for fetching data

#### `src/components/` - Reusable Components
- **layout/** - Page structure components
  - `MainLayout/` - Main wrapper with sidebar + navbar
  - `Navbar/` - Top navigation bar
  - `Sidebar/` - Left navigation sidebar
  
- **shared/** - Reusable UI components
  - `Button/` - Button component with variants
  - `Card/` - Card container with header/body
  - `Badge/` - Small label/status indicator
  - `AnimatedBox/` - Animation wrapper
  - `ErrorBoundary/` - Error catching boundary
  - `DetailPageHeader/` - Topic/subtopic header
  - `StudyGuide/` - Learning objectives display
  - `CodePanel/` - Code snippet display
  - `ComplexityPanel/` - Time/space complexity info
  - `CaseStudy/` - Case study component
  
- **visualizers/** - Algorithm/system visualizers
  - `ArrayVisualizer/` - Array algorithm visualization
  - `GraphVisualizer/` - Graph algorithm visualization
  - `KafkaVisualizer/` - Kafka messaging simulation
  
- **renderers/** - Content renderers
  - `DsaRenderer/` - Data structure & algorithm renderer
  - `SystemDiagramRenderer/` - System design diagrams
  - `TechDiagramRenderer/` - Technical architecture diagrams

#### `src/pages/` - Page Components
- **Home/** - Landing page with hero, stats, demo tabs
- **Topics/** - Topics listing and detail views
  - `TopicsList.jsx` - Accordion-style topic list
  - `TopicDetail.jsx` - Topic detail with subtopic cards
  - `SubtopicCard.jsx` - Individual subtopic card with actions
  
- **Visualizer/** - Algorithm/system visualization page
- **StudyHub/** - Centralized study resources
- **Collections/** - Saved collections of subtopics
- **InterviewMode/** - Practice interview questions
- **Compiler/** - Code editor & execution
- **NotFound/** - 404 page

#### `src/` - App Entry
- **App.jsx** - Routes setup, provider wrapping, global state
- **main.jsx** - Vite entry point
- **index.css** - Global styles

### Component File Structure

Each component follows this structure:
```
ComponentName/
├── ComponentName.jsx        # Component logic & JSX
├── ComponentName.module.css # Scoped styles
├── ComponentName.test.jsx   # Tests (optional)
└── index.js                 # Export (sometimes)
```

---

## State Management Pattern

### Context Providers (src/core/context/)

Each context manages a domain of application state:

1. **TopicMapsContext**
   - Loads data from `/api/maps` endpoint
   - Provides: TOPICS, ABBR_MAP, VISUALIZER_MAP, SUBTOPIC_SCENARIO_ID, TOPIC_META
   - Used by: Sidebar, TopicsList, SubtopicCard, routing logic
   
2. **UIContext**
   - Manages: expandedTopics, sidebarMode, etc.
   - Actions: `toggleTopicExpand()`, `setSidebarMode()`
   - Used by: Sidebar, MainLayout
   
3. **ThemeContext**
   - Manages: currentTheme
   - Actions: `setTheme()`
   - Used by: Global styling
   
4. **SimulationContext**
   - Manages: Algorithm execution state
   - Used by: Visualizer pages

### Component Integration

```jsx
function MyComponent() {
  const { state, actions } = useUI();           // UI state
  const { TOPICS, ABBR_MAP } = useTopicMapsContext(); // Data
  
  // Render using state and call actions on user interaction
}
```

---

## Routing Architecture

Routes defined in `App.jsx`:

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Home | Landing page |
| `/topics` | Topics | Browse all topics |
| `/topics/:topicId` | Topics | Topic detail view |
| `/:abbr` | VisualizerPage | Topic home (e.g., `/dsa`) |
| `/:abbr/:slug` | VisualizerPage | Subtopic visualizer (e.g., `/dsa/arrays`) |
| `/study-hub` | StudyHub | Centralized resources |
| `/collections` | Collections | Saved learning collections |
| `/interview` | InterviewMode | Interview prep |
| `/compiler` | CompilerPage | Code editor |

Dynamic routes use topic abbreviations (abbr) for cleaner URLs:
- `dsa` for Data Structures & Algorithms
- `java` for Java fundamentals
- `kafka` for Kafka systems
- etc.

---

## Data Models

### Topics (from PostgreSQL)
```js
{
  id: 1,
  label: "Data Structures",
  abbr: "dsa",
  icon: "🧩",
  subtopics: [...], // Array of subtopic objects
  meta: {
    desc: "Learn data structures...",
    color: "blue",
    objectives: [...],
    keyTopics: [...]
  }
}
```

### Subtopics (from PostgreSQL)
```js
{
  id: 1,
  topicId: 1,
  name: "Arrays",
  slug: "arrays",
  scenarioId: "array-scenario-1",
  complexity: { time: "O(n)", space: "O(1)" },
  useCases: ["..."],
  explanation: "...",
  visualizer: {...}
}
```

### Maps (API response structure)
```js
{
  TOPICS: [...],
  ABBR_MAP: { dsa: { id, subtopics }, kafka: {...} },
  VISUALIZER_MAP: { "1:Arrays": true, ... },
  SUBTOPIC_SCENARIO_ID: { "1:Arrays": "array-scenario-1", ... },
  TOPIC_META: { 1: { desc, color, objectives }, ... }
}
```

---

## API Endpoints

### GET /health
Health check endpoint. Returns `{ status: 'ok' }`.

### GET /api/topics
Returns all topics with full metadata.

### GET /api/topics/:id/subtopics
Returns subtopics for a specific topic.

### GET /api/maps
Returns consolidated maps (TOPICS, ABBR_MAP, VISUALIZER_MAP, etc.). **Primary data endpoint**.

---

## Development Workflow

### Starting Development
```bash
npm run dev          # Starts both API (4000) and Web (5175)
npm run dev:api     # API only
npm run dev:web     # Web only
```

### Database Management
```bash
npm run migrate     # Run schema migrations
npm run seed        # Populate initial data
```

### Building for Production
```bash
npm run build:web   # Build React app
```

---

## Key Design Patterns

### 1. **Context as Centralized Data Store**
Instead of prop drilling, use context providers. TopicMapsContext wraps the entire app and provides topic data to any component.

### 2. **Module-Scoped CSS**
Each component gets its own CSS file (ComponentName.module.css) to avoid style conflicts.

### 3. **Functional Components with Hooks**
All components use React hooks (useState, useContext, useEffect) instead of class components.

### 4. **Route-Based Code Splitting**
Pages are lazy-loaded, not all loaded upfront. Routes in App.jsx define page components.

### 5. **Separation of Concerns**
- **API layer**: `src/core/api/` - HTTP calls
- **Context layer**: `src/core/context/` - State management
- **Component layer**: `src/components/` - UI rendering
- **Page layer**: `src/pages/` - Route handlers

---

## Error Handling

### Frontend
- **ErrorBoundary** component catches React errors
- Each page/context has try-catch for API failures
- User sees fallback UI on errors

### Backend
- Global error handler middleware in `src/middleware/errorHandler.js`
- Returns standardized error responses
- Database errors logged, user gets generic 500 response

---

## Performance Optimizations

- **Code Splitting**: Pages loaded only when navigated to
- **Lazy Loading**: Visualizers load with Suspense + fallback
- **React Query**: Caches server data, prevents redundant requests
- **CSS Modules**: Only loaded styles are bundled per route
- **Connection Pooling**: PostgreSQL pool prevents connection exhaustion
