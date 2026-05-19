import { DSATemplate } from '../../templates';
import { SCENARIOS } from './matrix-engine';

export default function MatrixVisualizer() {
  return <DSATemplate scenarios={SCENARIOS} />;
}
