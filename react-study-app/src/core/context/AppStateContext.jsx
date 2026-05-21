import { createContext, useContext, useReducer, useCallback } from 'react';

const AppStateContext = createContext();

const initialState = {
  ui: {
    sidebarCollapsed: false,
    expandedTopics: {},
    themeOpen: false,
    activeVisualizerCategory: null,
  },
  navigation: {
    currentTopic: null,
    currentSubtopic: null,
    currentVisualizer: null,
    currentScenario: null,
  },
  study: {
    bookmarkedSubtopics: [],
    completedSubtopics: [],
    currentPage: 0,
  },
};

function appStateReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed },
      };
    case 'SET_SIDEBAR_COLLAPSED':
      return {
        ...state,
        ui: { ...state.ui, sidebarCollapsed: action.payload },
      };
    case 'TOGGLE_TOPIC_EXPAND':
      return {
        ...state,
        ui: {
          ...state.ui,
          expandedTopics: {
            ...state.ui.expandedTopics,
            [action.payload]: !state.ui.expandedTopics[action.payload],
          },
        },
      };
    case 'SET_TOPIC_EXPANDED':
      return {
        ...state,
        ui: {
          ...state.ui,
          expandedTopics: { ...state.ui.expandedTopics, [action.payload]: true },
        },
      };
    case 'SET_TOPIC_COLLAPSED':
      return {
        ...state,
        ui: {
          ...state.ui,
          expandedTopics: { ...state.ui.expandedTopics, [action.payload]: false },
        },
      };
    case 'SET_THEME_OPEN':
      return {
        ...state,
        ui: { ...state.ui, themeOpen: action.payload },
      };
    case 'SET_ACTIVE_VISUALIZER_CATEGORY':
      return {
        ...state,
        ui: { ...state.ui, activeVisualizerCategory: action.payload },
      };
    case 'SET_NAVIGATION':
      return {
        ...state,
        navigation: { ...state.navigation, ...action.payload },
      };
    case 'SET_CURRENT_TOPIC':
      return {
        ...state,
        navigation: { ...state.navigation, currentTopic: action.payload },
      };
    case 'SET_CURRENT_SUBTOPIC':
      return {
        ...state,
        navigation: { ...state.navigation, currentSubtopic: action.payload },
      };
    case 'SET_CURRENT_VISUALIZER':
      return {
        ...state,
        navigation: { ...state.navigation, currentVisualizer: action.payload },
      };
    case 'SET_CURRENT_SCENARIO':
      return {
        ...state,
        navigation: { ...state.navigation, currentScenario: action.payload },
      };
    case 'TOGGLE_BOOKMARK':
      const key = `${action.payload.topicId}:${action.payload.subtopic}`;
      return {
        ...state,
        study: {
          ...state.study,
          bookmarkedSubtopics: state.study.bookmarkedSubtopics.includes(key)
            ? state.study.bookmarkedSubtopics.filter((k) => k !== key)
            : [...state.study.bookmarkedSubtopics, key],
        },
      };
    case 'MARK_COMPLETED':
      const completedKey = `${action.payload.topicId}:${action.payload.subtopic}`;
      return {
        ...state,
        study: {
          ...state.study,
          completedSubtopics: state.study.completedSubtopics.includes(completedKey)
            ? state.study.completedSubtopics
            : [...state.study.completedSubtopics, completedKey],
        },
      };
    case 'SET_PAGE':
      return {
        ...state,
        study: { ...state.study, currentPage: action.payload },
      };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  const actions = useCallback(
    {
      toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
      setSidebarCollapsed: (collapsed) =>
        dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: collapsed }),
      toggleTopicExpand: (topicId) =>
        dispatch({ type: 'TOGGLE_TOPIC_EXPAND', payload: topicId }),
      setTopicExpanded: (topicId) =>
        dispatch({ type: 'SET_TOPIC_EXPANDED', payload: topicId }),
      setTopicCollapsed: (topicId) =>
        dispatch({ type: 'SET_TOPIC_COLLAPSED', payload: topicId }),
      setThemeOpen: (open) =>
        dispatch({ type: 'SET_THEME_OPEN', payload: open }),
      setActiveVisualizerCategory: (category) =>
        dispatch({ type: 'SET_ACTIVE_VISUALIZER_CATEGORY', payload: category }),
      setNavigation: (nav) =>
        dispatch({ type: 'SET_NAVIGATION', payload: nav }),
      setCurrentTopic: (topicId) =>
        dispatch({ type: 'SET_CURRENT_TOPIC', payload: topicId }),
      setCurrentSubtopic: (subtopic) =>
        dispatch({ type: 'SET_CURRENT_SUBTOPIC', payload: subtopic }),
      setCurrentVisualizer: (visualizer) =>
        dispatch({ type: 'SET_CURRENT_VISUALIZER', payload: visualizer }),
      setCurrentScenario: (scenario) =>
        dispatch({ type: 'SET_CURRENT_SCENARIO', payload: scenario }),
      toggleBookmark: (topicId, subtopic) =>
        dispatch({ type: 'TOGGLE_BOOKMARK', payload: { topicId, subtopic } }),
      markCompleted: (topicId, subtopic) =>
        dispatch({ type: 'MARK_COMPLETED', payload: { topicId, subtopic } }),
      setPage: (page) => dispatch({ type: 'SET_PAGE', payload: page }),
      resetState: () => dispatch({ type: 'RESET_STATE' }),
    },
    []
  );

  return (
    <AppStateContext.Provider value={{ state, actions }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
