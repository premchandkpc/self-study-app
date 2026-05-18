import { createContext, useContext, useReducer, useCallback, useRef } from 'react';

const SimulationContext = createContext(null);

const initialState = {
  steps: [],
  currentStep: 0,
  isPlaying: false,
  speed: 800,
  narration: '',
  codeLine: null,
  complexity: { ops: 0, label: '', space: '' },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEPS':
      return { ...state, steps: action.payload, currentStep: 0, isPlaying: false };

    case 'STEP_FORWARD':
      if (state.currentStep >= state.steps.length - 1) return { ...state, isPlaying: false };
      return applyStep(state, state.currentStep + 1);

    case 'STEP_BACK':
      if (state.currentStep <= 0) return state;
      return applyStep(state, state.currentStep - 1);

    case 'JUMP_TO':
      return applyStep(state, Math.max(0, Math.min(action.payload, state.steps.length - 1)));

    case 'JUMP_START':
      return applyStep(state, 0);

    case 'JUMP_END':
      return applyStep(state, state.steps.length - 1);

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'SET_SPEED':
      return { ...state, speed: action.payload };

    case 'RESET':
      return { ...initialState, steps: state.steps };

    default:
      return state;
  }
}

function applyStep(state, index) {
  const step = state.steps[index];
  if (!step) return state;
  return {
    ...state,
    currentStep: index,
    narration: step.narration || '',
    codeLine: step.codeLine ?? null,
    complexity: step.complexity || state.complexity,
  };
}

export function SimulationProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRef = useRef(null);

  const play = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', payload: true });
    timerRef.current = setInterval(() => {
      dispatch({ type: 'STEP_FORWARD' });
    }, state.speed);
  }, [state.speed]);

  const pause = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', payload: false });
    clearInterval(timerRef.current);
  }, []);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) pause();
    else play();
  }, [state.isPlaying, play, pause]);

  const value = { state, dispatch, play, pause, togglePlay };
  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be inside SimulationProvider');
  return ctx;
}
