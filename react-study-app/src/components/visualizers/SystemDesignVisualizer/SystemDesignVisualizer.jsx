import { CanvasTemplate } from '../../templates';
import { SCENARIOS } from './sd-engine';

export default function SystemDesignVisualizer() {
  return <CanvasTemplate scenarios={SCENARIOS} />;
}
