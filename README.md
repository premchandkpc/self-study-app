# Self-Study App

Comprehensive interactive visualization platform for learning algorithms, data structures, system design, and cloud technologies through animated scenarios.

## Features

### 36+ Visualizers
- **Data Structures**: Array, LinkedList, HashMap, Set, String, Matrix
- **Algorithms**: Sorting, Dynamic Programming, Graph, Backtracking, Union-Find, Trie
- **System Design**: Uber, Microservices, SystemDesign
- **Cloud & Infrastructure**: AWS, Docker, Kubernetes, Networking
- **Languages & Frameworks**: Java (Collections, Streams, JVM), Spring, Python, Go
- **Distributed Systems**: Concurrency, Threading, Kafka, Redis
- **OS Concepts**: OS fundamentals
- **AI/ML**: AI visualization (experimental)

### Learning Modes
- **Interactive Visualizers**: Step-through animations with detailed explanations
- **Interview Mode**: Practice with comprehensive Q&A for each topic
- **Code Compiler**: Run and execute code snippets
- **Dark/Light Theme**: Comfortable learning environment

## Project Structure

```
├── README.md                 # This file
├── AGENTS.md                 # Communication style guide
├── Makefile                  # Build/run commands
├── opencode.json             # Project metadata
├── react-study-app/          # Main React application
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── layout/      # MainLayout, navigation
│   │   │   ├── visualizers/ # 36+ visualizer components
│   │   │   └── shared/      # Reusable UI components
│   │   ├── core/            # Utilities, context, hooks
│   │   ├── pages/           # Home, Topics, Visualizer, Interview, Compiler
│   │   └── styles/          # Global styles
│   └── README.md            # Setup and development guide
```

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
cd react-study-app
npm install
```

### Development

```bash
npm run dev
```
Opens at `http://localhost:5173` with hot module reloading.

### Build

```bash
npm run build
npm run preview
```

## Visualizers Overview

### Data Structures
- **Array**: Indexing, iteration, manipulation
- **LinkedList**: Node traversal, insertion, deletion
- **HashMap**: Hash collision handling, load factor, rehashing
- **Set**: Uniqueness constraints, operations
- **String**: Character manipulation, immutability
- **Matrix**: 2D array operations, transformations

### Algorithms
- **Sorting**: Bubble, Selection, Insertion, Merge, Quick, Heap (with complexity analysis)
- **Dynamic Programming**: Fibonacci, Knapsack, LCS, Coin Change
- **Graph**: BFS, DFS, Dijkstra, Bellman-Ford
- **Backtracking**: N-Queens, Sudoku, Permutations
- **Union-Find**: Path compression, union by rank, Kruskal MST
- **Trie**: Prefix tree, autocomplete scenarios

### System Design
- **Uber**: Ride-matching, location services, ranking
- **Microservices**: Service communication, load balancing
- **System Design**: Scalability, caching, database patterns

### Infrastructure & Cloud
- **AWS**: EC2, S3, Route 53, Step Functions, ECS
- **Docker**: Containerization concepts
- **Kubernetes**: Pod management, DNS, etcd, sidecars
- **Redis**: Data structures, caching strategies
- **Kafka**: Producer, consumer, topics, partitioning
- **Networking**: Protocols, TCP/IP, DNS

### Language-Specific
- **Java**: Collections, Streams (with pipeline interview Q&A), JVM internals
- **Spring**: Dependency injection, AOP, annotations
- **Python**: Language features, data structures
- **Go**: Goroutines, channels, concurrency

## Key Features by Category

### Interactive Visualizations
Each visualizer includes:
- Step-by-step animation with playback controls
- State snapshots showing element transformations
- Operation logs with color-coded messages
- Code examples in relevant language
- Performance metrics (time/space complexity)

### Interview Mode
Comprehensive Q&A for each topic:
- 10+ questions per visualizer
- Detailed explanations covering edge cases
- Performance analysis and optimization strategies
- Real-world application examples
- Parallel and concurrent behavior discussion

### Code Compiler
Embedded code execution environment:
- Write and run code snippets
- Integrated with visualizers for learning reinforcement

## Technology Stack

- **Frontend**: React 19 + Vite
- **Routing**: React Router v7
- **Styling**: CSS with theme support
- **Build Tool**: Vite (fast HMR)
- **Linting**: ESLint
- **No Heavy Dependencies**: Minimal external libraries for learning clarity

## Development

### Available Scripts

```bash
npm run dev      # Start dev server (port 5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Adding a New Visualizer

1. Create directory: `src/components/visualizers/YourVisualizer/`
2. Create component file: `YourVisualizer.jsx`
3. Create scenarios file: `scenarios/yourscenario.js`
4. Register in visualizers index
5. Add route in pages/Visualizer/VisualizerPage.jsx

### Scenario Structure

```javascript
export const SCENARIOS = [{
  id: 'unique-id',
  label: 'Scenario Label',
  icon: '🎯',
  category: 'category-name',
  code: ['code', 'example'],
  language: 'Java',
  interview: {
    title: 'Interview Q&A',
    qa: [
      { q: 'Question?', a: 'Answer with depth.' }
    ]
  },
  build() {
    const steps = [];
    const state = { /* initial state */ };
    // Add snapshots via snap(steps, state, description, index)
    return steps;
  }
}];
```

## Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Home | Landing page |
| `/topics` | Topics | Browse by category |
| `/topics/:topicId` | Topics | Category details |
| `/visualizer/:type` | VisualizerPage | Interactive visualization |
| `/interview` | InterviewMode | Interview Q&A practice |
| `/compiler` | CompilerPage | Code execution |

## File Organization

- **components/visualizers/**: Each contains scenarios and visualizer logic
- **core/**: Shared utilities (snap function, context, hooks)
- **pages/**: Route components for major sections
- **components/shared/**: Reusable UI (buttons, inputs, layouts)
- **styles/**: Global CSS

## Performance Considerations

- **Lazy evaluation**: Visualizations deferred until needed
- **Minimal deps**: No heavy external libraries
- **Module bundling**: Vite handles code splitting
- **Hot Module Reload**: Fast development iteration
- **Tree-shaking**: Unused code removed in builds

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When adding visualizers:
- Include comprehensive scenarios with multiple edge cases
- Add interview Q&A (10+ questions minimum)
- Document code examples in relevant languages
- Include performance analysis (time/space complexity)
- Test with dark/light themes

## License

Self-study educational project

## Author

Prem Chandra Karnakanti

## Future Enhancements

- [ ] More distributed systems visualizers (Raft, Consensus)
- [ ] Machine learning algorithm animations
- [ ] Advanced system design scenarios
- [ ] Collaborative learning features
- [ ] Code challenge integration
