// Recommendation Panel - Display next steps and suggested concepts
// Shows personalized learning recommendations

import { memo } from 'react';
import { Recommendation, LearningPath } from '@/core/recommendations/RecommendationEngine';
import styles from './RecommendationPanel.module.css';

interface RecommendationPanelProps {
  recommendations: Recommendation[];
  learningPath?: LearningPath | null;
  onSelectConcept?: (conceptId: string) => void;
}

export const RecommendationPanel = memo(function RecommendationPanel({
  recommendations,
  learningPath,
  onSelectConcept,
}: RecommendationPanelProps) {
  if (recommendations.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🎓</div>
          <div className={styles.emptyText}>
            You've mastered available concepts! Keep exploring related topics.
          </div>
        </div>
      </div>
    );
  }

  const topRecommendation = recommendations[0];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>What's Next?</h3>
        <span className={styles.badge}>{recommendations.length} suggestions</span>
      </div>

      {/* Featured recommendation */}
      <div
        className={styles.featured}
        onClick={() => onSelectConcept?.(topRecommendation.conceptId)}
      >
        <div className={styles.featuredContent}>
          <div className={styles.featuredLabel}>Recommended</div>
          <h4 className={styles.featuredName}>{topRecommendation.conceptName}</h4>
          <p className={styles.featuredReason}>{topRecommendation.reason}</p>

          {/* Next steps */}
          <div className={styles.nextSteps}>
            {topRecommendation.nextSteps.slice(0, 2).map((step, idx) => (
              <div key={idx} className={styles.step}>
                <span className={styles.stepNumber}>{idx + 1}</span>
                <span className={styles.stepText}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.featuredMeta}>
          <div className={styles.difficulty}>
            <span className={styles.diffLabel}>Difficulty</span>
            <div className={styles.diffBars}>
              {Array.from({ length: topRecommendation.difficulty }).map(
                (_, i) => (
                  <div
                    key={i}
                    className={styles.diffBar}
                    style={{
                      background: `hsl(${40 + i * 20}, 100%, 50%)`,
                    }}
                  />
                )
              )}
            </div>
          </div>
          <button className={styles.startButton}>Start →</button>
        </div>
      </div>

      {/* Learning path */}
      {learningPath && (
        <div className={styles.learningPath}>
          <div className={styles.pathHeader}>
            <span className={styles.pathIcon}>📍</span>
            <span className={styles.pathText}>{learningPath.description}</span>
          </div>
          <div className={styles.pathStats}>
            <div className={styles.pathStat}>
              <span className={styles.pathStatLabel}>Steps</span>
              <span className={styles.pathStatValue}>{learningPath.concepts.length}</span>
            </div>
            <div className={styles.pathStat}>
              <span className={styles.pathStatLabel}>Est. Time</span>
              <span className={styles.pathStatValue}>
                {Math.round(learningPath.estimatedTime / 60)}h
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Other recommendations */}
      {recommendations.length > 1 && (
        <div className={styles.others}>
          <div className={styles.othersLabel}>Also recommended</div>
          <div className={styles.othersList}>
            {recommendations.slice(1, 4).map((rec) => (
              <div
                key={rec.conceptId}
                className={styles.otherItem}
                onClick={() => onSelectConcept?.(rec.conceptId)}
              >
                <div className={styles.otherName}>{rec.conceptName}</div>
                <div className={styles.otherReason}>{rec.reason}</div>
                <div className={styles.otherMeta}>
                  {'⭐'.repeat(rec.difficulty)} • {Math.round(rec.score)} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default RecommendationPanel;
