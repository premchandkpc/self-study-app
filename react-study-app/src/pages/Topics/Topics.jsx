import { useParams } from 'react-router-dom';
import TopicsList from './TopicsList';
import TopicDetail from './TopicDetail';

export default function Topics() {
  const { topicId } = useParams();
  return topicId ? <TopicDetail topicId={topicId} /> : <TopicsList />;
}
