// Analytics Dashboard - Visualize learning progress and mastery
// Shows concept mastery, time spent, and recommendations

import { memo } from 'react';
import { LearningMetrics, ConceptMastery, MasteryLevel } from '@/core/analytics/MasteryTracker';
import styles from './AnalyticsDashboard.module.css';

interface AnalyticsDashboardProps {
  metrics: LearningMetrics;
  onConceptClick?: (conceptId: string) => void;
}

const masteryColors: Record<MasteryLevel, string> = {
  beginner: '#ef4444',
  intermediate: '#f59e0b',
  proficient: '#3b82f6',
  expert: '#10b981',
};

const masteryLabels: Record<MasteryLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  proficient: 'Proficient',
  expert: 'Expert',
};

export const AnalyticsDashboard = memo(function AnalyticsDashboard({
  metrics,
  onConceptClick,
}: AnalyticsDashboardProps) {
  const masteryArray = Array.from(metrics.conceptMastery.values());
  const levelDistribution = masteryArray.reduce(
    (acc, m) => {
      acc[m.level] = (acc[m.level] || 0) + 1;
      return acc;
    },
    {} as Record<MasteryLevel, number>
  );

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const strugglingConcepts = masteryArray
    .filter((m) => m.level === 'beginner' && m.attempts > 0)
    .sort((a, b) => b.attempts - a.attempts);

  const masteredConcepts = masteryArray.filter((m) => m.level === 'expert');

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Learning Progress</h2>
      </div>

      {/* Key metrics */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Time</div>
          <div className={styles.metricValue}>{formatTime(metrics.totalTimeSpent)}</div>
          <div className={styles.metricHelper}>spent learning</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Concepts Attempted</div>
          <div className={styles.metricValue}>{metrics.conceptsAttempted}</div>
          <div className={styles.metricHelper}>learning topics</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Mastered</div>
          <div className={styles.metricValue}>{metrics.conceptsMastered}</div>
          <div className={styles.metricHelper}>at expert level</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Success Rate</div>
          <div className={styles.metricValue}>{metrics.averageSuccessRate}%</div>
          <div className={styles.metricHelper}>of attempts</div>
        </div>
      </div>

      {/* Progress visualization */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Mastery Distribution</h3>

        <div className={styles.distributionBars}>
          {(
            ['beginner', 'intermediate', 'proficient', 'expert'] as MasteryLevel[]
          ).map((level) => {
            const count = levelDistribution[level] || 0;
            const percentage =
              metrics.conceptsAttempted > 0
                ? (count / metrics.conceptsAttempted) * 100
                : 0;

            return (
              <div key={level} className={styles.bar}>
                <div className={styles.barLabel}>{masteryLabels[level]}</div>
                <div className={styles.barContainer}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: masteryColors[level],
                    }}
                  />
                </div>
                <div className={styles.barValue}>
                  {count} ({Math.round(percentage)}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mastered concepts */}
      {masteredConcepts.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            ✓ Mastered Concepts ({masteredConcepts.length})
          </h3>

          <div className={styles.conceptGrid}>
            {masteredConcepts.slice(0, 8).map((concept) => (
              <div
                key={concept.conceptId}
                className={styles.masteredBadge}
                onClick={() => onConceptClick?.(concept.conceptId)}
              >
                <div className={styles.badgeName}>{concept.conceptName}</div>
                <div className={styles.badgeStat}>
                  {concept.attempts} attempts, {Math.round(concept.score)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Struggling concepts */}
      {strugglingConcepts.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            ⚠ Needs Attention ({strugglingConcepts.length})
          </h3>

          <div className={styles.strugglingList}>
            {strugglingConcepts.slice(0, 5).map((concept) => (
              <div
                key={concept.conceptId}
                className={styles.strugglingItem}
                onClick={() => onConceptClick?.(concept.conceptId)}
              >
                <div className={styles.strugglingName}>{concept.conceptName}</div>
                <div className={styles.strugglingStats}>
                  <span className={styles.stat}>
                    {concept.attempts} attempts
                  </span>
                  <span className={styles.stat}>{Math.round(concept.score)}% mastery</span>
                </div>
                {concept.weaknesses.length > 0 && (
                  <div className={styles.weaknesses}>
                    {concept.weaknesses.slice(0, 2).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Recommendations</h3>

        <div className={styles.recommendations}>
          {strugglingConcepts.length > 0 && (
            <div className={styles.recommendation}>
              <div className={styles.recommendationIcon}>📚</div>
              <div className={styles.recommendationText}>
                Focus on <strong>{strugglingConcepts[0]?.conceptName}</strong> —
                you've attempted it {strugglingConcepts[0]?.attempts} times but
                haven't mastered it yet. Try a different learning approach or
                request hints.
              </div>
            </div>
          )}

          {metrics.conceptsMastered > 0 && (
            <div className={styles.recommendation}>
              <div className={styles.recommendationIcon}>🎯</div>
              <div className={styles.recommendationText}>
                Great progress! You've mastered {metrics.conceptsMastered} concept
                {metrics.conceptsMastered > 1 ? 's' : ''}. Keep building on these
                strengths by exploring related topics.
              </div>
            </div>
          )}

          {metrics.averageSuccessRate < 50 && (
            <div className={styles.recommendation}>
              <div className={styles.recommendationIcon}>💡</div>
              <div className={styles.recommendationText}>
                Your success rate is {metrics.averageSuccessRate}%. Try using hints
                more liberally — they can help you learn faster without penalizing
                your score.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default AnalyticsDashboard;
