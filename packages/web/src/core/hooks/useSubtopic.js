import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client.js';

export function useSubtopic(abbr, slug, opts = {}) {
  return useQuery({
    queryKey: ['subtopic', abbr, slug],
    queryFn: () => apiFetch(`/api/topics/${abbr}/${slug}`),
    enabled: !!abbr && !!slug,
    staleTime: 1000 * 60 * 30,
    ...opts,
  });
}
