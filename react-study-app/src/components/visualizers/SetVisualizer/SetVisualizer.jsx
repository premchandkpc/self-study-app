import { DSATemplate } from '../../templates';
import { SCENARIOS } from './set-engine';

export default function SetVisualizer() {
  return <DSATemplate scenarios={SCENARIOS} />;
}
