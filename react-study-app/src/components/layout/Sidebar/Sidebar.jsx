import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { TOPICS } from '../../../core/constants/topics';
import { SUBTOPIC_ROUTES } from '../../../core/constants/routes';
import { useAppState } from '../../../core/context/AppStateContext';
import styles from './Sidebar.module.css';

export default function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { topicId } = useParams();
  const { state, actions } = useAppState();
  const expandedTopics = state.ui.expandedTopics;

  // Auto-expand current topic based on URL
  useEffect(() => {
    if (topicId && !expandedTopics[topicId]) {
      actions.setTopicExpanded(topicId);
    }
  }, [topicId, expandedTopics, actions]);

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
                  onClick={() => actions.toggleTopicExpand(topic.id)}
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
          <div className={styles.footer}>
            <div className={styles.footerStats}>
              <span>{TOPICS.length} Topics</span>
              <span className={styles.dot}>·</span>
              <span>40+ Modules</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
