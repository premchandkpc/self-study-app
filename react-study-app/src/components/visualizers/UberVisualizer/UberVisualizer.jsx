import { CanvasTemplate } from '../../templates';
import { SCENARIOS } from './uber-engine';

export default function UberVisualizer() {
  return <CanvasTemplate scenarios={SCENARIOS} />;
}
