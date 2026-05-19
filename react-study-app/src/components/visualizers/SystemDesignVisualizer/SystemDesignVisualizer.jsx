import { SystemTemplate } from '../../templates';
import { SCENARIOS } from './sd-engine';

export default function SystemDesignVisualizer() {
  return <SystemTemplate scenarios={SCENARIOS} />;
}
