# Integration Guide: Legacy App → IR Platform

## Goal
Gradually integrate new IR-based platform architecture into existing StudyLab app without full rewrite.

## Phase 1: Event Tracking (Current)

### Step 1: Wrap Visualizer
```tsx
import { LegacyVisualizerBridge } from '@/core/integration/LegacyVisualizerBridge';

export function BinarySearchPage() {
  const eventBus = useEventBus(); // Inject from context

  return (
    <LegacyVisualizerBridge
      topicName="BinarySearch"
      conceptId="binary-search"
      eventBus={eventBus}
    >
      <BinarySearchVisualizer />
    </LegacyVisualizerBridge>
  );
}
```

### Step 2: Add Tracking Calls
```tsx
import { getBridgeContext } from '@/core/integration/LegacyVisualizerBridge';

function BinarySearchVisualizer() {
  const handlePlayClick = () => {
    const bridge = getBridgeContext();
    bridge?.trackInteraction('simulation_started');
  };

  const handleQuizSubmit = (score: number, maxScore: number) => {
    const bridge = getBridgeContext();
    bridge?.trackQuizSubmission(score, maxScore);
  };

  const requestHint = () => {
    const bridge = getBridgeContext();
    bridge?.trackHintRequested(1);
  };

  return (
    <div>
      <button onClick={handlePlayClick}>Play Simulation</button>
      <button onClick={requestHint}>Show Hint</button>
      <QuizComponent onSubmit={handleQuizSubmit} />
    </div>
  );
}
```

### Event Types Tracked

| Event | Fired When | Metadata |
|-------|-----------|----------|
| `topic_started` | User opens topic | topicName, timestamp |
| `scenario_started` | User starts simulation | scenarioName, parameters |
| `interaction` | User clicks/interacts | action type |
| `hint_requested` | User asks for hint | hint level |
| `quiz_submitted` | User submits quiz | score, percentage |
| `concept_mastered` | Score ≥80% | mastery level |
| `struggle_detected` | Multiple failures | reason, attempt count |
| `metric_recorded` | Custom metric | metricName, value |

## Phase 2: Analytics Dashboard

Once event tracking is in place, add analytics dashboard:

```tsx
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { useEventTracking } from '@/core/hooks/useEventTracking';

function StudyDashboard() {
  const metrics = useMasteryMetrics(); // Hook from analytics

  return (
    <div>
      <AnalyticsDashboard metrics={metrics} />
    </div>
  );
}
```

Shows:
- Total time spent
- Concepts attempted/mastered
- Success rate
- Mastery distribution
- Struggling concepts
- Personalized recommendations

## Phase 3: Recommendations

Display adaptive learning paths:

```tsx
import { RecommendationPanel } from '@/components/RecommendationPanel';

function TopicSelector() {
  const recommendations = useRecommendations(); // From RecommendationEngine

  return (
    <div>
      <RecommendationPanel recommendations={recommendations} />
    </div>
  );
}
```

User sees:
- Next recommended concept
- Learning path (prerequisites → target)
- Related concepts
- Estimated time

## Phase 4: Event Replay

Enable session replay:

```tsx
import { EventReplayUI } from '@/components/EventReplayUI';

function StudentAnalysis({ studentId }: { studentId: string }) {
  const session = useStudentSession(studentId); // Fetch recorded events

  return (
    <div>
      <EventReplayUI session={session} />
    </div>
  );
}
```

Instructors can:
- Play back student session
- Pause/seek to specific steps
- See where student struggled
- Understand misconceptions

## Integration Checklist

### For Each Topic/Visualizer:
- [ ] Wrap with `LegacyVisualizerBridge`
- [ ] Add `trackInteraction` call on user action
- [ ] Add `trackQuizSubmission` for quiz
- [ ] Add `trackHintRequested` for hints
- [ ] Add `trackStruggle` for repeated failures
- [ ] Test that events appear in EventBus

### Dashboard Integration:
- [ ] Add MasteryTracker to context
- [ ] Add AnalyticsDashboard to main app
- [ ] Connect to EventBus
- [ ] Display mastery progress

### Recommendation Integration:
- [ ] Initialize RecommendationEngine
- [ ] Pass KnowledgeGraph + MasteryTracker
- [ ] Add RecommendationPanel to topic list
- [ ] Handle concept selection

### Replay Integration:
- [ ] Enable event recording (enabled by default)
- [ ] Export sessions to storage/server
- [ ] Add EventReplayUI to instructor dashboard
- [ ] Test playback on sample sessions

## Benefits of Gradual Integration

✅ No full rewrite needed
✅ Existing visualizers keep working
✅ Intelligence layers add incrementally
✅ Can measure ROI (event tracking → recommendations)
✅ Easy to rollback (just remove wrapper)
✅ A/B test new features alongside legacy

## Timeline

- **Week 1**: Event tracking bridge (Phase 1)
- **Week 2**: Analytics dashboard (Phase 2)
- **Week 3**: Recommendations (Phase 3)
- **Week 4**: Event replay UI (Phase 4)
- **Week 5+**: IR migration (topics → renderers)

## Next Steps

1. Pick one topic (e.g., BinarySearch)
2. Wrap with LegacyVisualizerBridge
3. Add tracking calls
4. Deploy and verify events in EventBus
5. Repeat for other topics
6. Build analytics dashboard
7. Add recommendations
8. Enable replay

See IMPLEMENTATION_SUMMARY.md for architecture details.
