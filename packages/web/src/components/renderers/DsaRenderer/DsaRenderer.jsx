import { memo } from 'react';
import { detectVizType } from '../../../core/types/vizTypes';
import { VarsSection } from './VarsSection';
import * as vizTypes from './types';
import styles from '../../templates/DSATemplate/DSATemplate.module.css';

const renderers = {
  array: vizTypes.ArrayViz,
  sort: vizTypes.SortViz,
  linkedlist: vizTypes.LinkedListViz,
  tree: vizTypes.TreeViz,
  graph: vizTypes.GraphViz,
  matrix: vizTypes.MatrixViz,
  hashmap: vizTypes.HashMapViz,
  dp: vizTypes.DPViz,
  string: vizTypes.StringViz,
  set: vizTypes.SetViz,
};

const rendererRegistry = new Map(Object.entries(renderers));

export function registerDsaRenderer(type, component) {
  rendererRegistry.set(type, component);
}

export function getDsaRenderer(type) {
  return rendererRegistry.get(type) || null;
}

export const DsaVizRenderer = memo(function DsaVizRenderer({ viz }) {
  if (!viz) return null;
  const type = detectVizType(viz);

  const Renderer = getDsaRenderer(type);
  if (!Renderer) return null;

  return (
    <div className={styles.dynWrap}>
      <Renderer viz={viz} />
      {viz.vars && Object.keys(viz.vars).length > 0 && (
        <VarsSection vars={viz.vars} result={viz.result} />
      )}
    </div>
  );
});
