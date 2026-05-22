import { SystemTemplate } from '../../../../components/templates';
import { SCENARIOS } from './aws-engine';

export default function AWSVisualizer() {
  return <SystemTemplate scenarios={SCENARIOS} />;
}
