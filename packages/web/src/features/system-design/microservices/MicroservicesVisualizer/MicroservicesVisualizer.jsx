import { CanvasTemplate } from '../../../../components/templates';
import { SCENARIOS } from './microservices-engine';

export default function MicroservicesVisualizer() {
  return <CanvasTemplate scenarios={SCENARIOS} />;
}
