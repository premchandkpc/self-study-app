import { memo } from 'react';
import styles from '../RedisVisualizer.module.css';

export const PipelineView = memo(function PipelineView({ viz }) {
  const cmds = viz.commands || [];
  const isSeq = viz.mode === 'sequential';

  return (
    <div className={styles.pipelineLayout}>
      <div className={styles.pipelineModeBar}>
        <span className={`${styles.modeChip} ${isSeq ? styles.modeSeq : styles.modePipe}`}>
          {isSeq ? '🐢 Sequential (1 cmd / RTT)' : '⚡ Pipelined (all cmds / 1 RTT)'}
        </span>
        {viz.totalRtt > 0 && (
          <span className={styles.rttDisplay}>Total RTT: <b>{viz.totalRtt}ms</b></span>
        )}
        {viz.metrics?.savings > 0 && (
          <span className={styles.savingsDisplay}>{viz.metrics.savings}% saved</span>
        )}
      </div>

      <div className={styles.pipelineTimeline}>
        <div className={styles.timelineLabel}>Client</div>
        <div className={styles.timelineLabel}>Server</div>

        {cmds.map((cmd) => (
          <div key={cmd.id} className={styles.timelineRow}>
            <div className={`${styles.tlCmd} ${cmd.sent ? styles.tlCmdSent : ''}`}>
              {cmd.sent ? cmd.cmd : '...'}
            </div>
            <div className={`${styles.tlRtt} ${cmd.waitingRTT ? styles.tlRttWaiting : ''} ${cmd.received ? styles.tlRttDone : ''}`}>
              {cmd.waitingRTT ? '←→ RTT' : cmd.received ? '✓' : '—'}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.pipelineComparison}>
        <div className={styles.compItem}>
          <span className={styles.compLabel}>Sequential</span>
          <div className={styles.compBar}>
            <div className={styles.compFill} style={{ width: '100%', background: 'var(--node-comparing)' }} />
          </div>
          <span className={styles.compVal}>500ms</span>
        </div>
        <div className={styles.compItem}>
          <span className={styles.compLabel}>Pipeline</span>
          <div className={styles.compBar}>
            <div className={styles.compFill} style={{ width: '20%', background: 'var(--pod-running)' }} />
          </div>
          <span className={styles.compVal}>100ms</span>
        </div>
      </div>
    </div>
  );
});
