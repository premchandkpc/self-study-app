import { memo } from 'react';
import { detectVizType } from '../../../core/types/vizTypes';
import { VarsSection } from './VarsSection';
import { getDsaRenderer } from './dsaRendererRegistry';
import styles from '../../templates/DSATemplate/DSATemplate.module.css';

export const DsaVizRenderer = memo(function DsaVizRenderer({ viz }) {
  if (!viz) return null;
  const type = detectVizType(viz);

  const Renderer = getDsaRenderer(type);
  if (!Renderer) return null;

  // Extract variables from viz.variables (object of {name, value, type}) or use viz.vars directly
  const vars = viz.vars || (viz.variables ? Object.fromEntries(
    Object.entries(viz.variables).map(([k, v]) => [k, v.value ?? v])
  ) : {});

  return (
    <div className={styles.dynWrap}>
      <Renderer viz={viz} />
      {Object.keys(vars).length > 0 && (
        <VarsSection vars={vars} result={viz.result} />
      )}
    </div>
  );
});
