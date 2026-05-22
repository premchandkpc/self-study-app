import { useReducer, useCallback, useEffect, useRef } from 'react';
import { SimulationContext } from './SimulationContextValue';

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
    case 'SET_STEPS': {
      const steps = action.payload;
      if (!steps.length) return { ...state, steps, currentStep: 0, isPlaying: false };
      return applyStep({ ...state, steps, isPlaying: false }, 0);
    }

    case 'STEP_FORWARD': {
      if (state.currentStep >= state.steps.length - 1) return { ...state, isPlaying: false };
      return applyStep(state, state.currentStep + 1);
    }

    case 'STEP_BACK':
      if (state.currentStep <= 0) return state;
      return applyStep(state, state.currentStep - 1);

    case 'JUMP_TO':
      return applyStep(state, Math.max(0, Math.min(action.payload, state.steps.length - 1)));

    case 'JUMP_START':
      return { ...applyStep(state, 0), isPlaying: false };

    case 'JUMP_END':
      return { ...applyStep(state, state.steps.length - 1), isPlaying: false };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };

    case 'SET_SPEED':
      return { ...state, speed: action.payload };

    case 'RESET': {
      const steps = state.steps;
      if (!steps.length) return { ...initialState, speed: state.speed };
      return applyStep({ ...initialState, steps, speed: state.speed }, 0);
    }

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

  useEffect(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    if (!state.isPlaying) return;
    timerRef.current = setInterval(() => {
      dispatch({ type: 'STEP_FORWARD' });
    }, state.speed);
    return () => clearInterval(timerRef.current);
  }, [state.isPlaying, state.speed]);

  const play  = useCallback(() => dispatch({ type: 'SET_PLAYING', payload: true  }), []);
  const pause = useCallback(() => dispatch({ type: 'SET_PLAYING', payload: false }), []);
  const togglePlay = useCallback(() => {
    dispatch({ type: 'TOGGLE_PLAY' });
  }, []);

  const value = { state, dispatch, play, pause, togglePlay };
  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}


