# Documentation Map

Complete index of all documentation files. Start here to understand the codebase.

---

## Reading Order

### 🚀 Get Started (5 min)
1. **[QUICK_START.md](QUICK_START.md)** - Project structure, common tasks, debugging
   - Setup and running instructions
   - Folder layout cheat sheet
   - Common development tasks
   - Keyboard shortcuts

### 🏗️ Understand Architecture (15 min)
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - How everything fits together
   - Monorepo structure
   - Tech stack overview
   - Backend services (Express, PostgreSQL)
   - Frontend architecture
   - Routing & state management
   - Development workflow

### 📁 Learn File Types (10 min)
3. **[FILE_TYPES.md](FILE_TYPES.md)** - What each file does
   - Component types (.jsx)
   - Styling (CSS Modules)
   - Context files
   - Configuration files (.json, .env)
   - Database files

### 💡 Master Concepts (20 min)
4. **[CONCEPTS.md](CONCEPTS.md)** - Technical deep dives
   - React fundamentals (components, hooks, JSX)
   - Context API
   - React Router
   - React Query
   - CSS Modules
   - Express.js
   - PostgreSQL
   - Error handling
   - Testing

### 🗄️ Understand Data (15 min)
5. **[DATA_MODEL.md](DATA_MODEL.md)** - How data flows
   - Database schema
   - API response shapes
   - Context structures
   - Frontend data access patterns
   - Common queries & examples

---

## Quick Lookups

### "How do I...?"

**Add a new page**
→ [QUICK_START.md](QUICK_START.md#adding-a-new-page)

**Add a shared component**
→ [QUICK_START.md](QUICK_START.md#adding-a-new-shared-component)

**Fetch data from API**
→ [QUICK_START.md](QUICK_START.md#fetching-data-from-api)

**Use global state**
→ [QUICK_START.md](QUICK_START.md#using-global-state)

**Style a component**
→ [QUICK_START.md](QUICK_START.md#styling-a-component)

**Add a backend route**
→ [QUICK_START.md](QUICK_START.md#adding-a-backend-route)

**Navigate programmatically**
→ [QUICK_START.md](QUICK_START.md#navigating-programmatically)

**Debug an issue**
→ [QUICK_START.md](QUICK_START.md#debugging)

---

### "What is...?"

**Context API**
→ [CONCEPTS.md](CONCEPTS.md#context-api)

**React Hooks**
→ [CONCEPTS.md](CONCEPTS.md#react-hooks)

**React Router**
→ [CONCEPTS.md](CONCEPTS.md#react-router)

**React Query**
→ [CONCEPTS.md](CONCEPTS.md#react-query)

**CSS Modules**
→ [CONCEPTS.md](CONCEPTS.md#css-modules)

**Monorepo**
→ [CONCEPTS.md](CONCEPTS.md#monorepo-pattern)

**Data flow**
→ [DATA_MODEL.md](DATA_MODEL.md#how-data-flows-through-the-app)

---

### "Where is...?"

**The routing config**
→ [ARCHITECTURE.md](ARCHITECTURE.md#routing-architecture) and `packages/web/src/App.jsx`

**The API server**
→ `packages/api/src/index.js`

**The database queries**
→ `packages/api/src/db/queries/`

**The global state**
→ `packages/web/src/core/context/`

**The UI components**
→ `packages/web/src/components/shared/`

**The pages**
→ `packages/web/src/pages/`

**The styling**
→ `**/*.module.css` files

**The API client**
→ `packages/web/src/core/api/`

---

## File Index

### Root Documentation
- `ARCHITECTURE.md` - System architecture & design
- `FILE_TYPES.md` - File types and purposes
- `CONCEPTS.md` - Technical concepts explained
- `DATA_MODEL.md` - Data structures and flows
- `QUICK_START.md` - Common tasks & quick reference
- `README_DOCS.md` - This file

### Backend (packages/api)
- `src/index.js` - Server entry point
- `src/routes/` - API endpoints
- `src/db/queries/` - Database queries
- `src/db/pool.js` - Database connection pooling
- `src/db/migrate.js` - Schema setup
- `src/db/seed.js` - Initial data
- `src/middleware/` - Middleware (CORS, error handling)
- `.env` - Environment variables

### Frontend (packages/web)
- `src/App.jsx` - Routes & provider setup
- `src/main.jsx` - Entry point
- `src/pages/` - Page components
  - `Home/` - Landing page
  - `Topics/` - Topic listing & detail
  - `Visualizer/` - Algorithm visualizations
  - etc.
- `src/components/` - UI components
  - `layout/` - Page structure (Navbar, Sidebar, etc.)
  - `shared/` - Reusable UI (Button, Card, Badge, etc.)
  - `visualizers/` - Algorithm visualizers
  - `renderers/` - Content renderers
- `src/core/` - Business logic
  - `context/` - Global state (TopicMaps, UI, Theme, etc.)
  - `api/` - API client
  - `topics/` - URL builders
- `**/*.module.css` - Component styles
- `index.css` - Global styles
- `vite.config.js` - Build configuration

### Configuration
- `package.json` (root) - Monorepo config
- `packages/api/package.json` - Backend dependencies
- `packages/web/package.json` - Frontend dependencies
- `Makefile` - Development shortcuts

---

## Key Concepts Summary

### Architecture Pattern
```
User Interaction (browser)
    ↓
React Component
    ↓
API Call (fetch)
    ↓
Express Backend
    ↓
PostgreSQL Database
    ↓
Response JSON
    ↓
Context Update
    ↓
Component Re-render
```

### State Management
- **Server State** - API responses (cached in context)
- **UI State** - Sidebar expanded, modal open (UIContext)
- **Component State** - Form input, local toggle (useState)
- **Theme State** - Light/dark mode (ThemeContext)
- **Simulation State** - Algorithm steps (SimulationContext)

### Data Flow
- **Down**: Props passed from parent to child
- **Up**: Event callbacks pass user actions to parent
- **Global**: Context providers share data across components
- **Async**: API calls fetch server data into context

### Component Hierarchy
```
App (main entry)
├── QueryClientProvider
├── BrowserRouter
├── ErrorBoundary
├── ThemeProvider
├── UIProvider
└── TopicMapsProvider
    └── AppRoutes
        └── MainLayout
            ├── Navbar
            ├── Sidebar
            └── Routes
                ├── Home
                ├── Topics
                ├── VisualizerPage
                └── ...
```

---

## Tech Stack at a Glance

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI library |
| React Router 7 | Client-side routing |
| React Query 5 | Server state management |
| Vite 8 | Build & dev server |
| CSS Modules | Component styling |

### Backend
| Technology | Purpose |
|------------|---------|
| Express.js | REST API framework |
| Node.js | JavaScript runtime |
| PostgreSQL | Relational database |
| pg 8 | PostgreSQL client |
| CORS | Cross-origin requests |

---

## Common Development Tasks

| Task | Location | Doc |
|------|----------|-----|
| Add page | `src/pages/` → Add route in `App.jsx` | [QUICK_START](QUICK_START.md#adding-a-new-page) |
| Add component | `src/components/shared/` | [QUICK_START](QUICK_START.md#adding-a-new-shared-component) |
| Fetch API data | `src/core/context/` or component `useEffect` | [QUICK_START](QUICK_START.md#fetching-data-from-api) |
| Use global state | Any component with `useTopicMapsContext()` | [QUICK_START](QUICK_START.md#using-global-state) |
| Style component | Create `.module.css` alongside `.jsx` | [QUICK_START](QUICK_START.md#styling-a-component) |
| Add API endpoint | `src/routes/` → `src/db/queries/` | [QUICK_START](QUICK_START.md#adding-a-backend-route) |
| Add to database | `src/db/seed.js` or SQL | [DATA_MODEL](DATA_MODEL.md#adding-new-data) |
| Debug issue | Check console, DevTools, network tab | [QUICK_START](QUICK_START.md#debugging) |

---

## Learning Path

### Week 1: Fundamentals
- Read QUICK_START.md (15 min)
- Read ARCHITECTURE.md (20 min)
- Read CONCEPTS.md (30 min)
- Try: Add a simple component

### Week 2: Frontend
- Read FILE_TYPES.md (15 min)
- Read DATA_MODEL.md (20 min)
- Try: Add a new page
- Try: Use global state in component

### Week 3: Backend
- Study `packages/api/src/routes/` (15 min)
- Study `packages/api/src/db/queries/` (15 min)
- Try: Add a new API endpoint
- Try: Add data to database

### Week 4: Full Stack
- Integrate new endpoint with frontend
- Add form to collect data
- Save to database
- Display in UI
- Debug any issues

---

## Debugging Checklist

**Component not rendering**
- [ ] Check Console for errors
- [ ] Check browser DevTools for React errors
- [ ] Verify component is exported/imported
- [ ] Check route is defined in App.jsx
- [ ] Verify context provider wraps component

**API not working**
- [ ] Check API is running on port 4000
- [ ] Check endpoint is registered in routes
- [ ] Check CORS is configured
- [ ] Test endpoint with curl: `curl http://localhost:4000/api/...`
- [ ] Check database connection in .env

**Data not displaying**
- [ ] Check API returns correct JSON
- [ ] Verify context value contains data
- [ ] Check component accesses context correctly
- [ ] Check for console errors
- [ ] Verify data structure (object vs array, etc.)

**Styling not working**
- [ ] Check .module.css file exists
- [ ] Verify import path is correct
- [ ] Check class name is exported from CSS module
- [ ] Verify className uses styles object
- [ ] Check for typos in class names

---

## Resources

### Official Documentation
- [React Documentation](https://react.dev)
- [React Router Documentation](https://reactrouter.com)
- [TanStack React Query](https://tanstack.com/query/latest)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Vite Documentation](https://vitejs.dev/)

### Tutorials
- [React Tutorial](https://react.dev/learn)
- [React Hooks Guide](https://react.dev/reference/react)
- [Context API Guide](https://react.dev/learn/passing-data-deeply-with-context)
- [React Router Tutorial](https://reactrouter.com/en/main/start/tutorial)

### Tools
- [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/) - Browser extension
- [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/) - Browser extension
- [Postman](https://www.postman.com/) - API testing
- [DBeaver](https://dbeaver.io/) - Database GUI

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid hook call" | Hook called outside component or in loop | Move hook to top of component |
| "Objects are not valid as React child" | Rendering object directly | Extract property: `{obj.name}` not `{obj}` |
| "Cannot GET /path" | Route not defined | Check route in App.jsx and backend |
| "Context undefined" | Context not used inside provider | Wrap with provider, check import |
| "Cannot find module" | Wrong import path | Check file exists, verify path |
| "Port already in use" | Another process using port | Kill process or change PORT in .env |
| "Database connection failed" | Invalid DATABASE_URL | Check .env file, verify PostgreSQL running |

---

## Useful Commands

```bash
# Start development servers
npm run dev

# Start only API
npm run dev:api

# Start only frontend
npm run dev:web

# Setup database
npm run migrate && npm run seed

# Build for production
npm run build:web

# Run tests
npm run test:web
npm run test:api

# View git status
git status

# Check running processes
lsof -i :4000   # Check port 4000
lsof -i :5175   # Check port 5175

# PostgreSQL commands
psql -d study_app -c "SELECT * FROM topics;"
psql -d study_app       # Interactive shell
```

---

## Next Steps

1. **Just starting?** → Read [QUICK_START.md](QUICK_START.md)
2. **Want to understand architecture?** → Read [ARCHITECTURE.md](ARCHITECTURE.md)
3. **Adding a feature?** → Check [QUICK_START.md](QUICK_START.md#common-tasks)
4. **Debugging an issue?** → Check [QUICK_START.md](QUICK_START.md#debugging)
5. **Understanding data?** → Read [DATA_MODEL.md](DATA_MODEL.md)
6. **Learning concepts?** → Read [CONCEPTS.md](CONCEPTS.md)

---

## Questions?

**About code structure?** → [ARCHITECTURE.md](ARCHITECTURE.md)

**About file types?** → [FILE_TYPES.md](FILE_TYPES.md)

**About how to do something?** → [QUICK_START.md](QUICK_START.md)

**About a concept?** → [CONCEPTS.md](CONCEPTS.md)

**About data flow?** → [DATA_MODEL.md](DATA_MODEL.md)

**About everything else?** → Check the specific file mentioned in each section

---

Happy coding! 🚀
