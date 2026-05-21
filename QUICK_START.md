# Quick Start Guide

Fast reference for common tasks in the study-app.

---

## Setup

### First Time
```bash
cd packages/api
npm install

cd packages/web
npm install

# Back to root
cd ../..
npm run migrate    # Create database tables
npm run seed       # Populate initial data
```

### Running
```bash
npm run dev        # Starts both API (4000) and Web (5175)
```

Visit: `http://localhost:5175` (web) and `http://localhost:4000/health` (API)

---

## Project Structure Cheat Sheet

```
study-app/
├── ARCHITECTURE.md          ← Read this first: How everything fits together
├── FILE_TYPES.md           ← What each file type does
├── CONCEPTS.md             ← Explains React, Context, Router, etc.
├── QUICK_START.md          ← This file
├── Makefile                ← Development shortcuts
├── packages/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.js         ← Server entry point
│   │   │   ├── routes/          ← API endpoints
│   │   │   ├── db/
│   │   │   │   ├── pool.js      ← Database connection
│   │   │   │   ├── queries/     ← SQL queries
│   │   │   │   ├── migrate.js   ← Schema setup
│   │   │   │   └── seed.js      ← Initial data
│   │   │   └── middleware/      ← CORS, error handling
│   │   └── .env            ← Database URL, PORT
│   │
│   └── web/
│       ├── src/
│       │   ├── App.jsx          ← Routes + providers
│       │   ├── main.jsx         ← Entry point
│       │   ├── pages/           ← Page components (Home, Topics, etc.)
│       │   ├── components/
│       │   │   ├── layout/      ← Navbar, Sidebar, MainLayout
│       │   │   ├── shared/      ← Reusable UI (Button, Card, etc.)
│       │   │   ├── visualizers/ ← Algorithm visualizations
│       │   │   └── renderers/   ← Content rendering
│       │   └── core/
│       │       ├── context/     ← Global state (Topics, UI, Theme)
│       │       ├── api/         ← API client functions
│       │       └── topics/      ← URL builders
│       └── vite.config.js
```

---

## Common Tasks

### Adding a New Page

1. Create file in `packages/web/src/pages/YourPage/YourPage.jsx`:
```jsx
export default function YourPage() {
  return <div>Your page content</div>
}
```

2. Add route in `packages/web/src/App.jsx`:
```jsx
import YourPage from './pages/YourPage/YourPage';

<Route path="/your-page" element={<YourPage />} />
```

3. Visit `http://localhost:5175/your-page`

### Adding a New Shared Component

1. Create folder: `packages/web/src/components/shared/YourComponent/`
2. Create files:
   - `YourComponent.jsx` - Component code
   - `YourComponent.module.css` - Styles
   - `YourComponent.test.jsx` - Tests (optional)

```jsx
// YourComponent.jsx
import styles from './YourComponent.module.css';

export default function YourComponent({ variant }) {
  return <div className={styles.container}>Content</div>
}
```

```css
/* YourComponent.module.css */
.container {
  padding: 1rem;
}
```

3. Use in other components:
```jsx
import YourComponent from '../../components/shared/YourComponent/YourComponent';

<YourComponent variant="primary" />
```

### Fetching Data from API

**In Context** (for global data):
```jsx
import { useEffect, useState } from 'react';

function TopicMapsProvider({ children }) {
  const [topics, setTopics] = useState([]);
  
  useEffect(() => {
    fetch('http://localhost:4000/api/topics')
      .then(r => r.json())
      .then(data => setTopics(data))
      .catch(err => console.error(err));
  }, []);
  
  return (
    <TopicMapsContext.Provider value={{ topics }}>
      {children}
    </TopicMapsContext.Provider>
  );
}
```

**In Component** (for local data):
```jsx
import { useEffect, useState } from 'react';

function TopicDetail({ topicId }) {
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:4000/api/topics/${topicId}`)
      .then(r => r.json())
      .then(data => { setTopic(data); setLoading(false); })
      .catch(err => { setError(err); setLoading(false); });
  }, [topicId]);
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>{topic?.label}</div>
}
```

### Using Global State

1. Access in any component:
```jsx
import { useTopicMapsContext } from '../../core/context/TopicMapsContext';

function MyComponent() {
  const { TOPICS, ABBR_MAP } = useTopicMapsContext();
  
  return (
    <ul>
      {TOPICS.map(topic => (
        <li key={topic.id}>{topic.label}</li>
      ))}
    </ul>
  );
}
```

2. Modify UI state:
```jsx
import { useUI } from '../../core/context/UIContext';

function Sidebar() {
  const { state, actions } = useUI();
  
  return (
    <button onClick={() => actions.toggleTopicExpand(topicId)}>
      {state.expandedTopics[topicId] ? 'Collapse' : 'Expand'}
    </button>
  );
}
```

### Navigating Programmatically

```jsx
import { useNavigate } from 'react-router-dom';

function TopicCard({ topicId, topicAbbr }) {
  const navigate = useNavigate();
  
  return (
    <button onClick={() => navigate(`/${topicAbbr}`)}>
      View Topic
    </button>
  );
}
```

### Styling a Component

**Using CSS Modules** (recommended):
```jsx
import styles from './Button.module.css';

export function Button({ variant = 'primary', children }) {
  return (
    <button className={`${styles.button} ${styles[variant]}`}>
      {children}
    </button>
  );
}
```

```css
/* Button.module.css */
.button {
  padding: 8px 16px;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}

.button.primary {
  background: #007bff;
  color: white;
}

.button.secondary {
  background: #e9ecef;
  color: #333;
}
```

### Adding a Backend Route

1. Create function in `packages/api/src/db/queries/topics.js`:
```js
export async function getTopicById(id) {
  const result = await pool.query(
    'SELECT * FROM topics WHERE id = $1',
    [id]
  );
  return result.rows[0];
}
```

2. Create route in `packages/api/src/routes/topics.js`:
```js
import express from 'express';
import * as db from '../db/queries/topics.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const topic = await db.getTopicById(req.params.id);
    res.json(topic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

3. Mount route in `packages/api/src/index.js`:
```js
import topicsRoutes from './routes/topics.js';
app.use('/api/topics', topicsRoutes);
```

4. Call from frontend:
```jsx
const response = await fetch('http://localhost:4000/api/topics/1');
const topic = await response.json();
```

---

## Key Files to Know

### Frontend

| File | Purpose |
|------|---------|
| `App.jsx` | Routes & provider setup |
| `core/context/TopicMapsContext.js` | Topics, subtopics, visualizers |
| `core/context/UIContext.js` | UI state (sidebar, expanded, etc.) |
| `pages/Topics/Topics.jsx` | Topics list & detail page |
| `components/layout/MainLayout.jsx` | Page wrapper (navbar, sidebar) |

### Backend

| File | Purpose |
|------|---------|
| `src/index.js` | Server entry, routes mounting |
| `src/db/pool.js` | Database connection |
| `src/db/queries/topics.js` | Topic SQL queries |
| `src/routes/topics.js` | Topic endpoints |
| `src/middleware/cors.js` | CORS configuration |

---

## Debugging

### Browser Console
1. Open DevTools: `Cmd+Option+I` (Mac) or `F12` (Windows)
2. Check Console tab for errors
3. Check Network tab to see API calls
4. Check React tab to inspect component state

### API Testing
Use browser console or curl:
```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/topics
```

### Database Inspection
```bash
npm run migrate    # See table structure
npm run seed       # Check seed data
```

### Common Errors

**"Invalid hook call"**
- Hooks (useState, useContext) must be called directly in component body, not inside if/for/callback
- Solution: Move hook call to top level

**"Objects are not valid as a React child"**
- You're trying to render an object as JSX
- Solution: Extract the value you need from the object (e.g., `{object.name}` not `{object}`)

**"Cannot GET /:path"**
- API endpoint doesn't exist
- Solution: Check route is registered in `src/routes/` and mounted in `src/index.js`

**"PORT already in use"**
- Another process using port 4000 or 5175
- Solution: Kill the process or change PORT in `.env`

---

## Development Workflow

### 1. Start servers
```bash
npm run dev
```

### 2. Make code changes
- Edit `.jsx`, `.js`, or `.css` files
- Changes hot-reload automatically

### 3. Test in browser
- Navigate to feature in UI
- Check console for errors

### 4. Check backend
- Open DevTools Network tab
- Verify API calls succeed

### 5. Test edge cases
- Try empty states
- Try error states
- Try with different data

### 6. Commit changes
```bash
git add .
git commit -m "Description of change"
git push
```

---

## Performance Tips

1. **Use React DevTools Profiler**
   - Identify slow components
   - Check re-render frequency

2. **Lazy load pages**
   - Use `lazy()` and `Suspense` for routes

3. **Memoize components**
   - Use `memo()` for expensive re-renders

4. **Check bundle size**
   - Run `npm run build:web`
   - Inspect `dist/` folder

5. **Use CSS efficiently**
   - Avoid inline styles
   - Use CSS Modules for scoping

---

## Testing

### Run tests
```bash
npm run test:web
npm run test:api
```

### Write a test
```jsx
// Button.test.jsx
import { render, screen } from '@testing-library/react';
import Button from './Button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

---

## Building for Production

```bash
npm run build:web
```

Creates `packages/web/dist/` with optimized files ready to deploy.

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/name

# Make changes
git add .
git commit -m "description"

# Push and create PR
git push origin feature/name

# After merge, update local
git checkout main
git pull origin main
```

---

## Resources

- **Architecture**: See ARCHITECTURE.md
- **File Types**: See FILE_TYPES.md
- **Concepts**: See CONCEPTS.md
- **React Docs**: https://react.dev
- **React Router**: https://reactrouter.com
- **React Query**: https://tanstack.com/query
- **Express**: https://expressjs.com
- **PostgreSQL**: https://www.postgresql.org/docs

---

## Keyboard Shortcuts

| Shortcut | Purpose |
|----------|---------|
| `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Win) | VSCode command palette |
| `Cmd+P` (Mac) / `Ctrl+P` (Win) | Quick file open |
| `Cmd+J` (Mac) / `Ctrl+J` (Win) | Toggle terminal |
| `Cmd+Option+I` (Mac) / `F12` (Win) | Browser DevTools |
