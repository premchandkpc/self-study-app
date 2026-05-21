import { BTreeView, IndexingView, TransactionsView, JoinsView } from './views';

const viewMap = {
  btree: BTreeView,
  indexing: IndexingView,
  transactions: TransactionsView,
  joins: JoinsView,
};

export function getView(viewType) {
  return viewMap[viewType];
}

export function createView(viewType, viz) {
  if (!viz) return null;
  const View = getView(viewType);
  return View ? <View viz={viz} /> : null;
}
