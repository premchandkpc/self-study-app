# File Types & Their Purpose

Guide to understanding what each type of file does in the study-app codebase.

---

## Frontend Files (packages/web/src)

### Component Files (.jsx)

**Page Components** (packages/web/src/pages/)
- Directly matched to routes in App.jsx
- Manage page-level state and layout
- Examples: `Home.jsx`, `Topics.jsx`, `VisualizerPage.jsx`
- Render other components and handle route parameters

```jsx
// Example: pages/Home/Home.jsx
export default function Home({ onSelectTopic }) {
  // Page state and logic
  return <div>{/* content */}</div>
}
```

**Layout Components** (packages/web/src/components/layout/)
- Wrapper components that structure the page
- Examples: `MainLayout`, `Navbar`, `Sidebar`
- Typically contain navigation, headers, sidebars
- Used across multiple pages

```jsx
// MainLayout wraps all pages and provides navbar + sidebar
<MainLayout>
  <Routes>{/* pages go here */}</Routes>
</MainLayout>
```

**Shared Components** (packages/web/src/components/shared/)
- Reusable UI elements used across multiple pages
- Examples: `Button`, `Card`, `Badge`, `AnimatedBox`
- Accept props for customization (variant, size, onClick, etc.)
- No page-specific logic

```jsx
<Button variant="primary" size="lg" onClick={handleClick}>
  Start Learning
</Button>
```

**Renderer Components** (packages/web/src/components/renderers/)
- Specialized components that render different content types
- Examples: `DsaRenderer`, `SystemDiagramRenderer`, `TechDiagramRenderer`
- Parse and display markdown/config-based content

**Visualizer Components** (packages/web/src/components/visualizers/)
- Interactive algorithm/system visualizations
- Examples: `ArrayVisualizer`, `GraphVisualizer`, `KafkaVisualizer`
- Complex state management for simulation steps, animations
- Often wrapped in SimulationProvider

```jsx
<SimulationProvider>
  <Suspense fallback={<Loading />}>
    <ArrayVisualizer arr={[2, 1, 5]} />
  </Suspense>
</SimulationProvider>
```

---

### Module CSS Files (.module.css)

**Purpose**: Component-scoped styling. Prevents CSS conflicts across components.

**Usage**:
```jsx
import styles from './Button.module.css';

export function Button({ variant }) {
  return <button className={`${styles.button} ${styles[variant]}`}>Click</button>
}
```

**File Naming**: `ComponentName.module.css` sits alongside `ComponentName.jsx`

**Structure**:
```css
.button {
  padding: 8px 16px;
  border: none;
  cursor: pointer;
}

.button.primary {
  background: blue;
  color: white;
}

.button.ghost {
  background: transparent;
}
```

CSS class names are scoped to that component, so `.button` in Button.module.css won't conflict with `.button` in Card.module.css.

---

### Context Files (packages/web/src/core/context/)

**Purpose**: Global state management for themes, UI, topics, simulations.

**Structure**:
```jsx
import { createContext, useContext, useState, useEffect } from 'react';

const TopicMapsContext = createContext();

export function TopicMapsProvider({ children }) {
  const [state, setState] = useState({});
  
  // Fetch data from API
  useEffect(() => {
    fetch('/api/maps').then(/* update state */)
  }, []);
  
  return (
    <TopicMapsContext.Provider value={state}>
      {children}
    </TopicMapsContext.Provider>
  );
}

export function useTopicMapsContext() {
  return useContext(TopicMapsContext);
}
```

**Key Contexts**:
- `TopicMapsContext.js` - Topics, subtopics, visualizer mappings
- `ThemeContext.js` - Current theme (light/dark)
- `UIContext.js` - Sidebar state, expanded topics, modals
- `SimulationContext.js` - Algorithm execution state

---

### Utility Files (packages/web/src/core/)

**Topic Routes** (packages/web/src/core/topics/topicRoutes.js)
- Helper functions for building URLs
- Examples: `buildSubtopicRoute()`, `buildSubtopicLearnRoute()`
- Keeps URL logic in one place for maintainability

```jsx
// Instead of hardcoding: `/${topic.abbr}/${slug}`
// Use: buildSubtopicRoute(topic.abbr, slug)
// Makes it easier to change URL structure later
```

**API Client** (packages/web/src/core/api/)
- Fetch wrapper and API call functions
- Examples: `getTopic()`, `getSubtopics()`, `getMaps()`
- Handles errors, loading states, retries

```jsx
// In context or component
const data = await getMaps();
```

---

### Entry Files

**main.jsx** - Vite entry point
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**App.jsx** - Top-level component
- Wraps all providers (QueryClient, Router, Theme, UI, TopicMaps)
- Defines all routes
- Error boundary wrapping

**index.css** - Global styles
- Font imports
- CSS variables for colors, spacing
- Reset/normalization styles

---

### Test Files (.test.jsx)

**Purpose**: Unit tests for components and logic

**Location**: Alongside the file being tested
```
Button.jsx
Button.test.jsx  // Tests for Button component
```

**Framework**: Vitest + React Testing Library

```jsx
import { render, screen } from '@testing-library/react';
import Button from './Button.jsx';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

---

## Backend Files (packages/api/src)

### Server Entry (index.js)

**Purpose**: Starts Express server, connects to database, mounts routes

```js
import express from 'express';
import topicsRoutes from './routes/topics.js';

const app = express();
app.use('/api/topics', topicsRoutes);
app.listen(PORT, () => console.log('Server started'));
```

---

### Route Files (src/routes/)

**Purpose**: Define API endpoints and request handlers

**Example** (routes/topics.js):
```js
import express from 'express';
import * as db from '../db/queries/topics.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const topics = await db.getAllTopics();
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

**Files**:
- `health.js` - Health check endpoint
- `topics.js` - Topic CRUD endpoints
- `subtopics.js` - Subtopic endpoints
- `maps.js` - Consolidated data endpoint

---

### Query Files (src/db/queries/)

**Purpose**: Database queries using SQL and pg client

**Example** (db/queries/topics.js):
```js
import { pool } from '../pool.js';

export async function getAllTopics() {
  const result = await pool.query('SELECT * FROM topics');
  return result.rows;
}

export async function getTopicById(id) {
  const result = await pool.query('SELECT * FROM topics WHERE id = $1', [id]);
  return result.rows[0];
}
```

**Files**:
- `topics.js` - SELECT/INSERT/UPDATE topics
- `subtopics.js` - SELECT/INSERT/UPDATE subtopics
- `maps.js` - Queries for consolidated maps (VISUALIZER_MAP, ABBR_MAP, etc.)

---

### Database Files (src/db/)

**pool.js** - PostgreSQL connection pooling
```js
import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});
```
- Manages multiple connections to PostgreSQL
- Reuses connections instead of opening new ones
- Limits total connections to avoid exhaustion

**migrate.js** - Database schema setup
```js
// Run with: npm run migrate
// Creates tables if they don't exist

await pool.query(`
  CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    label VARCHAR(255),
    abbr VARCHAR(50),
    ...
  )
`)
```

**seed.js** - Initial data population
```js
// Run with: npm run seed
// Inserts topics, subtopics, visualizers

export async function seedIfEmpty() {
  const count = await pool.query('SELECT COUNT(*) FROM topics');
  if (count.rows[0].count === 0) {
    // Insert data
  }
}
```

---

### Middleware Files (src/middleware/)

**Purpose**: Functions that intercept requests before routes

**cors.js** - Cross-Origin Resource Sharing
```js
// Allow requests from different domain (frontend on 5175, API on 4000)
app.use(cors({
  origin: 'http://localhost:5175',
  credentials: true
}));
```

**errorHandler.js** - Global error catching
```js
// Catches all errors from routes and sends formatted response
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
```

---

## Configuration Files

### Root Level

**package.json** - Monorepo configuration
```json
{
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    "dev:api": "npm -w packages/api run dev",
    "dev:web": "npm -w packages/web run dev"
  }
}
```
- Defines workspace packages (api, web)
- Root-level scripts that run in both packages

**Makefile** - Development commands
```makefile
dev:
	npm run dev

seed:
	npm run seed

fresh:
	npm run migrate && npm run seed
```
- Shortcut commands like `make dev`, `make seed`

### Frontend (packages/web)

**package.json** - Frontend dependencies and scripts
```json
{
  "dependencies": {
    "react": "^19.2.6",
    "react-router-dom": "^7.15.1",
    "@tanstack/react-query": "^5.40.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

**vite.config.js** - Vite bundler configuration
- Port: 5175 (dev server)
- React plugin for JSX transformation
- Build output settings

**index.html** - HTML entry point
```html
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
```

**.env** (if needed) - Frontend environment variables
```
VITE_API_BASE_URL=http://localhost:4000
```

### Backend (packages/api)

**package.json** - Backend dependencies and scripts
```json
{
  "dependencies": {
    "express": "^4.19.2",
    "pg": "^8.11.5",
    "cors": "^2.8.5"
  },
  "scripts": {
    "dev": "node --watch src/index.js",
    "migrate": "node src/db/migrate.js",
    "seed": "node src/db/seed.js"
  }
}
```

**.env** - Backend environment variables
```
DATABASE_URL=postgresql://user:password@localhost:5432/study_app
PORT=4000
NODE_ENV=development
```

---

## Environment Files (.env)

**.env** (Backend)
```
DATABASE_URL=postgresql://...
PORT=4000
NODE_ENV=development
```

Used by dotenv in backend to load configuration.

---

## File Organization Summary

| Path | Type | Purpose |
|------|------|---------|
| `packages/web/src/pages/` | JSX | Route-matched page components |
| `packages/web/src/components/` | JSX | Shared & layout UI components |
| `packages/web/src/core/context/` | JSX | Global state providers |
| `packages/web/src/core/api/` | JS | API client functions |
| `**/*.module.css` | CSS | Component-scoped styles |
| `packages/api/src/routes/` | JS | API endpoint definitions |
| `packages/api/src/db/queries/` | JS | SQL queries |
| `packages/api/src/middleware/` | JS | Request interceptors |
| `packages/api/src/db/` | JS | Database setup & pooling |
| `package.json` | JSON | Dependencies & scripts |
| `.env` | Text | Environment variables |

---

## Key Principles

1. **One component per file** - Component logic and JSX in the same file
2. **Scoped styles** - Use .module.css for component isolation
3. **Context for global state** - Don't prop-drill; use context providers
4. **Separation by concern** - Routes → Pages → Components → Shared Components
5. **Async handled at boundaries** - API calls in context or page, pass data down
6. **DRY URLs** - Use helper functions for route building, not hardcoded strings
