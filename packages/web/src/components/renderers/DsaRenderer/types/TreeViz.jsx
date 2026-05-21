import { memo } from 'react';
import { DSA_NODE_COLORS } from '../../../../core/constants/colors';
import styles from '../../../templates/DSATemplate/DSATemplate.module.css';

function renderNode(node) {
  if (!node) return null;
  const color = DSA_NODE_COLORS[node.state] || DSA_NODE_COLORS.default;
  return (
    <div key={node.val} className={styles.treeNode}>
      <div className={styles.treeRow}>
        {node.left && <div className={styles.treeConnL} />}
        <div className={styles.treeCircle} style={{ '--nc': color }}>{node.val}</div>
        {node.right && <div className={styles.treeConnR} />}
      </div>
      {(node.left || node.right) && (
        <div className={styles.treeChildren}>
          <div className={styles.treeChild}>{renderNode(node.left)}</div>
          <div className={styles.treeChild}>{renderNode(node.right)}</div>
        </div>
      )}
    </div>
  );
}

export const TreeViz = memo(function TreeViz({ viz }) {
  const { tree, visited = [] } = viz;
  return (
    <div className={styles.treeWrap}>
      {renderNode(tree)}
      {visited.length > 0 && (
        <div className={styles.visitedRow}>
          <span className={styles.visitedLabel}>Visited:</span>
          {visited.map((v, i) => <span key={i} className={styles.visitedVal}>{v}</span>)}
        </div>
      )}
    </div>
  );
});
