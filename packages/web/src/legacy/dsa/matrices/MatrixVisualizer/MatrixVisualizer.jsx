import { DSATemplate } from '../../../../components/templates';
import { SCENARIOS } from './matrix-engine';

export default function MatrixVisualizer() {
  return <DSATemplate scenarios={SCENARIOS} />;
}
