import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TOPICS } from '../../../core/constants/topics';
import styles from './Sidebar.module.css';

const SUBTOPIC_ROUTES = {
  'dsa:Arrays':            '/visualizer/array',
  'dsa:Graphs':            '/visualizer/graph',
  'dsa:Trees':             '/visualizer/tree',
  'kafka:Partitions':      '/visualizer/kafka',
  'java:JVM':              '/visualizer/jvm',
  'java:GC':               '/visualizer/jvm',
  'java:Threads':          '/visualizer/threads',
  'kubernetes:Pods':       '/visualizer/kubernetes',
  'kubernetes:HPA':        '/visualizer/kubernetes',
  'kubernetes:Deployments':    '/visualizer/kubernetes',
  'system-design:Load Balancer': '/visualizer/systemdesign',
  'system-design:Cache':         '/visualizer/systemdesign',
  'system-design:CDN':           '/visualizer/systemdesign',
  'system-design:Raft':          '/visualizer/systemdesign',
};

export default function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedTopics, setExpandedTopics] = useState({});

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
