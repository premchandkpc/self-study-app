import { createContext, useContext } from 'react';
import { useTopicMaps } from '../hooks/useTopicMaps.js';
import Loading from '../../components/shared/Loading/Loading';

const TopicMapsContext = createContext(null);

export function TopicMapsProvider({ children }) {
  const { data, isLoading, isError, error } = useTopicMaps();

  if (isLoading) {
    return <Loading label="Loading topics…" />;
  }

  if (isError) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        textAlign: 'center',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <h1 style={{ color: 'var(--text-primary)', margin: 0 }}>Failed to load topics</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>{error?.message || 'Unable to fetch topic data'}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return <Loading label="Loading topics…" />;
  }

  return (
    <TopicMapsContext.Provider value={data}>
      {children}
    </TopicMapsContext.Provider>
  );
}

export function useTopicMapsContext() {
  const ctx = useContext(TopicMapsContext);
  if (!ctx) {
    throw new Error('useTopicMapsContext must be used inside TopicMapsProvider');
  }
  return ctx;
}
