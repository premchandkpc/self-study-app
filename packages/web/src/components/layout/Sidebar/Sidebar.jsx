import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useTopicMapsContext } from '../../../core/context/useTopicMapsContext';
import { useUI } from '../../../core/context/useUI';
import styles from './Sidebar.module.css';

export default function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { topicId, abbr } = useParams();
  const { state, actions } = useUI();
  const { ABBR_MAP, TOPICS } = useTopicMapsContext();
  const expandedTopics = state.expandedTopics;
  const sidebarMode = state.sidebarMode;

  const currentTopicId = topicId || (abbr && ABBR_MAP[abbr]?.id);

  useEffect(() => {
    if (currentTopicId && !expandedTopics[currentTopicId]) {
      actions.setTopicExpanded(currentTopicId);
    }
  }, [currentTopicId, expandedTopics, actions]);

  if (sidebarMode === 'hidden') return null;

  const visibleTopics = sidebarMode === 'current-topic'
    ? TOPICS.filter((t) => t.id === currentTopicId)
    : TOPICS;

  function handleNav(path) {
    navigate(path);
  }

  function isActive(path) {
    return location.pathname === path;
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.inner}>
        {!collapsed && <p className={styles.sectionLabel}>Topics</p>}
        <nav className={styles.nav}>
          {visibleTopics.map((topic) => {
            const isExpanded = expandedTopics[topic.id];
            const topicInfo = ABBR_MAP[topic.abbr];
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
                      <span className={`${styles.chevron} ${isExpanded ? styles.open : ''}`}>›</span>
                    </>
                  )}
                </button>
                {!collapsed && isExpanded && topicInfo && (
                  <div className={styles.subtopics}>
                    {topicInfo.subtopics.map((sub) => {
                      const slug = sub.scenarioId ||
                        sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                      const path = `/${topic.abbr}/${slug}`;
                      return (
                        <button
                          key={sub.slug || sub.name}
                          className={`${styles.subtopicBtn} ${isActive(path) ? styles.active : ''}`}
                          onClick={() => handleNav(path)}
                        >
                          {sub.name}
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
              <span>{visibleTopics.reduce((acc, t) => acc + (ABBR_MAP[t.abbr]?.subtopics.length || 0), 0)} Modules</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
