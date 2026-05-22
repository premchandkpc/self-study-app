# Data Model & Relationships

Complete guide to how data flows through the study-app.

---

## Database Schema (PostgreSQL)

### topics table
```sql
CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  label VARCHAR(255) NOT NULL,           -- e.g., "Data Structures"
  abbr VARCHAR(50) NOT NULL UNIQUE,      -- e.g., "dsa"
  icon VARCHAR(50),                       -- e.g., "🧩"
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Example rows**:
```
| id | label                  | abbr  | icon  |
|----|------------------------|-------|-------|
| 1  | Data Structures        | dsa   | 🧩    |
| 2  | Java Fundamentals      | java  | ☕    |
| 3  | Kafka & Streaming      | kafka | 📨    |
```

---

### subtopics table
```sql
CREATE TABLE subtopics (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  name VARCHAR(255) NOT NULL,            -- e.g., "Arrays"
  slug VARCHAR(255) UNIQUE,              -- e.g., "arrays"
  scenario_id VARCHAR(255),              -- e.g., "array-scenario-1"
  complexity JSONB,                      -- { "time": "O(n)", "space": "O(1)" }
  explanation TEXT,                      -- Long description
  use_cases TEXT[],                      -- Array of use cases
  visualizer JSONB,                      -- Visualization config
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Example rows**:
```
| id | topic_id | name     | slug    | scenario_id | complexity              |
|----|----------|----------|---------|-------------|-------------------------|
| 1  | 1        | Arrays   | arrays  | array-1     | {"time":"O(n)",...}     |
| 2  | 1        | LinkedLi | linked  | linked-1    | {"time":"O(1)",...}     |
| 3  | 2        | Generics | generics| java-gen-1  | {"time":"N/A",...}      |
```

---

### topic_meta table
```sql
CREATE TABLE topic_meta (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER UNIQUE REFERENCES topics(id),
  description TEXT,                      -- Topic description
  color VARCHAR(50),                     -- e.g., "blue", "purple"
  objectives JSONB,                      -- Learning objectives array
  key_topics JSONB                       -- Key concepts array
);
```

---

## Data Relationships

```
topics (1) ─── (many) subtopics
  ▲
  │
  └── topic_meta (1:1)
```

- **One topic has many subtopics**
- **One topic has one meta record**
- **Each subtopic belongs to one topic**

---

## API Response Shape

### GET /api/maps

Returns the complete data model in one response:

```json
{
  "TOPICS": [
    {
      "id": 1,
      "label": "Data Structures",
      "abbr": "dsa",
      "icon": "🧩",
      "subtopics": [
        {
          "id": 1,
          "name": "Arrays",
          "slug": "arrays",
          "scenarioId": "array-scenario-1",
          "complexity": {
            "time": "O(n)",
            "space": "O(1)"
          },
          "useCases": ["Caching", "Dynamic allocations"],
          "explanation": "An array is...",
          "visualizer": { /* config */ }
        },
        {
          "id": 2,
          "name": "Linked Lists",
          "slug": "linked-lists",
          ...
        }
      ],
      "meta": {
        "desc": "Arrays, Linked Lists, Stacks, Queues...",
        "color": "blue",
        "objectives": ["Understand time complexity", ...],
        "keyTopics": ["Big O Notation", ...]
      }
    },
    // more topics...
  ],
  
  "ABBR_MAP": {
    "dsa": {
      "id": 1,
      "subtopics": [
        { "name": "Arrays", "slug": "arrays", ... },
        { "name": "Linked Lists", "slug": "linked-lists", ... },
        ...
      ]
    },
    "java": { ... },
    "kafka": { ... },
    ...
  },
  
  "VISUALIZER_MAP": {
    "1:Arrays": true,
    "1:Linked Lists": true,
    "2:Generics": false,
    ...
  },
  
  "SUBTOPIC_SCENARIO_ID": {
    "1:Arrays": "array-scenario-1",
    "1:Linked Lists": "linked-scenario-1",
    ...
  },
  
  "TOPIC_META": {
    "1": {
      "desc": "...",
      "color": "blue",
      "objectives": [...],
      "keyTopics": [...]
    },
    "2": { ... },
    ...
  }
}
```

---

## How Data Flows Through the App

### 1. Initial Page Load

```
Browser navigates to http://localhost:5175
    ↓
App.jsx mounts
    ↓
TopicMapsProvider initializes
    ↓
useEffect calls fetch('http://localhost:4000/api/maps')
    ↓
Express backend receives GET /api/maps request
    ↓
Queries PostgreSQL for all tables
    ↓
Builds TOPICS, ABBR_MAP, VISUALIZER_MAP, etc.
    ↓
Returns JSON response to browser
    ↓
TopicMapsContext updates with data
    ↓
All child components receive data via useTopicMapsContext()
    ↓
Pages render with topic information
```

---

### 2. User Clicks on a Topic

```
User clicks topic in sidebar
    ↓
Sidebar calls navigate(`/${topic.abbr}`)
    ↓
React Router changes URL (e.g., /dsa)
    ↓
VisualizerPage component mounts
    ↓
useParams() extracts abbr from URL
    ↓
Component uses ABBR_MAP[abbr] to get topic data
    ↓
Renders TopicDetail page with subtopics
    ↓
User can click on subtopic to view visualizer
```

---

### 3. Displaying Subtopic Visualizer

```
User clicks "Arrays" subtopic
    ↓
SubtopicCard navigates to /:abbr/:slug (e.g., /dsa/arrays)
    ↓
VisualizerPage mounts with abbr='dsa', slug='arrays'
    ↓
Uses VISUALIZER_MAP["1:Arrays"] to check if viz exists
    ↓
Uses SUBTOPIC_SCENARIO_ID["1:Arrays"] to get scenario ID
    ↓
Loads ArrayVisualizer component
    ↓
Visualizer renders interactive algorithm UI
    ↓
User steps through algorithm, sees data structure changes
```

---

## Data Structures in Context

### TopicMapsContext
```jsx
const value = {
  TOPICS: [
    {
      id: 1,
      label: "Data Structures",
      abbr: "dsa",
      icon: "🧩",
      subtopics: [{name, slug, scenarioId, ...}],
      meta: {desc, color, objectives, keyTopics}
    },
    ...
  ],
  
  ABBR_MAP: {
    dsa: {id, subtopics},
    java: {id, subtopics},
    ...
  },
  
  VISUALIZER_MAP: {
    "topicId:SubtopicName": true|false,
    ...
  },
  
  SUBTOPIC_SCENARIO_ID: {
    "topicId:SubtopicName": "scenario-id",
    ...
  },
  
  TOPIC_META: {
    topicId: {desc, color, objectives, keyTopics},
    ...
  }
}
```

Used by components:
```jsx
// Access all topics
const { TOPICS } = useTopicMapsContext();
TOPICS.map(t => t.label)

// Quick lookup by abbreviation
const { ABBR_MAP } = useTopicMapsContext();
ABBR_MAP['dsa'].subtopics  // Get subtopics for DSA topic

// Check if visualizer exists
const { VISUALIZER_MAP } = useTopicMapsContext();
if (VISUALIZER_MAP['1:Arrays']) {
  // Show "Simulate" button
}

// Get scenario ID for visualizer
const { SUBTOPIC_SCENARIO_ID } = useTopicMapsContext();
const scenarioId = SUBTOPIC_SCENARIO_ID['1:Arrays'];

// Get topic metadata
const { TOPIC_META } = useTopicMapsContext();
const meta = TOPIC_META[1];  // desc, color, objectives
```

---

### UIContext
```jsx
const value = {
  state: {
    expandedTopics: {
      1: true,  // Topic ID 1 is expanded in sidebar
      2: false,
      3: true
    },
    sidebarMode: 'all-topics' | 'current-topic' | 'hidden'
  },
  
  actions: {
    toggleTopicExpand: (topicId) => {...},
    setSidebarMode: (mode) => {...}
  }
}
```

Used by components:
```jsx
const { state, actions } = useUI();

// Show/hide subtopics in sidebar
{state.expandedTopics[topicId] && (
  <SubtopicsList subtopics={topic.subtopics} />
)}

// Toggle on button click
<button onClick={() => actions.toggleTopicExpand(topicId)}>
  {state.expandedTopics[topicId] ? '▼' : '▶'}
</button>
```

---

### ThemeContext
```jsx
const value = {
  currentTheme: 'light' | 'dark' | 'auto',
  setTheme: (theme) => {...}
}
```

---

### SimulationContext
Used in visualizers to manage algorithm steps:
```jsx
const value = {
  state: {
    currentStep: 0,
    array: [2, 1, 5, 3],
    highlightedIndices: [0, 1],
    speed: 1
  },
  
  actions: {
    nextStep: () => {...},
    prevStep: () => {...},
    togglePlay: () => {...},
    setSpeed: (speed) => {...},
    reset: () => {...}
  }
}
```

---

## Database Queries

### Get all topics with subtopics
```sql
SELECT 
  t.id, t.label, t.abbr, t.icon,
  json_agg(
    json_build_object(
      'id', s.id,
      'name', s.name,
      'slug', s.slug,
      'scenarioId', s.scenario_id,
      'complexity', s.complexity,
      'explanation', s.explanation,
      'useCases', s.use_cases
    )
  ) as subtopics
FROM topics t
LEFT JOIN subtopics s ON t.id = s.topic_id
GROUP BY t.id, t.label, t.abbr, t.icon;
```

### Get topic metadata
```sql
SELECT 
  tm.topic_id,
  tm.description as desc,
  tm.color,
  tm.objectives,
  tm.key_topics as keyTopics
FROM topic_meta tm;
```

### Check if visualizer exists
```sql
SELECT topic_id, name, COUNT(*) > 0 as has_visualizer
FROM subtopics
WHERE visualizer IS NOT NULL
GROUP BY topic_id, name;
```

---

## Frontend Data Access Patterns

### Pattern 1: Access via context
```jsx
function TopicsList() {
  const { TOPICS } = useTopicMapsContext();
  
  return (
    <ul>
      {TOPICS.map(topic => (
        <li key={topic.id}>{topic.label}</li>
      ))}
    </ul>
  );
}
```

### Pattern 2: URL-based lookup
```jsx
function VisualizerPage() {
  const { abbr, slug } = useParams();
  const { ABBR_MAP } = useTopicMapsContext();
  
  const topic = ABBR_MAP[abbr];
  const subtopic = topic.subtopics.find(s => s.slug === slug);
  
  return <div>{subtopic.name}</div>;
}
```

### Pattern 3: Quick check with maps
```jsx
function SubtopicCard({ topicId, subtopicName }) {
  const { VISUALIZER_MAP, SUBTOPIC_SCENARIO_ID } = useTopicMapsContext();
  
  const vizKey = `${topicId}:${subtopicName}`;
  const hasViz = !!VISUALIZER_MAP[vizKey];
  const scenarioId = SUBTOPIC_SCENARIO_ID[vizKey];
  
  return (
    <Card>
      <h3>{subtopicName}</h3>
      {hasViz && (
        <Button onClick={() => navigate(`/simulate/${scenarioId}`)}>
          Simulate
        </Button>
      )}
    </Card>
  );
}
```

---

## Data Update Flow

### When data changes (e.g., new topic added)

```
API receives POST /api/topics
    ↓
Inserts into PostgreSQL
    ↓
Frontend needs to refresh
    ↓
Call React Query refetch (if using useQuery)
    ↓
Calls /api/maps again
    ↓
TopicMapsContext updates
    ↓
All components using context automatically re-render
```

---

## Performance Considerations

### Why consolidate into /api/maps?
Instead of making multiple API calls:
```jsx
// Inefficient: Multiple requests
const topics = await fetch('/api/topics');
const meta = await fetch('/api/topic-meta');
const visualizers = await fetch('/api/visualizers');
```

We make one request:
```jsx
// Efficient: Single request
const maps = await fetch('/api/maps');
const { TOPICS, TOPIC_META, VISUALIZER_MAP } = maps;
```

**Benefits**:
- Single network roundtrip
- Data already joined
- Easier to cache
- Faster initial load

### Caching Strategy
- TopicMapsContext fetches once on app mount
- Data cached in context for duration of session
- No need to refetch for navigation between topics
- Refresh only on data mutation (add/edit/delete topic)

---

## Common Data Access Patterns

### Get all subtopics for a topic
```jsx
const { ABBR_MAP } = useTopicMapsContext();
const subtopics = ABBR_MAP['dsa'].subtopics;
```

### Get a single subtopic
```jsx
const { TOPICS } = useTopicMapsContext();
const topic = TOPICS.find(t => t.id === 1);
const subtopic = topic.subtopics.find(s => s.slug === 'arrays');
```

### Check if topic has visualizers
```jsx
const { VISUALIZER_MAP } = useTopicMapsContext();
const hasVisualizers = Object.keys(VISUALIZER_MAP)
  .filter(key => key.startsWith('1:'))
  .length > 0;
```

### Get metadata for a topic
```jsx
const { TOPIC_META } = useTopicMapsContext();
const meta = TOPIC_META[1];
console.log(meta.color, meta.objectives, meta.keyTopics);
```

---

## Adding New Data

### Add a new topic
1. In PostgreSQL, insert into `topics` table
2. Add metadata to `topic_meta` table
3. Add subtopics to `subtopics` table
4. Restart API (will rebuild maps)
5. Frontend automatically gets data on next page load

### Example SQL
```sql
-- Add topic
INSERT INTO topics (label, abbr, icon) 
VALUES ('System Design', 'sd', '🏗️');

-- Get the ID
SELECT id FROM topics WHERE abbr = 'sd';  -- Returns 4

-- Add metadata
INSERT INTO topic_meta (topic_id, description, color, objectives)
VALUES (4, 'Learn system design...', 'yellow', '["Design scalable systems", ...]');

-- Add subtopic
INSERT INTO subtopics (topic_id, name, slug)
VALUES (4, 'Load Balancing', 'load-balancing');
```

---

## Testing Data Access

### Check if context has data
```jsx
function DebugComponent() {
  const maps = useTopicMapsContext();
  console.log('Topics:', maps.TOPICS);
  console.log('Maps:', maps);
}
```

### Verify API response
```bash
curl http://localhost:4000/api/maps | jq '.TOPICS[0]'
```

### Check database directly
```bash
psql -d study_app -c "SELECT * FROM topics;"
```

---

## Debugging Data Issues

**"Topic not found" error**
- Check URL parameters match topic abbr/slug
- Verify data loaded in TOPICS array
- Check browser console for API errors

**"Visualizer not showing"**
- Check VISUALIZER_MAP contains topicId:subtopicName key
- Check scenario_id in database
- Verify visualizer component imported

**"Subtitle not displaying"**
- Check subtopic is object, not string
- Use subtopic.name, not subtopic
- Check key in map function is unique (slug or name)

**Context returning undefined**
- Check context provider wraps component
- Verify useTopicMapsContext imported correctly
- Check context value set before component renders
