import { useState } from 'react';
import { TOPICS } from '../../../core/constants/topics';
import styles from './Sidebar.module.css';

export default function Sidebar({ collapsed, onSelectTopic }) {
  const [activeTopic, setActiveTopic] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState({});

  function toggleExpand(id) {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSelect(topicId, subtopic) {
    setActiveTopic(`${topicId}:${subtopic}`);
    onSelectTopic?.({ topicId, subtopic });
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.inner}>
        {!collapsed && (
          <p className={styles.sectionLabel}>Topics</p>
        )}

        <nav className={styles.nav}>
          {TOPICS.map((topic) => {
            const isExpanded = expandedTopics[topic.id];
            return (
              <div key={topic.id} className={styles.topicGroup}>
                <button
                  className={styles.topicBtn}
                  onClick={() => toggleExpand(topic.id)}
                  title={collapsed ? topic.label : undefined}
                >
                  <span className={styles.topicIcon}>{topic.icon}</span>
                  {!collapsed && (
                    <>
                      <span className={styles.topicLabel}>{topic.label}</span>
                      <span className={`${styles.chevron} ${isExpanded ? styles.open : ''}`}>
                        ›
                      </span>
                    </>
                  )}
                </button>

                {!collapsed && isExpanded && (
                  <div className={styles.subtopics}>
                    {topic.subtopics.map((sub) => {
                      const key = `${topic.id}:${sub}`;
                      return (
                        <button
                          key={key}
                          className={`${styles.subtopicBtn} ${activeTopic === key ? styles.active : ''}`}
                          onClick={() => handleSelect(topic.id, sub)}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {!collapsed && (
          <div className={styles.footer}>
            <div className={styles.footerStats}>
              <span>8 Topics</span>
              <span className={styles.dot}>·</span>
              <span>40+ Modules</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
