import { memo } from 'react';
import { useTopicMapsContext } from '../../core/context/TopicMapsContext';
import { HeroSection } from './HeroSection';
import { StatsSection } from './StatsSection';
import { DemoSection } from './DemoSection';
import { FeaturesSection } from './FeaturesSection';
import { TopicsSection } from './TopicsSection';
import { PathsSection } from './PathsSection';
import { ModesSection } from './ModesSection';
import styles from './Home.module.css';

const HomeComponent = memo(function Home({ onSelectTopic }) {
  const { TOPICS } = useTopicMapsContext();
  const TOPIC_COUNT = TOPICS.length;
  const VIZ_COUNT = TOPICS.reduce((acc, t) => acc + t.subtopics.length, 0);

  return (
    <div className={styles.page}>
      <HeroSection />
      <StatsSection topicCount={TOPIC_COUNT} vizCount={VIZ_COUNT} />
      <DemoSection initialDemo="array" />
      <FeaturesSection />
      <TopicsSection topics={TOPICS} onSelectTopic={onSelectTopic} />
      <PathsSection />
      <ModesSection />
    </div>
  );
});

export default HomeComponent;
