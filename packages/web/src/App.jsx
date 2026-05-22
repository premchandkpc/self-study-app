import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './core/context/ThemeContext';
import { UIProvider } from './core/context/UIContext';
import { TopicMapsProvider } from './core/context/TopicMapsContext';
import { useTopicMapsContext } from './core/context/useTopicMapsContext';
import ErrorBoundary from './components/shared/ErrorBoundary/ErrorBoundary';
import MainLayout from './components/layout/MainLayout/MainLayout';
import AgentWidget from './components/shared/AgentWidget/AgentWidget';
import Home from './pages/Home/Home';
import Topics from './pages/Topics/Topics';

import Collections from './pages/Collections/Collections';
import StudyHub from './pages/StudyHub/StudyHub';
import VisualizerPage from './pages/Visualizer/VisualizerPage';
import InterviewMode from './pages/InterviewMode/InterviewMode';
import CompilerPage from './pages/Compiler/CompilerPage';
import PlaygroundPage from './pages/Playground/PlaygroundPage';
import MarkdownDocPage from './pages/MarkdownDoc/MarkdownDocPage';
import NotFound from './pages/NotFound/NotFound';

function AppRoutes() {
  const navigate = useNavigate();
  const { TOPICS } = useTopicMapsContext();

  return (
    <>
      <MainLayout onSelectTopic={({ topicId }) => {
        const t = TOPICS.find(x => x.id === topicId);
        navigate(t ? `/${t.abbr}` : `/topics/${topicId}`);
      }}>
        <Routes>
          <Route path="/" element={<Home onSelectTopic={({ topicId }) => {
            const t = TOPICS.find(x => x.id === topicId);
            navigate(t ? `/${t.abbr}` : `/topics/${topicId}`);
          }} />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/topics/:topicId" element={<Topics />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:collectionId" element={<Collections />} />
          <Route path="/study-hub" element={<StudyHub />} />
          <Route path="/interview" element={<InterviewMode />} />
          <Route path="/compiler" element={<CompilerPage />} />
          <Route path="/play" element={<PlaygroundPage />} />
          <Route path="/play/:slug" element={<PlaygroundPage />} />
          <Route path="/read/:doc" element={<MarkdownDocPage />} />
          <Route path="/:abbr/:slug" element={<VisualizerPage />} />
          <Route path="/:abbr" element={<VisualizerPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MainLayout>
      <AgentWidget />
    </>
  );
}

function App() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <ThemeProvider>
            <UIProvider>
              <TopicMapsProvider>
                <AppRoutes />
              </TopicMapsProvider>
            </UIProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App
