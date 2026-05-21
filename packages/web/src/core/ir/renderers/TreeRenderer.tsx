// TreeRenderer - Hierarchical tree visualization
// Used by: TreeMap, file systems, DOM trees, organizational hierarchies

import { memo } from 'react';
import { IRScene } from '../schema';
import styles from './TreeRenderer.module.css';

interface TreeNode {
  id: string;
  label: string;
  children: TreeNode[];
  level: number;
}

function buildTree(scene: IRScene): TreeNode {
  // Find root (node with no incoming edges)
  const roots = scene.nodes.filter(
    (n) => !scene.edges.some((e) => e.to === n.id)
  );

  const root = roots[0];
  if (!root) {
    return { id: 'empty', label: 'Empty tree', children: [], level: 0 };
  }

  const visited = new Set<string>();

  function build(nodeId: string, level: number): TreeNode {
    if (visited.has(nodeId)) {
      return { id: nodeId, label: 'cyclic', children: [], level };
    }
    visited.add(nodeId);

    const node = scene.nodes.find((n) => n.id === nodeId);
    if (!node) {
      return { id: nodeId, label: 'missing', children: [], level };
    }

    // Find children (outgoing edges)
    const childEdges = scene.edges.filter((e) => e.from === nodeId);
    const children = childEdges
      .map((edge) => build(edge.to, level + 1))
      .filter((child) => child !== null) as TreeNode[];

    return {
      id: nodeId,
      label: node.label,
      children,
      level,
    };
  }

  return build(root.id, 0);
}

interface TreeNodeProps {
  node: TreeNode;
  isExpanded: boolean;
  onToggle: (nodeId: string) => void;
}

function TreeNodeComponent({ node, isExpanded, onToggle }: TreeNodeProps) {
  const hasChildren = node.children.length > 0;

  return (
    <div className={styles.treeNode} style={{ marginLeft: `${node.level * 20}px` }}>
      <div className={styles.nodeRow}>
        {hasChildren ? (
          <button
            className={styles.expandButton}
            onClick={() => onToggle(node.id)}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className={styles.spacer} />
        )}

        <div className={styles.label}>{node.label}</div>
      </div>

      {isExpanded && hasChildren && (
        <div className={styles.children}>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              isExpanded={true}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const TreeRenderer = memo(function TreeRenderer({ scene }: { scene: IRScene }) {
  const tree = buildTree(scene);

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{scene.title}</h4>
      <div className={styles.treeContainer}>
        <TreeNodeComponent
          node={tree}
          isExpanded={true}
          onToggle={() => {}}
        />
      </div>
    </div>
  );
});
