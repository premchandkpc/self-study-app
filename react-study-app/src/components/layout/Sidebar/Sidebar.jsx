import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TOPICS } from '../../../core/constants/topics';
import { COLLECTIONS, COLLECTION_CATEGORIES } from '../../../core/constants/collections';
import { SUBTOPIC_ROUTES } from '../../../core/constants/routes';
import styles from './Sidebar.module.css';

export default function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedTopics, setExpandedTopics] = useState({});
  const [expandedCollections, setExpandedCollections] = useState({});

  function toggleExpand(id) {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSelect(topicId, subtopic) {
    const route = SUBTOPIC_ROUTES[`${topicId}:${subtopic}`] || `/topics/${topicId}`;
    navigate(route);
  }

  function isActive(topicId, subtopic) {
    const route = SUBTOPIC_ROUTES[`${topicId}:${subtopic}`] || `/topics/${topicId}`;
    return location.pathname === route;
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
                          className={`${styles.subtopicBtn} ${isActive(topic.id, sub) ? styles.active : ''}`}
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
          <p className={styles.sectionLabel} style={{ marginTop: 'var(--space-lg)' }}>Collections</p>
        )}

        <nav className={styles.nav}>
          {COLLECTIONS.map((col) => {
            const isExpanded = expandedCollections[col.id];
            return (
              <div key={col.id} className={styles.topicGroup}>
                <button
                  className={styles.topicBtn}
                  onClick={() => {
                    if (collapsed) navigate(`/collections/${col.id}`);
                    else setExpandedCollections((prev) => ({ ...prev, [col.id]: !prev[col.id] }));
                  }}
                  title={collapsed ? col.label : undefined}
                >
                  <span className={styles.topicIcon}>{col.icon}</span>
                  {!collapsed && (
                    <>
                      <span className={styles.topicLabel}>{col.label}</span>
                      <span className={`${styles.chevron} ${isExpanded ? styles.open : ''}`}>›</span>
                    </>
                  )}
                </button>

                {!collapsed && isExpanded && (
                  <div className={styles.subtopics}>
                    <button
                      className={`${styles.subtopicBtn} ${location.pathname === `/collections/${col.id}` ? styles.active : ''}`}
                      onClick={() => navigate(`/collections/${col.id}`)}
                    >
                      All Scenarios
                    </button>
                    {COLLECTION_CATEGORIES.map((cat) => {
                      const count = col.scenarios[cat.key]?.length || 0;
                      return count > 0 ? (
                        <button
                          key={cat.key}
                          className={styles.subtopicBtn}
                          onClick={() => navigate(`/collections/${col.id}`)}
                        >
                          {cat.icon} {cat.label}
                        </button>
                      ) : null;
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
              <span>14 Topics</span>
              <span className={styles.dot}>·</span>
              <span>40+ Modules</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
