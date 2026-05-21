import { DSATemplate } from '../../templates';
import { SCENARIOS } from './string-engine';

export default function StringVisualizer() {
  return <DSATemplate scenarios={SCENARIOS} />;
}
