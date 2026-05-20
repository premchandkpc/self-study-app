import { DSATemplate } from '../../templates';
import { SCENARIOS } from './trie-engine';

export default function TrieVisualizer() {
  return <DSATemplate scenarios={SCENARIOS} />;
}
