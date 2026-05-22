import * as vizTypes from './types';

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
