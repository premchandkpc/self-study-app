import { DSATemplate } from '../../templates';
import { SCENARIOS } from './tree-engine';

export default function TreeVisualizer() {
  return <DSATemplate scenarios={SCENARIOS} />;
}
