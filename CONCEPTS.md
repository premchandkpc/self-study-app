# Key Concepts Guide

Technical concepts and patterns used throughout the study-app codebase.

---

## React Fundamentals

### Components

**Functional Components**
- All components in this project use function syntax, not class syntax
- Each component is a JavaScript function that returns JSX

```jsx
function Button({ text, onClick }) {
  return <button onClick={onClick}>{text}</button>;
}

export default Button;
```

**Props**
- Data passed from parent to child component
- Props are read-only; children can't modify them

```jsx
<Button text="Click me" onClick={handleClick} />

function Button({ text, onClick }) {
  // text and onClick are props
}
```

**JSX**
- HTML-like syntax in JavaScript
- Compiles to `React.createElement()` calls
- Curly braces `{}` for JavaScript expressions

```jsx
function Greeting({ name, count }) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>Count: {count}</p>
      {count > 5 && <p>High count!</p>}
    </div>
  );
}
```

---

### React Hooks

**useState** - Component state
```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```
- `useState(initialValue)` returns `[state, setState]`
- Calling `setState` triggers re-render
- Each component instance has its own state

**useEffect** - Side effects (API calls, timers, subscriptions)
```jsx
import { useEffect, useState } from 'react';

function UserData({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // This runs after render
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(data => setUser(data));
  }, [userId]); // Dependency array: re-run when userId changes
  
  return <div>{user?.name}</div>;
}
```
- Runs after component renders
- Dependency array controls when it re-runs:
  - `[]` - runs once on mount
  - `[userId]` - re-run when userId changes
  - No array - re-run after every render (avoid!)

**useContext** - Read global state
```jsx
import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';

function Button() {
  const { theme } = useContext(ThemeContext);
  return <button className={theme === 'dark' ? 'btn-dark' : 'btn-light'}>Click</button>;
}
```
- Access data from Context without prop drilling
- Component re-renders when context value changes

---

## Context API

**What it is**: A way to share data across many components without passing props through each level.

**Problem it solves**:
```jsx
// Without context (prop drilling - tedious!)
<App>
  <Layout theme={theme}>
    <Sidebar theme={theme}>
      <NavItem theme={theme} />
    </Sidebar>
  </Layout>
</App>

// With context (clean!)
<ThemeProvider>
  <App>
    <Layout>
      <Sidebar>
        <NavItem /> {/* Can access theme with useTheme() */}
      </Sidebar>
    </Layout>
  </App>
</ThemeProvider>
```

**How to create a context**:

1. Create and export the context:
```jsx
// ThemeContext.js
import { createContext } from 'react';

export const ThemeContext = createContext();
```

2. Create a provider component:
```jsx
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

3. Create a hook to access the context:
```jsx
export function useTheme() {
  return useContext(ThemeContext);
}
```

4. Wrap your app with the provider:
```jsx
<ThemeProvider>
  <App />
</ThemeProvider>
```

5. Use in any child component:
```jsx
function Button() {
  const { theme, setTheme } = useTheme();
  return <button className={theme}>Click</button>;
}
```

**In this project**:
- `TopicMapsProvider` - Fetches and caches topics, subtopics, visualizers
- `UIProvider` - Manages sidebar state, expanded topics
- `ThemeProvider` - Manages light/dark theme
- `SimulationProvider` - Manages algorithm simulation state

---

## React Router

**What it is**: Client-side routing. Changes URL and swaps components without reloading page.

**Basic routing**:
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/topics" element={<Topics />} />
        <Route path="/topics/:topicId" element={<TopicDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Dynamic routes** (URL parameters):
```jsx
// Route definition
<Route path="/topics/:topicId" element={<TopicDetail />} />

// In component
import { useParams } from 'react-router-dom';

function TopicDetail() {
  const { topicId } = useParams();
  // topicId will be "123" if URL is /topics/123
  return <div>Topic: {topicId}</div>;
}
```

**Navigation**:
```jsx
import { useNavigate } from 'react-router-dom';

function TopicCard({ topicId, topicAbbr }) {
  const navigate = useNavigate();
  
  return (
    <button onClick={() => navigate(`/${topicAbbr}/${topicId}`)}>
      View Topic
    </button>
  );
}
```

**Route matching** (this project):
- `/` → Home page
- `/topics` → All topics list
- `/topics/:topicId` → Topic detail
- `/:abbr` → Topic home (e.g., `/dsa` for Data Structures)
- `/:abbr/:slug` → Subtopic visualizer (e.g., `/dsa/arrays`)

---

## React Query (@tanstack/react-query)

**What it is**: Server state management. Caches API responses, handles loading/error states.

**Problem it solves**:
```jsx
// Without React Query (manual state management)
function UserList() {
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    setLoading(true);
    fetch('/api/users')
      .then(r => r.json())
      .then(data => { setUsers(data); setLoading(false); })
      .catch(err => { setError(err); setLoading(false); });
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{users.map(u => <div key={u.id}>{u.name}</div>)}</div>;
}

// With React Query (one hook!)
function UserList() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json())
  });
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{users.map(u => <div key={u.id}>{u.name}</div>)}</div>;
}
```

**Setup**:
```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

**Basic usage**:
```jsx
import { useQuery } from '@tanstack/react-query';

function Topics() {
  const { data: topics, isLoading, error } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const response = await fetch('/api/topics');
      return response.json();
    }
  });
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error!</div>;
  
  return (
    <ul>
      {topics.map(topic => (
        <li key={topic.id}>{topic.label}</li>
      ))}
    </ul>
  );
}
```

**Caching**: React Query automatically caches results. If you query the same data again, it returns cached data instead of making another API call.

---

## CSS Modules

**What it is**: CSS files scoped to a single component to avoid naming conflicts.

**Problem it solves**:
```css
/* Without CSS Modules - conflicts! */
.button { /* Which button? */
  padding: 10px;
}
```

**With CSS Modules**:
```jsx
// Button.jsx
import styles from './Button.module.css';

export function Button({ variant }) {
  return <button className={styles.button}>Click</button>;
}
```

```css
/* Button.module.css - scoped to Button component */
.button {
  padding: 10px;
}
```

```jsx
// Card.jsx
import styles from './Card.module.css';

export function Card() {
  return <div className={styles.button}>Card button</div>;
}
```

```css
/* Card.module.css - different .button, no conflict */
.button {
  padding: 5px;
}
```

**Multiple classes**:
```jsx
<button className={`${styles.button} ${styles.primary}`}>
  Click
</button>

// Or with conditional classes:
<button className={`${styles.button} ${variant === 'primary' ? styles.primary : styles.secondary}`}>
  Click
</button>
```

---

## Express.js (Backend)

**What it is**: Node.js framework for building REST APIs.

**Basic server**:
```js
import express from 'express';

const app = express();
const PORT = 4000;

// Middleware
app.use(express.json()); // Parse JSON bodies

// Routes
app.get('/api/topics', (req, res) => {
  res.json({ topics: [] });
});

app.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
});
```

**Routing**:
```js
const router = express.Router();

router.get('/', (req, res) => {
  // GET /api/topics
  res.json({ topics: [] });
});

router.get('/:id', (req, res) => {
  // GET /api/topics/123
  const { id } = req.params;
  res.json({ topic: { id } });
});

router.post('/', (req, res) => {
  // POST /api/topics
  const { name } = req.body;
  res.json({ created: { name } });
});

app.use('/api/topics', router);
```

**Error handling**:
```js
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});
```

---

## PostgreSQL (Database)

**What it is**: Relational database. Stores structured data in tables.

**Tables** (like spreadsheets):
```sql
CREATE TABLE topics (
  id SERIAL PRIMARY KEY,           -- Auto-incrementing ID
  label VARCHAR(255),              -- Text
  abbr VARCHAR(50) UNIQUE,         -- Unique abbreviation
  icon VARCHAR(50)                 -- Unicode emoji or icon
);

CREATE TABLE subtopics (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES topics(id),  -- Foreign key link
  name VARCHAR(255),
  slug VARCHAR(255),
  complexity JSONB,                -- JSON data
  explanation TEXT                 -- Long text
);
```

**Queries** (reading data):
```sql
SELECT * FROM topics;                          -- All topics
SELECT * FROM topics WHERE id = 1;             -- Specific topic
SELECT COUNT(*) FROM topics;                   -- Count rows
SELECT * FROM subtopics WHERE topic_id = 1;   -- Related rows
```

**Inserts** (adding data):
```sql
INSERT INTO topics (label, abbr, icon) 
VALUES ('Data Structures', 'dsa', '🧩');
```

**In Node.js**:
```js
import { pool } from './pool.js';

const result = await pool.query('SELECT * FROM topics');
console.log(result.rows); // Array of rows

const single = await pool.query('SELECT * FROM topics WHERE id = $1', [1]);
console.log(single.rows[0]); // One row
```

---

## Monorepo Pattern

**What it is**: Single repository with multiple packages (api, web) sharing dependencies.

**Benefits**:
- Shared dependencies (npm installs once)
- Easier code sharing between packages
- Single git history
- Coordinated versioning

**Structure**:
```
study-app/
├── package.json (workspaces: ["packages/*"])
├── packages/
│   ├── api/
│   │   ├── package.json (@study-app/api)
│   │   └── src/
│   └── web/
│       ├── package.json (@study-app/web)
│       └── src/
```

**Running scripts**:
```bash
npm run dev              # Runs in all packages
npm -w packages/api run dev    # Specific package
npm -w packages/web run dev    # Specific package
```

---

## Data Flow Concepts

### Unidirectional Flow (React Pattern)
```
User Action (click button)
    ↓
State Changes (useState)
    ↓
Component Re-renders
    ↓
UI Updates
```

### Async Data Flow (API + Context)
```
Component mounts
    ↓
useEffect triggers
    ↓
API call to backend
    ↓
Context updates state
    ↓
Component re-renders with data
```

### Global State via Context
```
Provider wraps entire app
    ↓
Context holds shared state
    ↓
Child components use useContext hook
    ↓
Multiple components access same data
    ↓
State change triggers re-render in all users
```

---

## Key Patterns Used in Project

### 1. Custom Hooks
Encapsulate logic in reusable functions:
```jsx
function useTopicMapsContext() {
  return useContext(TopicMapsContext);
}

// Used in components:
const { TOPICS, ABBR_MAP } = useTopicMapsContext();
```

### 2. Provider Pattern
Wrap app with context provider:
```jsx
<TopicMapsProvider>
  <ThemeProvider>
    <UIProvider>
      <App />
    </UIProvider>
  </ThemeProvider>
</TopicMapsProvider>
```

### 3. Lazy Loading with Suspense
Load code only when needed:
```jsx
const ArrayVisualizer = lazy(() => import('./ArrayVisualizer'));

<Suspense fallback={<Loading />}>
  <ArrayVisualizer />
</Suspense>
```

### 4. Controlled Components
Form inputs controlled by state:
```jsx
function SearchBox() {
  const [query, setQuery] = useState('');
  
  return (
    <input 
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}
```

### 5. Compound Components
Components that work together:
```jsx
<Card>
  <Card.Header title="Title" />
  <Card.Body>Content</Card.Body>
</Card>
```

---

## Error Handling

### React Error Boundary
Catches render errors:
```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong</div>;
    }
    return this.props.children;
  }
}

<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Try-Catch for Async
Catches promise rejections:
```jsx
useEffect(() => {
  async function fetchData() {
    try {
      const response = await fetch('/api/topics');
      const data = await response.json();
      setTopics(data);
    } catch (error) {
      console.error('Failed to fetch:', error);
      setError(error);
    }
  }
  fetchData();
}, []);
```

---

## Performance Concepts

### Memoization
Prevent unnecessary re-renders:
```jsx
import { memo } from 'react';

const Button = memo(function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
});
```
Component only re-renders if props change.

### Code Splitting
Load code only when route is visited:
```jsx
const Home = lazy(() => import('./pages/Home'));
const Topics = lazy(() => import('./pages/Topics'));

<Route path="/" element={<Home />} />
<Route path="/topics" element={<Topics />} />
```

### Key Prop in Lists
Helps React identify which items changed:
```jsx
{topics.map(topic => (
  <TopicCard key={topic.id} topic={topic} />
))}
```
Without `key`, React might re-render all items on list change.

---

## Testing Concepts

### Unit Tests
Test a single component or function:
```jsx
test('Button renders with text', () => {
  render(<Button>Click</Button>);
  expect(screen.getByText('Click')).toBeInTheDocument();
});
```

### Integration Tests
Test components working together:
```jsx
test('Clicking button shows modal', () => {
  render(<ModalButton />);
  fireEvent.click(screen.getByText('Open'));
  expect(screen.getByText('Modal content')).toBeInTheDocument();
});
```

### Async Tests
Test API calls and async behavior:
```jsx
test('Fetches and displays topics', async () => {
  render(<TopicsList />);
  expect(await screen.findByText('Arrays')).toBeInTheDocument();
});
```
