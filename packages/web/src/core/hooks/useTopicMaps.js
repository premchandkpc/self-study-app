import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client.js';

export function useTopicMaps() {
  return useQuery({
    queryKey: ['topicMaps'],
    queryFn: () => apiFetch('/api/maps'),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 3,
  });
}
