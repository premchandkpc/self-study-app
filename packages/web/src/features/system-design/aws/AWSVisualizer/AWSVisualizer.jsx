import { SystemTemplate } from '../../templates';
import { SCENARIOS } from './aws-engine';

export default function AWSVisualizer() {
  return <SystemTemplate scenarios={SCENARIOS} />;
}
