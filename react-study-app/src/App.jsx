import { ThemeProvider } from './core/context/ThemeContext';
import MainLayout from './components/layout/MainLayout/MainLayout';
import Home from './pages/Home/Home';

function App() {
  function handleSelectTopic(selection) {
    console.log('Selected:', selection);
  }

  return (
    <ThemeProvider>
      <MainLayout onSelectTopic={handleSelectTopic}>
        <Home onSelectTopic={handleSelectTopic} />
      </MainLayout>
    </ThemeProvider>
  );
}

export default App
