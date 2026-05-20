# React Study App

Interactive visualization platform for learning algorithms, data structures, and system design through animated step-by-step scenarios.

## Overview

This React application provides interactive visualizations with:
- 36+ visualizers across algorithms, data structures, system design, and infrastructure
- Step-by-step animations with state snapshots
- Comprehensive interview Q&A for each topic
- Interactive code compiler
- Dark/light theme support
- Responsive design

## Prerequisites

- Node.js 16 or higher
- npm 7+ or yarn 1.22+

## Quick Start

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Opens at `http://localhost:5173` with HMR (Hot Module Replacement).

### Build for Production

```bash
npm run build
```

Generates optimized build in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

Test production build locally at `http://localhost:4173`.

### Linting

```bash
npm lint
```

Runs ESLint to check code quality.

## Project Structure

```
src/
├── App.jsx                      # Main app component with routes
├── main.jsx                     # Entry point
├── App.css                      # App-level styles
├── index.css                    # Global styles
├── assets/                      # Static assets (images, fonts)
├── components/
│   ├── layout/
│   │   ├── MainLayout/          # Header, sidebar, footer
│   │   └── Navigation/          # Nav components
│   ├── visualizers/             # 36+ interactive visualizers
│   │   ├── SortingVisualizer/
│   │   ├── ArrayVisualizer/
│   │   ├── GraphVisualizer/
│   │   ├── JavaStreamsVisualizer/
│   │   ├── SystemDesignVisualizer/
│   │   └── ... (30+ more)
│   └── shared/
│       ├── AgentWidget/         # Floating assistant widget
│       ├── ScenarioViewer/      # Scenario animation display
│       ├── CodeBlock/           # Syntax-highlighted code
│       └── ... (more UI components)
├── core/
│   ├── context/
│   │   └── ThemeContext.jsx     # Dark/light theme
│   ├── utils/
│   │   ├── scenarioShared.js    # Snapshot creation (snap function)
│   │   └── ... (utilities)
│   └── hooks/                   # Custom React hooks
├── pages/
│   ├── Home/                    # Landing page
│   ├── Topics/                  # Category browsing
│   ├── Visualizer/              # Visualizer display page
│   ├── InterviewMode/           # Q&A practice
│   ├── Compiler/                # Code execution
│   └── NotFound/                # 404 page
└── styles/                      # CSS modules, theme files
```

## Routes

| Route | Component | Purpose |
| --- | --- | --- |
| `/` | Home | Landing page with featured topics |
| `/topics` | Topics | Browse all topics by category |
| `/topics/:topicId` | Topics | View topic details and scenarios |
| `/topics/system-design/uber` | UberDetail | Special case: Uber system design |
| `/visualizer/:type` | VisualizerPage | Interactive visualization player |
| `/interview` | InterviewMode | Interview Q&A practice |
| `/compiler` | CompilerPage | Code compiler/executor |
| `*` | NotFound | 404 error page |

## Visualizers

### Data Structures (9)
- Array, LinkedList, HashMap, Set, String, Matrix, Tree, Graph, Trie

### Algorithms (10)
- Sorting, Dynamic Programming, Graph Algorithms, Backtracking, Union-Find

### System Design & Architecture (3)
- Uber, Microservices, System Design patterns

### Cloud & Infrastructure (6)
- AWS, Docker, Kubernetes, Networking, Redis, Kafka

### Language-Specific (5)
- Java (Collections, Streams, JVM), Spring, Python, Go

### Distributed Systems & Concurrency (4)
- Concurrency, Threading, Distributed Systems, OS

## Key Components

### Visualizer Component Pattern

Each visualizer follows this structure:

```javascript
// src/components/visualizers/YourVisualizer/YourVisualizer.jsx
export default function YourVisualizer({ scenario }) {
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    setSteps(scenario.build());
  }, [scenario]);

  return (
    <div className="visualizer">
      {/* Visualization UI */}
      {/* Controls (play, pause, next, prev) */}
      {/* State display and operation logs */}
    </div>
  );
}
```

### Scenario Structure

```javascript
// src/components/visualizers/YourVisualizer/scenarios/yourscenario.js
export const SCENARIOS = [{
  id: 'scenario-id',
  label: 'Scenario Name',
  icon: '🎯',
  category: 'category-name',
  code: [
    'code line 1',
    'code line 2',
  ],
  language: 'Java',
  interview: {
    title: 'Interview Q&A',
    qa: [
      {
        q: 'What is the time complexity?',
        a: 'Detailed answer with reasoning...',
      },
      // More Q&A pairs...
    ],
  },
  build() {
    const steps = [];
    const state = {
      collectionType: 'array',
      elements: [],
      result: null,
      opsLog: [],
    };

    // Snapshot 0: Initial state
    snap(steps, state, 'Description of initial state', 0);

    // Modify state and create snapshots
    state.elements.push({ value: 1, state: 'idle' });
    snap(steps, state, 'After adding element', 1);

    return steps;
  },
}];
```

### Snapshot Function

```javascript
// From core/utils/scenarioShared.js
import { snap } from '@/core/utils/scenarioShared';

// Usage:
snap(steps, state, 'Step description', stepIndex);
// Creates a deep copy of state and stores it with description
```

## State Management

- **Theme Context**: Dark/light mode, persisted to localStorage
- **Local Component State**: useState for visualizer step tracking
- **URL Params**: React Router for page/visualizer selection
- **No Redux/Zustand**: Intentionally lightweight for learning focus

## Styling

- **CSS Modules**: Component-scoped styles in `src/styles/`
- **Global Theme**: Defined in ThemeContext
- **CSS Variables**: For consistent colors, spacing
- **Responsive**: Mobile-first approach with media queries

## Development Workflow

### Adding a New Visualizer

1. Create directory:
   ```bash
   mkdir -p src/components/visualizers/MyVisualizer/scenarios
   ```

2. Create visualizer component:
   ```javascript
   // src/components/visualizers/MyVisualizer/MyVisualizer.jsx
   export default function MyVisualizer({ scenario }) {
     // Implementation
   }
   ```

3. Create scenarios:
   ```javascript
   // src/components/visualizers/MyVisualizer/scenarios/myscenario.js
   export const SCENARIOS = [
     // Scenario definitions with interview Q&A
   ];
   ```

4. Register in index:
   ```javascript
   // src/pages/Visualizer/VisualizerPage.jsx
   import MyVisualizer from '...';
   // Add to visualizer registry
   ```

5. Add theme styles if needed:
   ```css
   /* src/styles/MyVisualizer.css */
   .my-visualizer { /* styles */ }
   ```

## Performance Optimization

- **Lazy Loading**: React Router uses dynamic imports
- **Minimal Dependencies**: React + React Router only
- **Efficient Rendering**: Controlled updates via useState
- **CSS Optimization**: Vite handles CSS code-splitting
- **Build Optimization**: Vite tree-shaking removes unused code

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Build Details

- **Bundler**: Vite (ES modules, instant HMR)
- **React Plugin**: @vitejs/plugin-react (SWC transpilation)
- **Target**: ES2020+ (modern browsers only)
- **Output**: Minified + gzipped production build

## Troubleshooting

### Port 5173 Already in Use
```bash
PORT=3000 npm run dev
```

### Build Errors
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### HMR Not Working
- Check firewall settings
- Restart dev server
- Clear browser cache

### Dark Mode Not Persisting
- Check browser localStorage permissions
- Open DevTools → Application → LocalStorage

## Contributing

When adding visualizers:
- Include multiple scenarios covering edge cases
- Add 10+ interview questions per scenario
- Document time/space complexity
- Test responsiveness on mobile
- Ensure dark/light theme compatibility
- Validate code examples execute correctly

## Technology Stack

| Tool | Purpose |
| --- | --- |
| React 19 | UI framework |
| React Router 7 | Client-side routing |
| Vite | Build tool & dev server |
| ESLint | Code quality |
| CSS | Styling (no CSS-in-JS) |

## Debugging

### React DevTools
- Install React DevTools browser extension
- Inspect component tree, props, state

### Vite DevTools
- Check browser console for HMR messages
- DevTools source maps enabled for debugging

### State Debugging
```javascript
// Add to visualizer component
useEffect(() => {
  console.log('Current step state:', steps[currentStep]);
}, [currentStep, steps]);
```

## Future Enhancements

- [ ] Code execution inside visualizers
- [ ] Collaborative/multiplayer learning
- [ ] Progress tracking & achievements
- [ ] Mobile-optimized visualizer controls
- [ ] WebGL-based large graph visualizations
- [ ] Accessibility improvements (keyboard navigation)

## Resources

- [React Documentation](https://react.dev)
- [React Router Documentation](https://reactrouter.com)
- [Vite Documentation](https://vitejs.dev)
- [ESLint Rules](https://eslint.org/docs/rules/)

## Support

For issues or questions:
1. Check existing issues in git history
2. Review visualizer scenarios for examples
3. Check AGENTS.md for communication style
4. Review similar visualizer implementations

## License

Educational project by Prem Chandra Karnakanti
