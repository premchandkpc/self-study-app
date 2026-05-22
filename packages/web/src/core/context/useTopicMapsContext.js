import { useContext } from 'react';
import { TopicMapsContext } from './TopicMapsContextValue';

export function useTopicMapsContext() {
  const ctx = useContext(TopicMapsContext);
  if (!ctx) {
    throw new Error('useTopicMapsContext must be used inside TopicMapsProvider');
  }
  return ctx;
}
