import { useContext } from 'react';
import { SimulationContext } from './SimulationContextValue';

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be inside SimulationProvider');
  return ctx;
}
