import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { TOPICS } from '../../../core/constants/topics';
import { SUBTOPIC_ROUTES } from '../../../core/constants/routes';
import { useAppState } from '../../../core/context/AppStateContext';
import styles from './Sidebar.module.css';

export default function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { topicId, subtopic } = useParams();
  const { state, actions } = useAppState();
  const expandedTopics = state.ui.expandedTopics;
  const sidebarMode = state.ui.sidebarMode;

  // Auto-expand current topic based on URL
  useEffect(() => {
    if (topicId && !expandedTopics[topicId]) {
      actions.setTopicExpanded(topicId);
    }
  }, [topicId, expandedTopics, actions]);

  // Hide sidebar if mode is 'hidden'
  if (sidebarMode === 'hidden') {
    return null;
  }

  // When viewing specific subtopic, show only that subtopic
  if (subtopic && topicId) {
    const topic = TOPICS.find((t) => t.id === topicId);
    if (topic && topic.subtopics.includes(subtopic)) {
      return (
        <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
          <div className={styles.inner}>
            {!collapsed && (
              <p className={styles.sectionLabel}>{topic.label}</p>
            )}
            <nav className={styles.nav}>
              <div className={styles.topicGroup}>
                <button
                  className={`${styles.subtopicBtn} ${styles.active}`}
                  disabled
                  title={subtopic}
                >
                  {subtopic}
                </button>
              </div>
            </nav>
          </div>
        </aside>
      );
    }
  }

  // Filter topics: show all or only current
  const visibleTopics = sidebarMode === 'current-topic'
    ? TOPICS.filter((t) => t.id === topicId)
    : TOPICS;

  function handleSelect(topicId, subtopic) {
    const routeTemplate = SUBTOPIC_ROUTES[`${topicId}:${subtopic}`] || `/topics/${topicId}`;
    const route = routeTemplate.split(subtopic).join(encodeURIComponent(subtopic));
    navigate(route);
  }

  function isActive(topicId, subtopic) {
    const routeTemplate = SUBTOPIC_ROUTES[`${topicId}:${subtopic}`] || `/topics/${topicId}`;
    const route = routeTemplate.split(subtopic).join(encodeURIComponent(subtopic));
    return location.pathname === route;
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.inner}>
        {!collapsed && (
          <p className={styles.sectionLabel}>Topics</p>
        )}

        <nav className={styles.nav}>
          {visibleTopics.map((topic) => {
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
              <span>{visibleTopics.length} Topic{visibleTopics.length !== 1 ? 's' : ''}</span>
              <span className={styles.dot}>·</span>
              <span>{visibleTopics.reduce((acc, t) => acc + t.subtopics.length, 0)} Modules</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
