import { useReducer } from 'react';
import { UIContext } from './UIContextValue';

const initialState = {
  sidebarCollapsed: false,
  sidebarMode: 'all',
  expandedTopics: {},
  themeOpen: false,
  activeVisualizerCategory: null,
};

function uiReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'SET_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: action.payload };
    case 'SET_SIDEBAR_MODE':
      return { ...state, sidebarMode: action.payload };
    case 'CYCLE_SIDEBAR_MODE': {
      const modes = ['all', 'current-topic', 'hidden'];
      const idx = modes.indexOf(state.sidebarMode);
      return { ...state, sidebarMode: modes[(idx + 1) % modes.length] };
    }
    case 'TOGGLE_TOPIC_EXPAND':
      return {
        ...state,
        expandedTopics: { ...state.expandedTopics, [action.payload]: !state.expandedTopics[action.payload] },
      };
    case 'SET_TOPIC_EXPANDED':
      return { ...state, expandedTopics: { ...state.expandedTopics, [action.payload]: true } };
    case 'SET_TOPIC_COLLAPSED':
      return { ...state, expandedTopics: { ...state.expandedTopics, [action.payload]: false } };
    case 'SET_THEME_OPEN':
      return { ...state, themeOpen: action.payload };
    case 'SET_ACTIVE_VISUALIZER_CATEGORY':
      return { ...state, activeVisualizerCategory: action.payload };
    default:
      return state;
  }
}

export function UIProvider({ children }) {
  const [state, dispatch] = useReducer(uiReducer, initialState);
  const actions = {
    toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
    setSidebarCollapsed: (v) => dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: v }),
    setSidebarMode: (v) => dispatch({ type: 'SET_SIDEBAR_MODE', payload: v }),
    cycleSidebarMode: () => dispatch({ type: 'CYCLE_SIDEBAR_MODE' }),
    toggleTopicExpand: (id) => dispatch({ type: 'TOGGLE_TOPIC_EXPAND', payload: id }),
    setTopicExpanded: (id) => dispatch({ type: 'SET_TOPIC_EXPANDED', payload: id }),
    setTopicCollapsed: (id) => dispatch({ type: 'SET_TOPIC_COLLAPSED', payload: id }),
    setThemeOpen: (v) => dispatch({ type: 'SET_THEME_OPEN', payload: v }),
    setActiveVisualizerCategory: (v) => dispatch({ type: 'SET_ACTIVE_VISUALIZER_CATEGORY', payload: v }),
  };
  return <UIContext.Provider value={{ state, actions }}>{children}</UIContext.Provider>;
}


