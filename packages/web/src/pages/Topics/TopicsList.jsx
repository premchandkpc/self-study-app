import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOPICS, ABBR_MAP, SUBTOPIC_ROUTES } from '../../core/constants/topics';
import { buildSubtopicLearnRoute, slugify } from '../../core/topics/topicRoutes';
import { VISUALIZER_MAP } from '../../core/constants/topics';
import LearningResources from '../../components/shared/LearningResources/LearningResources';
import styles from './Topics.module.css';

export default function TopicsList() {
  const navigate = useNavigate();
  const [openTopic, setOpenTopic] = useState(null);

  const learningResources = [
    { icon: '▶️', name: 'Interactive Visualizer', desc: 'Step through algorithms and data structures with full animation control' },
    { icon: '📚', name: 'Learning Objectives', desc: 'Clear learning goals and key concepts for each topic' },
    { icon: '💡', name: 'Study Guides', desc: 'Detailed explanations of algorithms, time complexity, and patterns' },
    { icon: '🎯', name: 'Code Examples', desc: 'Real code snippets with step-by-step execution tracing' },
    { icon: '📊', name: 'Live Simulations', desc: 'See data structure transformations in real-time' },
    { icon: '🔍', name: 'Edge Cases', desc: 'Explore corner cases and understand why they matter' },
  ];

  function handleSubtopicClick(topicAbbr, subtopic) {
    const slug = slugify(subtopic);
    navigate(buildSubtopicLearnRoute(topicAbbr, slug));
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Topics</h1>
        <p className={styles.sub}>Select a topic to explore subtopics with interactive simulations and study guides.</p>
      </div>

      <LearningResources resources={learningResources} />

      <div className={styles.topicList}>
        {TOPICS.map((topic) => {
          const meta = TOPIC_META[topic.id] || {};
          const isOpen = openTopic === topic.id;
          return (
            <div key={topic.id} className={styles.topicSection}>
              <button
                className={`${styles.topicHeader} ${isOpen ? styles.topicHeaderOpen : ''}`}
                onClick={() => setOpenTopic(isOpen ? null : topic.id)}
              >
                <span className={styles.topicHeaderIcon}>{topic.icon}</span>
                <span className={styles.topicHeaderLabel}>{topic.label}</span>
                <span className={styles.topicHeaderCount}>{topic.subtopics.length}</span>
                <span className={`${styles.topicHeaderArrow} ${isOpen ? styles.topicHeaderArrowOpen : ''}`}>
                  {'\u25BC'}
                </span>
              </button>

              {isOpen && (
                <div className={styles.subtopicGrid}>
                  <div className={styles.topicDesc}>{meta.desc}</div>
                  <div className={styles.subtopicList}>
                    {topic.subtopics.map((sub) => {
                      const vizKey = `${topic.id}:${sub}`;
                      const hasViz = !!VISUALIZER_MAP[vizKey];
                      return (
                        <div
                          key={sub}
                          className={`${styles.subtopicItem} ${hasViz ? styles.subtopicClickable : ''}`}
                          onClick={() => hasViz && handleSubtopicClick(topic.abbr, sub)}
                        >
                          <span className={styles.subtopicName}>{sub}</span>
                          {hasViz && <span className={styles.subtopicBadge}>Sim</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
