import { CanvasTemplate } from '../../templates';
import { SCENARIOS } from './microservices-engine';

export default function MicroservicesVisualizer() {
  return <CanvasTemplate scenarios={SCENARIOS} />;
}
