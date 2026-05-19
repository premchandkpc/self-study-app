import { DSATemplate } from '../../templates';
import { SCENARIOS } from './dp-engine';

export default function DPVisualizer() {
  return <DSATemplate scenarios={SCENARIOS} />;
}
