import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './core/context/ThemeContext';
import MainLayout from './components/layout/MainLayout/MainLayout';
import AgentWidget from './components/shared/AgentWidget/AgentWidget';
import Home from './pages/Home/Home';
import Topics from './pages/Topics/Topics';
import VisualizerPage from './pages/Visualizer/VisualizerPage';
import InterviewMode from './pages/InterviewMode/InterviewMode';
import NotFound from './pages/NotFound/NotFound';

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <>
      <MainLayout onSelectTopic={({ topicId }) => navigate(`/topics/${topicId}`)}>
        <Routes>
          <Route path="/" element={<Home onSelectTopic={({ topicId }) => navigate(`/topics/${topicId}`)} />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/topics/:topicId" element={<Topics />} />
          <Route path="/visualizer/:type" element={<VisualizerPage />} />
          <Route path="/interview" element={<InterviewMode />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MainLayout>
      <AgentWidget />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App
