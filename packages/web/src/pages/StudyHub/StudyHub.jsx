import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DETAILED_EXPLANATIONS } from '../../core/constants/detailedExplanations';
import Button from '../../components/shared/Button/Button';
import DetailedExplanation from '../../components/shared/DetailedExplanation/DetailedExplanation';
import styles from './StudyHub.module.css';

const TOPICS_BY_CATEGORY = {
  'Foundation': ['arrays', 'binarySearch', 'graphs', 'dynamicProgramming'],
  'Languages': ['jvm', 'gcGarbageCollection', 'spring', 'golang', 'python'],
  'Systems': ['aws', 'redis', 'sorting_bubble'],
};

export default function StudyHub() {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState('arrays');
  const [searchTerm, setSearchTerm] = useState('');

  const selectedData = DETAILED_EXPLANATIONS[selectedTopic];

  const allTopics = Object.entries(DETAILED_EXPLANATIONS).map(([key, data]) => ({
    key,
    title: data.title,
  }));

  const filteredTopics = allTopics.filter(topic =>
    topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          ← Home
        </Button>
        <h1 className={styles.title}>📚 Deep Dive Study Hub</h1>
        <p className={styles.subtitle}>
          Detailed explanations with code, visualizations, and real-world examples
        </p>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="Search topics... (arrays, DP, GC, Redis, etc)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.layout}>
        {/* Sidebar: Topic List */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Topics ({filteredTopics.length})</div>

          {searchTerm ? (
            // Search results
            filteredTopics.length === 0 ? (
              <div className={styles.noResults}>No topics found for &quot;{searchTerm}&quot;</div>
            ) : (
              <div className={styles.topicList}>
                {filteredTopics.map((topic) => (
                  <div
                    key={topic.key}
                    className={`${styles.topicItem} ${selectedTopic === topic.key ? styles.active : ''}`}
                    onClick={() => setSelectedTopic(topic.key)}
                  >
                    {topic.title}
                  </div>
                ))}
              </div>
            )
          ) : (
            // Categorized topics
            Object.entries(TOPICS_BY_CATEGORY).map(([category, topics]) => (
              <div key={category} className={styles.category}>
                <div className={styles.categoryTitle}>{category}</div>
                <div className={styles.topicList}>
                  {topics.map((topicKey) => {
                    const topic = DETAILED_EXPLANATIONS[topicKey];
                    if (!topic) return null;
                    return (
                      <div
                        key={topicKey}
                        className={`${styles.topicItem} ${selectedTopic === topicKey ? styles.active : ''}`}
                        onClick={() => setSelectedTopic(topicKey)}
                      >
                        {topic.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Main: Detailed Content */}
        <div className={styles.content}>
          {selectedData && (
            <DetailedExplanation topic={selectedTopic} data={selectedData} />
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className={styles.actionBar}>
        <Button
          variant="primary"
          size="md"
          icon="▶️"
          onClick={() => navigate('/topics')}
        >
          Explore Visualizers
        </Button>
        <Button
          variant="secondary"
          size="md"
          icon="🎯"
          onClick={() => navigate('/interview')}
        >
          Practice Questions
        </Button>
      </div>
    </div>
  );
}
